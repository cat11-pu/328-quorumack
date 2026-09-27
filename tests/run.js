import assert from "node:assert";
import { addAck, waterOf } from "../acks.js";
import { step, close } from "../ackrun.js";
import { render } from "../app.js";

const base = {
  budget: 1, quorum: 2,
  state: { acks: [[1, []]], ready: [], water: 0, ledger: [], applied: [] },
  events: [{ id: 1, kind: "ack", write: 1, replica: "a" }],
  write_error_code: "E_NO_WRITE", dup_error_code: "E_DUP_ACK",
  event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("addAck returns acks", () => {
  assert.ok(Array.isArray(addAck([[1, []]], 1, "a")));
});

check("waterOf returns a number", () => {
  assert.strictEqual(typeof waterOf([[1, ["a", "b"]]], 2), "number");
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
