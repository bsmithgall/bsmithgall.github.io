---
layout: post
title: Building a chess application with Phoenix LiveView (Part 1)
excerpt: Getting started by implementing (most) of the rules of chess.
---

Recently I have been doing some more
[explorations](../_posts/2023-09-10-phoenix-hamburger-menu.md) of
[Elixir][elixir] and [Phoenix][phoenix]. After watching this [great video] about
hand-implementing a chess engine, I got inspired to try and write my own
implementations for the rules of chess and my own Chessboard layout for the web
with [Phoenix LiveView][liveview].  I want to note that I'm not a great chess
programmer or Elixir expert at this point. For expert takes on things, you might
try the [Chess programming wiki](https://www.chessprogramming.org/Main_Page), or
the [Elixir forums](https://elixirforum.com/). I wanted to share my progress
with that here in an occasionally recurring series as I add more bits and pieces
to this implementation, such as writing my own (comparatively weak) engine, or
adding live play functionality. But before we get to any of that interesting
stuff, we first need to get a mostly working model for the rules of chess. There
are a few existing libraries (most notably [`chex`][chex]), but I still wanted
to roll my own for easier integration with LiveView. You can play around with
the progress of this [here](https://elswisser.casita.zone/live-board).

# 1. Representing the game

The first need we need is a game state, and we can reach naturally for the
Elixir [`struct`][struct] to encode our information. The `Game` struct needs to
keep track of a number of things that represent the game state which we will get
to, but the most important is the current board state.

One notable thing about Elixir is that its `List` implementations are in fact
linked lists, as opposed to arrays. This means that random access is effectively
`O(n)` as opposed to `O(1)` that you might find in other languages. There are
some good reasons for this in the language, but it does mean that some standard
things about board state (like representing the board as a 64-length array) is
not really optimal for our case.

Instead, I opted to use an elixir `Map` of the form {% raw %}`%{{number(),
number()} => Square.t()}`.{% endraw %} This means that each key is the location
of each square, represented as a tuple of `file, rank`, and each value is
represented as a `Square` struct.

## The `Square` struct

Each `Square` contains not only the piece sitting on it (or `nil`) but also
another struct called `Sees`, which contains all the other squares that can be
"seen" from this square, keyed by the direction (along with knight moves and 
combination of all of them):

```elixir
defmodule Elswisser.Square.Sees do
  defstruct up: [],
            down: [],
            left: [],
            right: [],
            up_right: [],
            up_left: [],
            down_left: [],
            down_right: [],
            knight: [],
            all: MapSet.new()
end

defmodule Elchesser.Square do
  alias Elchesser.Square.Sees

  defstruct file: nil,
            rank: nil,
            loc: {},
            piece: nil,
            sees: %Sees{}
end
```

Additionally, I implemented the [Inspect][inspect] protocol for the square for
debugging purposes to draw the square on the board along with all the squares
that it sees. Using unicode pipe characters allows us to draw a nice
representation of each square in the terminal. For example:

```
e4 - ' '
  ┌───┬───┬───┬───┬───┬───┬───┬───┐
8 │ ✕ │   │   │   │ ✕ │   │   │   │
  ├───┼───┼───┼───┼───┼───┼───┼───┤
7 │   │ ✕ │   │   │ ✕ │   │   │ ✕ │
  ├───┼───┼───┼───┼───┼───┼───┼───┤
6 │   │   │ ✕ │ ✕ │ ✕ │ ✕ │ ✕ │   │
  ├───┼───┼───┼───┼───┼───┼───┼───┤
5 │   │   │ ✕ │ ✕ │ ✕ │ ✕ │ ✕ │   │
  ├───┼───┼───┼───┼───┼───┼───┼───┤
4 │ ✕ │ ✕ │ ✕ │ ✕ │ ◯ │ ✕ │ ✕ │ ✕ │
  ├───┼───┼───┼───┼───┼───┼───┼───┤
3 │   │   │ ✕ │ ✕ │ ✕ │ ✕ │ ✕ │   │
  ├───┼───┼───┼───┼───┼───┼───┼───┤
2 │   │   │ ✕ │ ✕ │ ✕ │ ✕ │ ✕ │   │
  ├───┼───┼───┼───┼───┼───┼───┼───┤
1 │   │ ✕ │   │   │ ✕ │   │   │ ✕ │
  └───┴───┴───┴───┴───┴───┴───┴───┘
    a   b   c   d   e   f   g   h
```

## The `Move` struct

Along with `Square`, another key component is the `Move`. This struct contains
relevant information needed for computing and encoding an individual chess move.
Most importantly, it contains `from` and `to` board locations, the `piece` being
moved, and additional information to be figured out later (like castling,
promotions, etc.):

```elixir
defmodule Elchesser.Move do
  defstruct from: {},
            to: {},
            piece: nil,
            capture: nil,
            promotion: nil,
            castle: false,
            checking: nil
end
```

# 2. Representing pieces

Now that we have the outlines our game board, move, and square structs, we can
get started with actually implementing pieces.  For each piece, we need a way to
get all of squares that the given piece can move to based on where it is right
now.  There are really four different types of pieces to consider. Rooks,
bishops, and queens can be implemented the same way. Knights are similar to
those but have different move patterns. Then there are pawns and kings.

First, we can outline a `@behaviour` that each piece will follow:

```elixir
defmodule Elchesser.Piece do
  alias Elchesser.{Square, Game, Move}

  @doc """
  Generates psuedo-legal moves for a given piece type.
  """
  @callback moves(Square.t(), Game.t()) :: [Move.t()]
  @callback attacks(Square.t(), Game.t()) :: [Move.t()]
end

```

## Rooks, bishops, queens

All three of these pieces move in effectively the same way: they slide along
whatever directions they are allowed to move until they bump into the edge of
the board, an opposing piece, or a friendly piece. For this, we can take
advantage of the relevant pre-computed `sees` fields:

```elixir
  @spec move_range(%Square{}, %Game{}, Square.Sees.t()) :: [Move.t()]
  def move_range(%Square{} = square, %Game{} = game, direction) do
    get_in(square.sees, [Access.key!(direction)])
    |> Enum.reduce_while([], fn {file, rank}, acc ->
      s = Game.get_square(game, {file, rank})

      case friendly?(square.piece, s.piece) do
        true -> {:halt, acc}
        false -> {:halt, [Move.from(square, {s.file, s.rank}, capture: true) | acc]}
        nil -> {:cont, [Move.from(square, {s.file, s.rank}) | acc]}
      end
    end)
    |> Enum.reverse()
  end
```

From here, implemeting each of the sliding pieces becomes fairly
straightforward. For example, with a bishop:

```elixir
defmodule Elchesser.Piece.Bishop do
  alias Elchesser.{Square, Game, Piece}

  @behaviour Piece

  @impl true
  def moves(%Square{} = square, %Game{} = game) do
    for d <- [:up_right, :up_left, :down_left, :down_right], reduce: [] do
      acc -> [Square.move_range(square, game, d) | acc]
    end
    |> List.flatten()
  end

  @impl true
  def attacks(square, game), do: moves(square, game)
end
```

Rooks and queens follow the some logic with different directions. Because these
pieces also attack all the squares they can move to, attacks and moves are the same.

## Knights

Knights are similar to sliding pieces, but they can "jump" over pieces as well.
So instead of scanning along a direction, we check all of the `knight` sees
squares from our struct, and use that to generate moves and attacks:

```elixir
defmodule Elchesser.Piece.Knight do
  alias Elchesser.{Square, Game, Piece, Move}

  @behaviour Piece

  @impl true
  def moves(%Square{} = square, %Game{} = game) do
    Enum.reduce(square.sees.knight, [], fn {file, rank}, acc ->
      s = Map.get(game.board, {file, rank})

      case Piece.friendly?(square.piece, s.piece) do
        true -> acc
        false -> [Move.from(square, {s.file, s.rank}, capture: true) | acc]
        nil -> [Move.from(square, {s.file, s.rank}) | acc]
      end
    end)
  end

  @impl true
  def attacks(square, game), do: moves(square, game)
end
```

## Pawns

Pawns are more difficult than the pieces that have been implemented so far for a
few reasons:

1. They can move two squares from their starting position and one square
   otherwise.
2. They attack diagonally instead of straight ahead.
3. They have to respect the rules of [en passant][en-passant].
4. They can promote to another piece if they reach the back rank.

Elixir's function head pattern matching makes this easier to handle. We can
start by generating the squares that the pawns attack (we use the `:P` atom to
represent white pawns and `:p` to represent black pawns to be consistent with
[FEN notation][fen]):

```elixir
defmodule Elchesser.Piece.Pawn do
  alias Elchesser.{Square, Game, Move, Piece}

  @behaviour Piece
  def moves(_, _), do: []

  @impl true
  def attacks(%Square{} = square, _), do: attacks(square) |> Enum.map(&Move.from(square, &1))

  defp attacks(%Square{piece: :P, rank: rank, file: file}) do
    [{file + 1, rank + 1}, {file - 1, rank + 1}]
    |> Enum.filter(&Square.valid?/1)
  end

  defp attacks(%Square{piece: :p, file: file, rank: rank}) do
    [{file + 1, rank - 1}, {file - 1, rank - 1}]
    |> Enum.filter(&Square.valid?/1)
  end
end
```

Now, we need to make moves. Depending on where the pawn is on the board, we can
use a number of candidate moves and then whittle them down based on various
conditions. We can use pattern matching once again to generate candidate moves,
along with a flag for whether or not the pawn should be promoted:

```elixir
defmodule Elchesser.Piece.Pawn do
  # ... 
  @impl true
  def moves(%Square{piece: :P, rank: 2, file: file} = square, %Game{} = game),
    do: moves(square, game, [{file, 3}, {file, 4}], false)

  def moves(%Square{piece: :P, rank: rank, file: file} = square, %Game{} = game),
    do: moves(square, game, [{file, rank + 1}], rank + 1 == 8)

  def moves(%Square{piece: :p, rank: 7, file: file} = square, %Game{} = game),
    do: moves(square, game, [{file, 6}, {file, 5}], false)

  def moves(%Square{piece: :p, rank: rank, file: file} = square, %Game{} = game),
    do: moves(square, game, [{file, rank - 1}], rank - 1 == 1)
  # ... 
end
```

Then, once we have the candidate moves, we can whittle them down based on the
rules described above:

```elixir
defmodule Elchesser.Piece.Pawn do
  # ...
  defp moves(square, game, candidates, promotion) do
    m =
      candidates
      # moves are only valid if the candidate square is empty
      |> Enum.filter(fn candidate -> Game.get_square(game, candidate) |> Square.empty?() end)
      |> Enum.map(fn {file, rank} ->
        Move.from(square, {file, rank}, promotion: promote(promotion, square.piece))
      end)

    a =
      attacks(square)
      # attacks are only valid if the candidate square is occupied by an enemy
      # piece or the current en passant square of the given game state
      |> Enum.filter(fn s ->
        sq = Game.get_square(game, s)
        Piece.enemy?(square.piece, sq.piece) || en_passant?(sq, game)
      end)
      |> Enum.map(fn s ->
        sq = Game.get_square(game, s)
        ep? = en_passant?(sq, game)

        capture =
          cond do
            ep? and square.piece == :P -> :p
            ep? and square.piece == :p -> :P
            true -> sq.piece
          end

        Move.from(square, s, capture: capture, promotion: promote(promotion, square.piece))
      end)

    Enum.concat(m, a)
  end
  # ...

  defp en_passant?(%Square{} = square, %Game{} = game) do
    Square.empty?(square) && Square.eq?(square, game.en_passant)
  end
end
```

This does rely on the en passant information stored in the game state. That will
be discussed in much more detail in part three when we update the game state
after making moves.

### Kings

Kings are even more complex than pawns:

1. Kings can possibly castle either kingside or queenside depending on the state
   of the game.
2. Kings cannot move into check.

Both of these rely on game state, which again will be discussed a bit later. To
start, we can generate a list of all possible squares that the king can attack.
kings can move one square in any direction, so an Elixir for comprehension is a
good fit for candidate move generation. From there, we can apply similar logic
to our previous piece moves to check for friendly pieices, captures, etc:

```elixir
defmodule Elchesser.Piece.King do
  # ...
  def attacks(%Square{file: file, rank: rank}) do
    for(f <- -1..1, r <- -1..1, not (f == 0 and r == 0), do: {file + f, rank + r})
    |> Enum.filter(&Square.valid?/1)
    |> Enum.reduce([], fn {file, rank}, acc ->
      s = Map.get(game.board, {file, rank})

      case Piece.friendly?(square.piece, s.piece) do
        true -> acc
        false -> [Move.from(square, {s.file, s.rank}, capture: true) | acc]
        nil -> [Move.from(square, {s.file, s.rank}) | acc]
      end
    end)
  end
  # ...
end 
```

From there, we need to add kingside and queenside castling (in the event that
castling is legal from the given position), and then remove any moves that might
put the king in check.

First, castling. There are three conditions that have to be met in order for the
king to be able to castle in a given direction:

1. It must be legal according the game state (i.e. the king or relevant rook
   must not have moved)
2. All squares between the king and relevant rook must be empty
3. No squares between the king and relevant rook can be attacked by an enemy
   piece (the king cannot move through or into check)

In order to do this, we'll need to have a way to check if a given square is
being attacked. To do this, we can figure out where all the pieces are for a
given color, and then figure out which squares those pieces attack.

First, let's figure out where all the pieces for a given color are located:

```elixir
defmodule Elchesser.Board do
  def white_occupied(%Game{board: board}) do
    Map.filter(board, fn {_, square} -> Square.white?(square) end)
    |> Map.values()
  end

  def black_occupied(%Game{board: board}) do
    Map.filter(board, fn {_, square} -> Square.black?(square) end)
    |> Map.values()
  end
end
```

Then, let's get all the unique locations attacked by those pieces:

```elixir
defmodule Elchesser.Board do
  def white_attacks(%Game{} = game) do
    white_occupied(game)
    |> Enum.map(&Square.attacks(&1, game))
    |> List.flatten()
    |> Enum.uniq()
    |> Enum.map(& &1.to)
  end

  def black_attacks(%Game{} = game) do
    black_occupied(game)
    |> Enum.map(&Square.attacks(&1, game))
    |> List.flatten()
    |> Enum.uniq()
    |> Enum.map(& &1.to)
  end
end
```

Then, using this information, we can evaluate the legality of all of our
castling rules. This snippet is for castling kingside for the white king, but
can be extended to go queenside, and for the black king:

```elixir
defmodule Elchesser.Piece.King do
  # ...
  # handle the case where castling is illegal by the game rules
  defp maybe_castle_kingside(%Square{piece: piece}, %Game{castling: c}, _)
       when not is_map_key(c.map, piece),
       do: []

  # check that castling is legal for the given position
  defp maybe_castle_kingside(%Square{piece: :K} = square, %Game{} = game, attacks) do
    through_squares = [{?f, 1}, {?g, 1}] |> Enum.map(&Game.get_square(game, &1))

    if can_castle?(through_squares, attacks),
      do: [Move.from(square, {?g, 1}, castle: true)],
      else: []
  end
  # ...
  
  # Going kingside has the same through and attacked squares, but when castling
  # queenside, the b-file can be attacked, so we have the two function heads.
  defp can_castle?(through_squares, attacks),
    do: can_castle?(through_squares, through_squares, attacks)

  defp can_castle?(empty_through, attack_through, attacks) do
    empty? = Enum.all?(empty_through, &Square.empty?/1)

    attacked? =
      attacks |> Enum.map(&Square.from/1) |> Enum.any?(&(&1 in attack_through))

    empty? and not attacked?
  end
end
```

Now we can put all this together:

```elixir
defmodule Elchesser.Piece.King do
  # ...
  # Note this is the private method shared between the black and white kings.
  # The difference would be which set of attacks are fed into the function
  defp moves(%Square{} = square, %Game{} = game, %MapSet{} = attacks) do
    # starting with all the attacked squares
    attacks(square, game) 
    # add kingside castling if it's legal
    |> Enum.concat(maybe_castle_kingside(square, game, attacks)) 
    # add queenside castling if it's legal
    |> Enum.concat(maybe_castle_queenside(square, game, attacks))
    # filter out all moves where the given square is attacked by an enemy piece
    |> Enum.reject(&MapSet.member?(attacks, &1.to))
  end
  # ...
end 
```

# 3. Making moves

Finally, we have a working implementations of all the pieces. We need to be able
to make moves on the board and have them update our game's internal state. The
internal state has to keep track of a lot of different things. The main ones
come from [FEN][fen] notation: board state, active color, castling rights, en
passant, and the halfmove and fullmove clocks. Since Elixir is an immutable
language, making a move will return a new game struct with all the fields
updated.

## Validating moves

The first part of making a move is ensuring that the proposed move is valid. A
move cannot originate from an empty square, and players cannot move out of
order. Pieces must respect the general rules of the game. We can re-use some of
our previously implemented code to make all of this happen.
`Square.legal_locs/2` is the same as `Square.legal_moves/2` implemented in the
above section with kings, just with the move mapped to the `.to` fields in the
move struct. 

In order to write these validators, I took advantage of Elixir's beautiful
[`with/1`][with-1] method. Each validator flows down and returns either a
boolean, or an error atom. This gets fed into a little convenience `or_/1`
method which returns either `:ok`, or `{:error, reason}`.  This allows for a
nice little block of readable validations:

```elixir
defmodule Elchesser.Game
  # ...
  defp ensure_valid_move(%Game{} = game, %Move{} = move) do
    with from <- Game.get_square(game, move.from),
         to <- Game.get_square(game, move.to),
         :ok <- not Square.empty?(from) |> or_(:empty_square),
         :ok <- (game.active == Board.color_at(game, from)) |> or_(:invalid_from_color),
         :ok <- (game.active != Board.color_at(game, to)) |> or_(:invalid_to_color),
         :ok <- (move.to in Square.legal_locs(from, game)) |> or_(:invalid_move) do
      :ok
    end
  end
  # ...
  @spec or_(boolean(), atom()) :: :ok | {:error, atom()}
  defp or_(true, _), do: :ok
  defp or_(false, reason), do: {:error, reason}
  # ...
end
```

As an aside, this is the kind of thing that really makes Elixir a joy to work
with compared to other languages. 

## Making moves in the board

Now that we have ensured that our moves our valid, we can update our board
state. Making a move has a few possible steps:

1. The origin piece has to be picked up
2. The piece has to be moved to its destination, optionally castling
3. If the move is a castle, we have to make sure the king and the rook are
   moved.
4. If the move is a promotion, the pawn needs to be replaced with the promotion
   piece.

Note that this is a _pseudo-legal_ move; we are relying on our move validator in
step one above to make sure that the move is legal before making it to this step. `with/1` makes this a snap as well:

```elixir
defmodule Elchesser.Board do
  # ...
  @spec move(Elchesser.Game.t(), Elchesser.Move.t()) ::
          {:ok, {Move.t(), Game.t()}} | {:error, atom()}
  def move(%Game{} = game, %Move{} = move) do
    with {:ok, {piece, game}} <- move_from(game, move.from),
         {:ok, {capture, game}} <- move_to(game, move.to, piece),
         {:ok, game} <- castle(game, move),
         {:ok, game} <- promote(game, move) do
      check = Game.Check.opponent_in_check?(game)

      move = %{
        move
        | checking: if(check == true, do: :check, else: nil),
          capture: capture,
          piece: piece
      }

      move = %{move | san: Move.san(move)}

      {:ok, {move, game}}
    end
  end
  # ...
end
```

### Moving pieces with `move_from/2` and `move_to/3`

When doing the actual moves themselves, we can take advantage of the nice
[`Map.get_and_update/3`][get-and-update]. `move_from/2` updates the board at the
given square and ensures that a piece is present there, failing with
the `:empty_square` atom if not. 

{% raw %}
```elixir
def move_from(%Game{board: board} = game, loc) do
  case Map.get_and_update(board, loc, fn current ->
          {current, %Square{current | piece: nil}}
        end) do
    {%Square{piece: nil}, _} -> {:error, :empty_square}
    {%Square{piece: p}, board} -> {:ok, {p, %Game{game | board: board}}}
  end
end
```
{% endraw %}

`move_to/3` does basically the same thing in reverse, just making sure that we
aren't putting our piece on a square that's already occupied by a friendly piece.


{% raw %}
```elixir
def move_to(%Game{board: board} = game, loc, piece) do
  {%Square{piece: capture}, board} =
    Map.get_and_update(board, loc, fn current ->
      {current, %Square{current | piece: piece}}
    end)

  cond do
    Piece.friendly?(piece, capture) -> {:error, :invalid_to_color}
    true -> {:ok, {capture, %Game{game | board: board}}}
  end
end
```
{% endraw %}

### Castling

For castling, we can enumerate all possible cases (there are only four):

{% raw %}
```elixir
def castle(game, %Move{castle: false}), do: {:ok, game}

def castle(%Game{} = game, %Move{to: to}) do
  move =
    case to do
      {?g, 1} -> Move.from({?h, 1, :R}, {?f, 1})
      {?g, 8} -> Move.from({?h, 8, :r}, {?f, 8})
      {?c, 1} -> Move.from({?a, 1, :R}, {?d, 1})
      {?c, 8} -> Move.from({?a, 8, :r}, {?d, 8})
    end

  with {:ok, {_, game}} <- move(game, move) do
    {:ok, game}
  end
end
```
{% endraw %}

### Promotion

Promotion works very similarly to `move_to/3`. We use `Map.get_and_update/3` to
update the pawn in place:

```elixir
def promote(game, %Move{promotion: nil}), do: {:ok, game}

def promote(%Game{board: board} = game, %Move{to: to, promotion: promotion}) do
  with {_, board} <-
          Map.get_and_update(board, to, fn current ->
            {current, %Square{current | piece: promotion}}
          end) do
    {:ok, %Game{game | board: board}}
  end
end
```

## Updating game state

Now that we have valid moves and a way to update our board state, we can finally
update the game state:

```elixir
defmodule Elchesser.Game do
  # ...
  def move(%Game{} = game, %Move{} = move) do
    with :ok <- ensure_valid_move(game, move),
         {:ok, {move, game}} <- Board.move(game, move) do
      game =
        game
        |> flip_color()
        |> set_in_check()
        |> add_move(move)
        |> add_fen()
        |> add_capture(move.capture)
        |> set_castling_rights(move)
        |> set_en_passant(move)
        |> set_half_move_count(move)
        |> set_full_move_count()

      {:ok, game}
    end
  # ...
end
```

There isn't a ton of very interesting stuff here, just a lot of housekeeping.
But, now with this, we should _finally_ have a way of playing a game of chess in
our program:

```elixir
game = Game.new()

{:ok, game} = Game.move(game, Move.from({?e, 2, :P}, {?e, 4}))
{:ok, game} = Game.move(game, Move.from({?e, 7, :p}, {?e, 5}))
{:ok, game} = Game.move(game, Move.from({?d, 2, :P}, {?d, 4}))
{:ok, game} = Game.move(game, Move.from({?e, 5, :p}, {?d, 4}))
```

Now that we have this, we can get to the interesting part: hooking it into
a Phoenix LiveView.



[elixir]: https://elixir-lang.org/
[phoenix]: https://www.phoenixframework.org/
[great video]: https://www.youtube.com/watch?v=U4ogK0MIzqk
[liveview]: https://hexdocs.pm/phoenix_live_view/Phoenix.LiveView.html
[struct]: https://hexdocs.pm/elixir/structs.html
[chex]: https://hexdocs.pm/chex/api-reference.html
[inspect]: https://hexdocs.pm/elixir/1.16.3/Inspect.html
[en-passant]: https://en.wikipedia.org/wiki/En_passant
[fen]: https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation
[with-1]: https://hexdocs.pm/elixir/Kernel.SpecialForms.html#with/1
[get-and-update]: https://hexdocs.pm/elixir/Map.html#get_and_update/3