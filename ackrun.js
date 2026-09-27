// ackrun.js：按处理预算处理并留账
import { addAck, waterOf } from "./acks.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function cloneState(state) {
  return {
    acks: state.acks.map(function (row) { return [row[0], row[1].slice()]; }),
    ready: state.ready.slice(),
    water: state.water,
    ledger: state.ledger.map(function (entry) { return entry.slice(); }),
    applied: state.applied.slice()
  };
}

function validEvent(event) {
  return !!event && typeof event === "object"
    && event.kind === "ack"
    && typeof event.write === "number"
    && typeof event.replica === "string";
}

function ackKey(kind, write, replica) {
  return kind + ":" + write + ":" + replica;
}

function applyAck(state, spec, write, replica) {
  const row = state.acks.find(function (r) { return r[0] === write; });
  if (!row) fail(spec.write_error_code || "E_NO_WRITE", "write not in tally: " + write);
  if (row[1].indexOf(replica) !== -1) {
    fail(spec.dup_error_code || "E_DUP_ACK", "replica " + replica + " already acked write " + write);
  }
  addAck(state.acks, write, replica);
  if (row[1].length >= spec.quorum && state.ready.indexOf(write) === -1) {
    state.ready.push(write);
  }
  state.water = waterOf(state.acks, spec.quorum);
}

export function step(spec) {
  const state = cloneState(spec.state);
  const events = spec.events || [];
  let budget = spec.budget;
  let served = 0;
  for (const event of events) {
    if (!validEvent(event)) {
      fail(spec.event_error_code || "E_BAD_EVENT", "bad event: " + JSON.stringify(event));
    }
    if (budget > 0) {
      if (state.applied.indexOf(ackKey(event.kind, event.write, event.replica)) !== -1) continue;
      applyAck(state, spec, event.write, event.replica);
      state.applied.push(ackKey(event.kind, event.write, event.replica));
      budget -= 1;
      served += 1;
    } else {
      state.ledger.push([event.kind, event.write, event.replica]);
    }
  }
  return {
    state: state,
    served: served,
    ledger_before: state.ledger.length,
    ledger: state.ledger,
    judged: served,
    judged_bound: events.length
  };
}

export function close(spec) {
  const state = cloneState(spec.state);
  const pending = state.ledger;
  state.ledger = [];
  let catchup = 0;
  for (const entry of pending) {
    applyAck(state, spec, entry[1], entry[2]);
    state.applied.push(ackKey(entry[0], entry[1], entry[2]));
    catchup += 1;
  }
  return { state: state, catchup: catchup };
}
