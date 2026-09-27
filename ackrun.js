// ackrun.js：按处理预算处理并留账
import { addAck, waterOf } from "./acks.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function cloneState(state) {
  return {
    acks: state.acks.map(function (row) { return [row[0], row[1].slice()]; }),
    ready: state.ready.slice(),
    water: state.water,
    ledger: state.ledger.map(function (row) { return row.slice(); }),
    applied: state.applied.slice()
  };
}

function applyAck(state, quorum, write, replica, noWrite, dupAck) {
  const row = state.acks.find(function (entry) { return entry[0] === write; });
  if (!row) throw fail(noWrite, "write not in tally: " + write);
  if (row[1].indexOf(replica) !== -1) throw fail(dupAck, "replica already acked: " + replica);
  row[1].push(replica);
  if (row[1].length >= quorum && state.ready.indexOf(write) === -1) state.ready.push(write);
  state.water = waterOf(state.acks, quorum);
}

export function step(spec) {
  const events = spec.events || [];
  const quorum = spec.quorum;
  const noWrite = spec.write_error_code || "E_NO_WRITE";
  const dupAck = spec.dup_error_code || "E_DUP_ACK";
  const badEvent = spec.event_error_code || "E_BAD_EVENT";

  events.forEach(function (event) {
    const ok = event && typeof event === "object" && event.kind === "ack"
      && event.write !== null && event.write !== undefined
      && event.replica !== null && event.replica !== undefined;
    if (!ok) throw fail(badEvent, "bad event: " + JSON.stringify(event));
  });

  const state = cloneState(spec.state);
  let remaining = spec.budget || 0;
  let served = 0;
  let parked = 0;
  events.forEach(function (event) {
    if (state.applied.indexOf(event.id) !== -1) return;
    if (remaining <= 0) {
      state.ledger.push([event.kind, event.write, event.replica]);
      state.applied.push(event.id);
      parked += 1;
      return;
    }
    applyAck(state, quorum, event.write, event.replica, noWrite, dupAck);
    state.applied.push(event.id);
    remaining -= 1;
    served += 1;
  });
  return {
    state: state,
    served: served,
    ledger_before: state.ledger.length,
    ledger: state.ledger.map(function (row) { return row.slice(); }),
    judged: served + parked,
    judged_bound: events.length
  };
}

export function close(spec) {
  const quorum = spec.quorum;
  const noWrite = spec.write_error_code || "E_NO_WRITE";
  const dupAck = spec.dup_error_code || "E_DUP_ACK";
  const state = cloneState(spec.state);
  let catchup = 0;
  state.ledger.forEach(function (entry) {
    applyAck(state, quorum, entry[1], entry[2], noWrite, dupAck);
    catchup += 1;
  });
  state.ledger = [];
  return { state: state, catchup: catchup };
}
