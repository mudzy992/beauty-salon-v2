import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import { attachSocketRecovery } from "./socket-recovery.mjs";

class FakeSocket extends EventEmitter {
  connected = false;
  connectCalls = 0;
  disconnectCalls = 0;

  connect() {
    this.connectCalls += 1;
    return this;
  }

  disconnect() {
    this.disconnectCalls += 1;
    this.connected = false;
    this.emit("disconnect", "io client disconnect");
    return this;
  }

  disconnectFromServer(reason = "io server disconnect") {
    this.connected = false;
    this.emit("disconnect", reason);
  }

  markConnected() {
    this.connected = true;
    this.emit("connect");
  }

  failConnection(message) {
    this.emit("connect_error", new Error(message));
  }
}

function createTimers() {
  const tasks = [];

  return {
    pendingDelays() {
      return tasks
        .filter((task) => !task.cancelled && !task.ran)
        .map((task) => task.delayMs);
    },
    setTimeoutFn(callback, delayMs) {
      const task = { callback, delayMs, cancelled: false, ran: false };
      tasks.push(task);
      return task;
    },
    clearTimeoutFn(task) {
      task.cancelled = true;
    },
    runNext() {
      const task = tasks.find(
        (candidate) => !candidate.cancelled && !candidate.ran,
      );
      assert.ok(task, "expected a pending retry timer");
      task.ran = true;
      task.callback();
    },
  };
}

function attachWithFakeTimers(socket, timers) {
  return attachSocketRecovery(socket, {
    setTimeoutFn: timers.setTimeoutFn,
    clearTimeoutFn: timers.clearTimeoutFn,
  });
}

test("retries a server-initiated disconnect after the initial backoff", (t) => {
  const socket = new FakeSocket();
  const timers = createTimers();
  const recovery = attachWithFakeTimers(socket, timers);
  t.after(() => recovery.dispose());

  socket.connected = true;
  socket.disconnectFromServer();

  assert.deepEqual(timers.pendingDelays(), [1_000]);
  timers.runNext();
  assert.equal(socket.connectCalls, 1);
  assert.deepEqual(timers.pendingDelays(), []);
});

test("backs off for transient Redis-adapter and transport connection errors", (t) => {
  const socket = new FakeSocket();
  const timers = createTimers();
  const recovery = attachWithFakeTimers(socket, timers);
  t.after(() => recovery.dispose());

  socket.failConnection("Socket.IO shared adapter unavailable.");
  assert.deepEqual(timers.pendingDelays(), [1_000]);
  timers.runNext();
  assert.equal(socket.connectCalls, 1);

  socket.failConnection("websocket error");
  assert.deepEqual(timers.pendingDelays(), [2_000]);
  timers.runNext();
  assert.equal(socket.connectCalls, 2);

  socket.failConnection("transport close");
  assert.deepEqual(timers.pendingDelays(), [4_000]);
  timers.runNext();

  socket.failConnection("transport close");
  assert.deepEqual(timers.pendingDelays(), [5_000]);
  timers.runNext();

  socket.failConnection("transport close");
  assert.deepEqual(timers.pendingDelays(), [5_000]);
});

test("stops retries and disconnects on Unauthorized", (t) => {
  const socket = new FakeSocket();
  const timers = createTimers();
  const recovery = attachWithFakeTimers(socket, timers);
  t.after(() => recovery.dispose());

  socket.failConnection("Socket.IO shared adapter unavailable.");
  timers.runNext();
  assert.equal(socket.connectCalls, 1);

  socket.failConnection("Unauthorized");

  assert.equal(socket.disconnectCalls, 1);
  assert.deepEqual(timers.pendingDelays(), []);
});

test("a successful connection resets the backoff and clears a pending retry", (t) => {
  const socket = new FakeSocket();
  const timers = createTimers();
  const recovery = attachWithFakeTimers(socket, timers);
  t.after(() => recovery.dispose());

  socket.failConnection("websocket error");
  timers.runNext();
  socket.failConnection("websocket error");
  assert.deepEqual(timers.pendingDelays(), [2_000]);

  socket.markConnected();
  assert.deepEqual(timers.pendingDelays(), []);

  socket.disconnectFromServer();
  assert.deepEqual(timers.pendingDelays(), [1_000]);
});

test("manual auth refresh cancels a pending retry and resets the delay", (t) => {
  const socket = new FakeSocket();
  const timers = createTimers();
  const recovery = attachWithFakeTimers(socket, timers);
  t.after(() => recovery.dispose());

  socket.failConnection("websocket error");
  assert.deepEqual(timers.pendingDelays(), [1_000]);

  recovery.reset();
  assert.deepEqual(timers.pendingDelays(), []);

  socket.failConnection("websocket error");
  assert.deepEqual(timers.pendingDelays(), [1_000]);
});

test("does not retry a client-requested disconnect and dispose removes listeners", (t) => {
  const socket = new FakeSocket();
  const timers = createTimers();
  const recovery = attachWithFakeTimers(socket, timers);

  socket.emit("disconnect", "io client disconnect");
  assert.deepEqual(timers.pendingDelays(), []);

  recovery.dispose();
  assert.equal(socket.listenerCount("connect"), 0);
  assert.equal(socket.listenerCount("disconnect"), 0);
  assert.equal(socket.listenerCount("connect_error"), 0);
  t.after(() => recovery.dispose());
});
