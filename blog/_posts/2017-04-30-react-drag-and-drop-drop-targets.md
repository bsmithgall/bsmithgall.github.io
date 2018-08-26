---
layout: post
title: Next steps with React Drag and Drop -- Adding a Drop Target
excerpt: |
  Now that we have set React Drag and Drop, we can keep going with
  implementing a drop target to receive our dragged card, put it in the proper
  place, and ensure that everything works as expected

---

Last time we talked about Biblio, we had [wired up React Drag and Drop]({%
post_url /blog/2017-02-25-react-drag-and-drop-getting-started %}) to work correctly a single access.
In this post, we are going to talk about handling drop events to make sure that
the dragged item sticks to the correct place.

### Wiring up a DropTarget

To start, let's think about the existing `DropTarget` on our `Work` object:

```js
const workDropTarget = {
  hover: function(props, monitor, component) {
    const item = monitor.getItem();
    const draggedPosition = item.position;
    const hoverPosition = props.position;

    // find the middle of things
    const hoverBoundingRect = findDOMNode(component).getBoundingClientRect();
    const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
    const clientOffset = monitor.getClientOffset();
    const hoverClientY = clientOffset.y - hoverBoundingRect.top;

    // don't move until we are halfway over the card
    if (draggedPosition < hoverPosition && hoverClientY < hoverMiddleY) return;
    if (draggedPosition > hoverPosition && hoverClientY > hoverMiddleY) return;

    // insert a display placeholder at an appropriate position
    const dragDir = draggedPosition > hoverPosition ? 'up' : 'down';
    props.setPlaceholder(draggedPosition, hoverPosition, dragDir);
  }
}
```

This correctly handles dragging and putting the placeholder in the appropriate
place. We need to augment that to add the appropriate handlers for dropping down
our `Work`:

```js
const workDropTarget = {
  hover: function(props, monitor, component) { ... },
  drop: function(props, monitor) {
    props.setPlaceholder(-1, -1, '')
    const item = monitor.getItem()
    props.moveWork(item.position, props.position, props.shelfNumber)
  }
}
```

We do three things in this drop function:

1. Remove the placeholder entirely. Remember that `setPlaceholder` is a simple
   `setState` operation that injects a `placeholder` div into the appropriate
   place in the array of `Works` in our `Shelf`.
2. Gets the dropped item from the [React Drag and Drop Monitor](https://react-dnd.github.io/react-dnd/docs-drop-target-monitor.html)
3. Calls a new method called `moveWork`. `moveWork` is a standard redux action
   that calls a reducer to update our application state. We'll talk more about
   how this works below

### Updating application state

What is going on when we call `moveWork`? We are dispatching an event which
triggers a reducer to reorganize the ordering of works in our shelf. Here is the
relevant reducer:

```js
const newState = [...state]
const { lastWorkPos, nextWorkPos, shelfNumber } = action.payload;
const shelf = newState.find(function(e) { return e.id === shelfNumber })

shelf.works.splice(nextWorkPos, 0, lastShelf.works.splice(lastWorkPos, 1)[0]);

return newState
```

This gets the shelf from our list of shelves and updates that shelf's works to
reorder them properly.

### What about the placeholder?

One problem that we run into here is that if we drop over the placeholder, then
the action doesn't actually fire. This is because right now we have the
placeholder set up as a straightforward html `div` tag without an attached
`DropTarget`. The way to fix that is to turn the placeholder into a proper
component and wire it up with a DropTarget:

```js
class WorkPlaceholder extends React.Component {
  render() {
    return this.props.connectDropTarget(
      <div className="bb-work bb-work-placeholder" />
    );
  }
}

WorkPlaceholder.propTypes = {
  connectDropTarget: React.PropTypes.func,
  setPlaceholder: React.PropTypes.func,
  moveWork: React.PropTypes.func,
  shelfNumber: React.PropTypes.number,
  position: React.PropTypes.number,
};

const workPlaceholderTarget = {
  drop: function(props, monitor) {
    props.setPlaceholder(-1, -1, '')
    const item = monitor.getItem()
    props.moveWork(item.position, props.position, props.shelfNumber)
  }
};

export default DropTarget(DRAG_WORK, workPlaceholderTarget, function(connect) {
  return {
    connectDropTarget: connect.dropTarget(),
  };
})(WorkPlaceholder);
```

Then, in our `ShelfList` component, we replace the references to the plain
placeholder `div` with references instead to our new `WorkPlaceholder`. This
then allows us to have `DropTarget`s over both the cards themselves and the
placeholders. At this point, we should have a complete working single-axis drag
and drop component completely wired.

### Moving works across lists

At this point, we can now drag and drop cards up and down a single list.
However, we want to be able to drag and drop them across multiple lists.
It turns out that this is a pretty straightforward modification to make. We just
need to keep track of the source and destination `shelfNumber` in addition to
the source and destination position (which is what we are currently doing).

We need to modify the following:

+ our `workDragSource` to include references to both the original shelfNumber
    and the original position
+ our `setPlaceholder` references to be able to contain information about the
    full matrix of positions and shelfNumbers, as opposed to just information
    about the position to drop the placeholder.
+ our `DropTargets`
+ our reducer methods to properly move between lists and reorder things in
    lists. This ends up being the most complicated changes of all of them. I
    ended up with the following to make it work completely:

```jsx
const { lastShelfId, lastWorkPos, nextShelfId, nextWorkPos } = action.payload;
const lastShelf = newState.shelves.find(function(e) { return e.id === lastShelfId; });
const nextShelf = newState.shelves.find(function(e) { return e.id === nextShelfId; });

// no X move: moving a work up/down in an existing shelf
if (lastShelfId === nextShelfId) {
  lastShelf.works.splice(nextWorkPos, 0, lastShelf.works.splice(lastWorkPos, 1)[0]);
} else {
  nextShelf.works.splice(nextWorkPos, 0, lastShelf.works[lastWorkPos]);
  lastShelf.works.splice(lastWorkPos, 1);
}
return newState;
```

With everything completed, we should now be able to move works between shelves:

![Moving around]({{ site.url }}/images/react-dnd/wired-up.gif)

To see the full code, check it out [on Github](https://github.com/bsmithgall/biblio/blob/615f7e59270dc23885967d77541b55fb4e16d6b8/client/src/components/works/work.component.js#L69).

There are still a few things that we need to do to finish out this
functionality:

1. We need to be able to save the position of the moved works after we finish
   the move. Right now, all moves will be reset on page refresh.
2. We need to be able to drag works to shelves that currently don't have any
   works. Right now, `setState` is a limitation for this because it doesn't
   allow cross-shelf communication. We will have to move this into a reducer
   method.
