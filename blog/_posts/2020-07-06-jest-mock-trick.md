---
layout: post
title: Some mocking tricks with jest
excerpt: Now that I'm writing a lot more JS, I end up confusing myself with Jest with some reguarlity. I enjoy using Jest a lot and think it's a great test harness, though. These are some collected tricks.
---

## Mock only one method in a module

Sometimes I find myself only wanting to mock one method in a built-in module
(something like `fs` or `path`), and want the default behavior for everything
else, maybe because a library has some on-import thing it's doing with those
built-ins. I can't use `spyOn` because I want to have direct control over the
mock:

```js
const mockJoin = jest.fn();
function mockPath() {
  const original = require.requireActual("path");
  return { ...original, join: mockJoin };
}

jest.mock("path", () => mockPath());
```

This uses a combination of Jest's hoisting for things that are named
`^mock.+$` and factory import functions (I can't find the explicit examples
in the docs, but I get yelled at by the CLI when things are not named in this
way).

## Mocking axios

This one is pretty straightforward but is something that I come back with some
regularity. There's `moxios`, but I have found it to be sort of slow and usually
pretty serious overkill for what I want to do. Using something a bit simpler
like this has been successful for me:

```ts
import axios from "axios";
jest.mock("axios");

const axiosMock = axios as jest.Mocked<typeof axios>;
axiosMock.request.mockImplementation(() => {
  return Promise.resolve({
    data: "<html></html>",
    headers: { "content-type": "text/html" },
  });
});
```

## Mocks and streams

When working with streams (most specifically something like
`fs.createWriteStream` or `@google-cloud/storage`), it's nice to have a real
stream to use when testing.

### Read streams

Read streams are relatively straightforward to use. For example, a GCS
`File` could be mocked as follows:

```js
const { Readable } = require("stream");

const mockReadStream = jest.fn().mockImplementation(() => {
  const readable = new Readable();
  readable.push("hello");
  readable.push("world");
  readable.push(null);

  return readable;
});

const mockFile = jest.fn().mockImplementation(() => {
  return {
    createReadStream: mockReadStream,
  };
});

module.exports = { mockReadStream };
```

Then in a test, when the stream is consumed the output should be "hello world".

### Write streams

Write streams are a little bit more complex to create and use.

```js
const { Writable } = require("stream");

class WriteMemory extends Writable {
  constructor() {
    super();
    this.buffer = "";
  }

  _write(chunk, _, next) {
    this.buffer += chunk;
    next();
  }

  reset() {
    this.buffer = "";
  }
}

const MockWriteStream = new WriteMemory();

const mockCreateWriteStream = jest.fn().mockImplementation(() => {
  MockWriteStream.reset();
  return MockWriteStream;
});

const mockFile = jest.fn().mockImplementation(() => {
  return {
    createWriteStream: mockCreateWriteStream,
  };
});

module.exports = { MockWriteStream };
```

Then in the tests, after calling functions that stream into the
`createWriteStream`, the contents should be available on
`MockWriteStream.buffer` for assertions.

### Through streams

Here's a test on a class that does line-by-line JSON serialization
(take an object and transform it into the JSON representation of that
object while inserting the correct opening and closing characters):

```js
test("properly outputs JSON", (done) => {
  expect.assertions(1);
  const serializer = new JSONLineSerializer();

  const items = [{ a: 1, b: 2, c: { d: 3 } }];

  let result = "";
  Readable.from(items).pipe(serializer);
  serializer.on("data", (data) => (result += data));
  serializer.on("end", () => {
    expect(JSON.parse(result)).toEqual(items);
    done();
  });
});
```

A few notes about this one: it's conceptually similar to the read stream
example from above, but it uses an explicit callback to understand when the
stream has been consumed (see
[here](https://jestjs.io/docs/en/asynchronous#callbacks) for information
about jest callbacks and
[here](https://nodejs.org/docs/latest-v12.x/api/stream.html#stream_event_end))
for information about stream events.
