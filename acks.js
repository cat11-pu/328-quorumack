// acks.js：计票与水位（基线：一律原样返回）
export function addAck(acks, write, replica) {
  return acks;
}

export function waterOf(acks, quorum) {
  return 0;
}
