const SCALE = 1_000_000n;
export function toMicros(value: string): bigint {
  if (!/^\d{1,12}(?:\.\d{1,6})?$/.test(value)) throw new Error('Decimal inválido');
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * SCALE + BigInt((fraction + '000000').slice(0, 6));
}
export function fromMicros(value: bigint): string {
  const whole = value / SCALE;
  const fraction = (value % SCALE).toString().padStart(6, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}
export function weightedAverage(oldQty: string, oldCost: string, addedQty: string, addedCost: string): string {
  const q1 = toMicros(oldQty), c1 = toMicros(oldCost), q2 = toMicros(addedQty), c2 = toMicros(addedCost);
  const totalQty = q1 + q2;
  if (totalQty <= 0n) throw new Error('La cantidad total debe ser positiva');
  // Exact weighted average rounded half-up to six decimals.
  const numerator = q1 * c1 + q2 * c2;
  return fromMicros((numerator + totalQty / 2n) / totalQty);
}
