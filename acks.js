// acks.js：计票与水位
export function addAck(acks, write, replica) {
  for (const row of acks) {
    if (row[0] === write) {
      if (row[1].indexOf(replica) === -1) row[1].push(replica);
      return acks;
    }
  }
  return acks;
}

export function waterOf(acks, quorum) {
  let water = 0;
  for (const row of acks) {
    if (row[1].length >= quorum) water += 1;
    else break;
  }
  return water;
}
