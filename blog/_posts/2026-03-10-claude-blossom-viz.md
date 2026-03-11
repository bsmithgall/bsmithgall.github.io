---
layout: post
title: Visualizing a generalized maximum-weight-matching graph algorithm
---

I have a small side project I've been tinkering with over the past few years: a chess tournament
management application. It's been nice as a sort of open-ended exploration sandbox for all sorts
of different things, like [learning Phoenix](./2023-09-10-phoenix-hamburger.md), and getting to
[implement the rules of chess](./2024-05-31-live-view-chess-the-rules.md). 

The core of the application involves tournament matchmaking. I've added support for various 
tournament formats over the years, but I started with the most common chess format: [swiss][swiss].
The application for matchmaking in Swiss tournaments can be understood best as a form of a
[maximum-weighted matching][max-weight] problem. The players form a graph (often bipartite, but
not necessarily!), and we use the state of the tournament to determine the weight of the edges 
between them. Internally, the application [assigns weights][weights] based on rules from
the USCF rulebook.

For a very long time, the application used a very-slightly modified version of Joris van Rantwijk's
[implementation][joris]. Elixir makes it pretty easy to shell out calls to other languages and get
the results back, and I just used this. The algorithm itself is quite complicated and I always had
trouble reading and deeply comprehending it. Joris has a [great writeup][algorithm] of how it works. 

I had tried a couple of times to port the algorithm directly from Python to Elixir. I tried by hand
and wasn't able to make much progress. I also tried using LLMs to help with this transformation, but I had never been able to make much headway.

However, with the release of Opus 4.5 and Opus 4.6, I decided to give it another go. I asked Claude
to read and [build a spec][spec] and implementation plan to move things over, and it pretty much
just worked. This was the first time an LLM was able to really tackle this problem in a serious way.

So for this, I wanted to go a bit further into the verification and validation. The algorithm is
very complicated with many moving pieces. I had a lot of trouble deeply understanding it. So I put
together [this visualization][viz] with Claude.

Working with Claude on this was interesting. It can produce visual and written artifacts very
quickly, but the comprehensibility of those artifacts is wildly hit-or-miss. Working from the
original spec documents and the writeup had steered Claude into a spot where the words produced
assumed a pretty deep familiarity with [linear programming][lp] and some algorithm-specific jargon.
Given that the goal was to produce something somewhat comprehensible, this didn't really work out. I
was trying to thread a needle here: existing explanatory resources I had found (like from [wolfram]
or [TUM in munich][tum]) operated at either too high or too low of a level; I wanted something that
was a lot more explicit, but still approachable. For the top-level algorithmic explanation, I had to
throw away basically everything it wrote. After a lot of turns, though, I got something I was pretty
happy with:

![A visualization of the blossom algorithm with matches partially
completed](../images/matching-viz/viz.png)

This visualization is backed by a Phoenix LiveView that uses the actual implementation that runs in
the application with some [additional observability attached][stepper]. This allows for a lot of
control over what data is visualized, including specific details about internals of the algorithm:

![Detailed information an individual node dequeing](../images/matching-viz/stepper.png)

Because it's built directly into the application, one other nice thing is the visualization also
serves as a nice debugging tool: I added some code to deserialize graphs out of the URL state, which
lets me walk through how the pairing works for basically any tournament:

![An in-progress tournament with mock data](../images/matching-viz/tournament.png)

## Clauding

I'm not going to talk too much about the rise of Anthropic's flagship model for generating code as
there is a ton of pre-existing writing about its capabilities. For me, if you can gain this level of
coding capability, the main interesting question is around what do you _do_ with the time that you
have gained? I think that using "agentic LLMs" (something like Claude code) are a bit of a manic
technology: they produce lines that often compile and work very quickly! So what to do about this? I
see basically two paths: spend tokens to make things quickly (aka slop), or spend tokens on deep
verification and learning.

A lot has been written about building novel systems without really having an understanding about how
they work, and whether or not that's actually a good thing. Perhaps you can build [giant towers of
abstraction][gas-town], but that isn't _necessarily_ required from the tools. I think that instead
going in this direction of using the capability for improving what existings or learning more deeply
is much more interesting. Of course, in a personal project it's much easier to take this time; I am
more incentivized to build these sorts of tools for learning and understanding: the process of
building out the visualization did help me more deeply understand the algorithm.

Working at the edge of my own understanding with LLMs is also quite strange; it's easier to pilot
Claude through familiar domains and problems. Looking at its output is helpful but because those
problems have a familiar shape it's more akin to working with a colleague. In this scenario, though,
I knew that the output was correct (one of the original implementation details was building out a
big validation suite that tested tens of thousands of graphs against the reference implementation)
but didn't really know why. The process of building this visual artifact helped me to understand why
in a way that I don't think would have been possible previously.

[swiss]: https://en.wikipedia.org/wiki/Swiss-system_tournament
[max-weight]: https://en.wikipedia.org/wiki/Maximum-weight_matching
[weights]: https://github.com/bsmithgall/elswisser/blob/main/lib/elswisser/pairings/pair_weight.ex
[joris]: https://git.jorisvr.nl/joris/maximum-weight-matching/
[algorithm]: https://git.jorisvr.nl/joris/maximum-weight-matching/src/branch/master/doc/Algorithm.md
[spec]: https://github.com/bsmithgall/elswisser/pull/144/changes/2a1139fdfeae93195f3fdc10c274f86e99e35c7f
[viz]: https://elswisser.casita.zone/matching-viz
[gas-town]: https://steve-yegge.medium.com/welcome-to-gas-town-4f25ee16dd04
[lp]: https://en.wikipedia.org/wiki/Linear_programming
[wolfram]: https://demonstrations.wolfram.com/TheBlossomAlgorithmForMaximumMatching/
[tum]: https://algorithms.discrete.ma.tum.de/graph-algorithms/matchings-blossom-algorithm/index_en.html
[stepper]: https://github.com/bsmithgall/elswisser/blob/main/lib/max_weight_matching/stepper.ex
