const SCALE = 1_000_000n;
export function toMicros(value: string): bigint {
  if (!/^\d{1,12}(?:\.\d{1,6})?$/.test(value)) throw new Error(`Decimal inválido: ${value}`);
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * SCALE + BigInt((fraction + '000000').slice(0, 6));
}
export function fromMicros(value: bigint): string {
  const negative = value < 0n; const abs = negative ? -value : value;
  const fraction = (abs % SCALE).toString().padStart(6, '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${abs / SCALE}${fraction ? `.${fraction}` : ''}`;
}
export function add(...values: string[]): string { return fromMicros(values.reduce((sum, v) => sum + toMicros(v), 0n)); }
export function multiply(a: string, b: string): string { return fromMicros((toMicros(a) * toMicros(b)) / SCALE); }
export function calculateLine(line: { quantity: string; unitPrice: string; discountAmount?: string; taxAmount?: string }) {
  const gross = toMicros(line.quantity) * toMicros(line.unitPrice) / SCALE;
  const discount = toMicros(line.discountAmount ?? '0');
  if (discount > gross) throw new Error('El descuento supera el importe bruto.');
  const taxable = gross - discount;
  const tax = toMicros(line.taxAmount ?? '0');
  return { gross: fromMicros(gross), discount: fromMicros(discount), taxable: fromMicros(taxable), tax: fromMicros(tax), total: fromMicros(taxable + tax) };
}
export function calculateDocument(lines: Array<{ quantity: string; unitPrice: string; discountAmount?: string; taxAmount?: string }>) {
  if (!lines.length) throw new Error('Agrega al menos un producto.');
  const rows = lines.map(calculateLine);
  return { lines: rows, subtotal: add(...rows.map(x => x.gross)), discountTotal: add(...rows.map(x => x.discount)), taxTotal: add(...rows.map(x => x.tax)), total: add(...rows.map(x => x.total)) };
}
export function outstanding(original: string, payments: string[]): string {
  const balance = toMicros(original) - payments.reduce((sum, x) => sum + toMicros(x), 0n);
  if (balance < 0n) throw new Error('Los abonos superan el documento.');
  return fromMicros(balance);
}
