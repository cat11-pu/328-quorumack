// acks.js：计票与水位
export function addAck(acks, write, replica) {
  return acks.map(function (row) {
    if (row[0] !== write) return [row[0], row[1].slice()];
    if (row[1].indexOf(replica) !== -1) return [row[0], row[1].slice()];
    return [row[0], row[1].concat([replica])];
  });
}

export function waterOf(acks, quorum) {
  let water = 0;
  for (const row of acks) {
    if (row[1].length >= quorum) water += 1;
    else break;
  }
  return water;
}
