import type { CustomerInput, QuoteInput, SaleInput, CustomerPaymentInput } from './types';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DECIMAL = /^\d{1,12}(?:\.\d{1,6})?$/;
const positive = (v: string) => DECIMAL.test(v) && Number(v) > 0;
const nonnegative = (v: string) => DECIMAL.test(v) && Number(v) >= 0;
export function validateCustomer(x: CustomerInput): string[] {
 const e: string[]=[]; if (!x.name?.trim()) e.push('El nombre del cliente es obligatorio.');
 if (x.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email)) e.push('El correo no es válido.');
 if (x.creditLimit !== undefined && !nonnegative(x.creditLimit)) e.push('El límite de crédito no es válido.'); return e;
}
function validateLines(lines: QuoteInput['lines']): string[] {
 const e: string[]=[]; if (!lines.length) e.push('El documento debe tener al menos un producto.');
 lines.forEach((l,i)=>{ if(!UUID.test(l.productId)) e.push(`Producto inválido en línea ${i+1}.`); if(!positive(l.quantity)) e.push(`Cantidad inválida en línea ${i+1}.`); if(!nonnegative(l.unitPrice)) e.push(`Precio inválido en línea ${i+1}.`); if(!nonnegative(l.discountAmount ?? '0')) e.push(`Descuento inválido en línea ${i+1}.`); }); return e;
}
export function validateQuote(x: QuoteInput): string[] { const e:string[]=[]; if(!['USD','VES'].includes(x.currency)) e.push('Moneda inválida.'); return [...e,...validateLines(x.lines)]; }
export function validateSale(x: SaleInput): string[] {
 const e:string[]=[]; if(!UUID.test(x.warehouseId)) e.push('Depósito inválido.'); if(x.customerId && !UUID.test(x.customerId)) e.push('Cliente inválido.'); if(!x.idempotencyKey.trim()) e.push('Clave idempotente obligatoria.');
 if(!['USD','VES'].includes(x.currency)) e.push('Moneda inválida.'); if(x.exchangeRate && !positive(x.exchangeRate)) e.push('Tasa inválida.');
 e.push(...validateLines(x.lines)); x.payments.forEach((p,i)=>{if(!positive(p.amount))e.push(`Pago inválido en línea ${i+1}.`);if(!p.method.trim())e.push(`Método de pago obligatorio en línea ${i+1}.`);if(p.exchangeRate&&!positive(p.exchangeRate))e.push(`Tasa de pago inválida en línea ${i+1}.`)}); return e;
}
export function validateCustomerPayment(x: CustomerPaymentInput): string[] {
 const e:string[]=[]; if(!UUID.test(x.receivableId))e.push('Cuenta por cobrar inválida.'); if(!positive(x.amount))e.push('El abono debe ser mayor que cero.'); if(!x.idempotencyKey.trim())e.push('Clave idempotente obligatoria.'); if(!x.method.trim())e.push('Método de pago obligatorio.'); if(!/^\d{4}-\d{2}-\d{2}$/.test(x.paymentDate))e.push('Fecha de pago inválida.'); return e;
}
