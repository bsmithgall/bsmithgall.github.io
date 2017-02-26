---
layout: post
title: Implementing React Drag and Drop -- Getting Started
excerpt: The examples provided by the [React Drag and Drop](https://github.com/gaearon/react-dnd) library are typically about moving things around along a single axis or within a fixed grid. I want to explore going beyond that. This post is about setting up existing components to use a Drag Context.
---

As I referenced in my [last post]({{ page.previous.url }}), I am working on a project I'm calling biblio, which is a way for me to track books that I am in the process of reading, have read, and want to get. There are a lot of other things that do this already, so what I'm looking to do is to have a trello-style interface that lets me move cards that represent books between different states easily. Because I'm also looking to do this with new technology as a learning exercise, I am aiming to build this with [React](https://facebook.github.io/react/) on the frontend.

To get the drag-and-drop card functionality, I am using the popular [React Drag and Drop](http://react-dnd.github.io/react-dnd/) higher-order functions to get everything working. I want to walk through the process for getting everything working.

### Background -- naming and component structure

Our `Biblio` component is comprised of `Shelves`, which act as columns in a grid. Each `Shelf` has a set of `Works`. We want to be able to do the following interactions:

1. Move a work up and down in its existing shelf (moving only along the Y axis)
2. Moving a work laterally across shelves (moving only along the X axis)
3. Moving a work up and down on a different shelf (moving along both the X and Y axes)

In all of these interactions, we will also want to have a "placeholder" that shows where our card is going to go.

We'll also need to somehow send this positional information back to the server so that the server can know when things change, but that will be a post for a different day.

### Thinking about where to plug in drag-and-drop

React DND uses [higher-order functions](https://en.wikipedia.org/wiki/Higher-order_function#JavaScript) to plug directly into existing components. There are only two functions available to us:

+ `DragSource`: As it sounds, the `DragSource` wraps a component and allows you to drag it.
+ `DropTarget`: Similarly, the `DropTarget` is a destination for various `DragSources`.

In our case, the `DragSource` is going to be a Work. As we drag it around, we are going to add placeholders to show where it will go if we drop it. This means that we are going to need to have two targets -- Works themselves, and the placeholders. We could make the full list (or container) a drop target, but this will lead to challenges later with figuring out how to re-order the cards from a Redux action.

### Wiring up a Work as a DragSource

To start, let's take a look at our unwired component:

```js
class Work extends React.Component {
  render() {
    const { id, title, author } = this.props;

    return (
      <div
        id={id}
        className="work"
      >
        <div className="content">
          <h1>{title}</h1>
          <p>{author}</p>
        </div>
      </div>
    );
  }
}

Work.propTypes = {
  id: React.PropTypes.number.isRequired,
  title: React.PropTypes.string.isRequired,
  author: React.PropTypes.string.isRequired,
}

export default Work
```

This is a pretty standard React component. From here, we can attach a `DragSource`:

```js
import React from 'react';
import { DragSource } from 'react-dnd';

class Work extends React.Component {
  render() {
    const { id, title, author } = this.props;

    return connectDragSource(
      <div
        id={id}
        className="work"
      >
        <div className="content">
          <h1>{title}</h1>
          <p>{author}</p>
        </div>
      </div>
    );
  }
}

Work.propTypes = {
  id: React.PropTypes.number.isRequired,
  title: React.PropTypes.string.isRequired,
  author: React.PropTypes.string.isRequired,
}

const workDragSource = {
  beginDrag: function() {
    return {}
  }
}

export default DragSource('DRAG_WORK', workDragSource, function(connect) {
    return {
      connectDragSource: connect.dragSource(),
    };
  }),
)(Work);
```

This is the simplest possible example. This will enable our work to be dragged around on the page:

![Only DragSource implemented]({{ site.url }}/images/react-dnd/drag-only.gif)

### Adding a placeholder

After we pick up the component and start moving it around, we want to show the user where they would be dropping it. To do this, we are going to attach the other of our higher-order functions: a `DropTarget`. Looking at the [signature](https://react-dnd.github.io/react-dnd/docs-drop-target.html) for a `DropTarget`, we will want to use the `hover` method of the spec function.

First, though, we need to modify our `beginDrag` method so that when we are hovering, we will know which element we are dragging:

```js
const workDragSource = {
  beginDrag: function(props) {
    return {
      id: props.id
      position: props.position
    }
  }
}
```

Now, we can get an object of the shape: `{id: workId, position: workPosition}` whenever we call `monitor.getItem()`. Now, let's wire up our drop target source function to fire an event up when we are hovering in the right position. Note that `props` here refers to the properties of the component that we are hovered over:

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

The `setPlaceholder` method is a typical redux event that just sends the positions of the various things and the direction being dragged down to the reducer. That way, in the component that wraps the `Work`, we can iterate through and drop the placeholder in the correct location:

```js
export default class WorkContainer extends React.Component {
  render() {
    const { works, shelfNumber, moveWork } = this.props;
    const { placeholderIndex, currentDragged, dragDir, setPlaceholder } = this.props;

    const worksWithPlaceholder = [];
    works.forEach(function(work, idx) {
      if (placeholderIndex === idx && idx !== currentDragged && dragDir === 'up') {
        worksWithPlaceholder.push(<div key="placeholder" className="placeholder" />);
      }
      worksWithPlaceholder.push(
        <WorkContainer
          id={work.id}
          key={work.id}
          position={idx}
          title={work.title}
          author={work.author}
          moveWork={moveWork}
          shelfNumber={shelfNumber}
          work={work}
          setPlaceholder={setPlaceholder}
        />
      );
      if (placeholderIndex === idx && idx !== currentDragged && dragDir === 'down') {
        worksWithPlaceholder.push(<div key="placeholder" className="placeholder" />);
      }
    });

    return (
      <div className="bb-shelf-list">
        {worksWithPlaceholder}
      </div>
    );
  }
}
```

With that, we should have working placeholders. It will look something like this:

![With DropTarget placeholders working]({{ site.url }}/images/react-dnd/placeholders.gif)

In the next post, we'll talk about adding a drop event, and improving performance.
