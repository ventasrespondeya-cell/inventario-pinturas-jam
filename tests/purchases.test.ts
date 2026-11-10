import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLineTotal, calculatePurchaseTotal, calculateFinalUnitCost, createCostSnapshot } from '../lib/modules/purchases/calculations.ts';

test('calcula total de línea de compra con descuento',()=>{
 assert.equal(calculateLineTotal({productId:'p',quantity:'3',unitCost:'12.50',discountAmount:'2'}),'35.5');
});
test('suma líneas de compra sin flotantes',()=>{
 assert.equal(calculatePurchaseTotal([{productId:'a',quantity:'2',unitCost:'1.10'},{productId:'b',quantity:'1',unitCost:'0.20'}]),'2.4');
});
test('calcula costo unitario neto más gastos atribuibles',()=>{
 assert.equal(calculateFinalUnitCost({unitCost:'10',discountPerUnit:'1',attributableExpensePerUnit:'0.5'}),'9.5');
});
test('congela snapshot USD a VES con tasa indicada',()=>{
 const snap=createCostSnapshot({currency:'USD',originalUnitCost:'10',discountPerUnit:'1',attributableExpensePerUnit:'0.5',exchangeRate:'40',exchangeRateId:'rate-1',exchangeRateDate:'2026-11-09',exchangeRateSource:'BCV',capturedAt:'2026-11-09T12:00:00Z'});
 assert.equal(snap.finalUnitCostOriginalCurrency,'9.5'); assert.equal(snap.finalUnitCostVes,'380'); assert.equal(snap.exchangeRate,'40');
});
test('rechaza descuento mayor que el importe bruto',()=>{
 assert.throws(()=>calculateLineTotal({productId:'p',quantity:'1',unitCost:'10',discountAmount:'11'}));
});

import { validateSupplier, validatePurchase, validateReceipt, validatePayment } from '../lib/modules/purchases/validation.ts';

const idA = '11111111-1111-4111-8111-111111111111';
const idB = '22222222-2222-4222-8222-222222222222';

test('valida proveedor antes de llamar a la base de datos', () => {
 assert.equal(validateSupplier({ name: 'Proveedor JAM', email: 'compras@example.com' }).length, 0);
 assert.ok(validateSupplier({ name: ' ', email: 'correo-invalido' }).length >= 2);
});

test('valida compra, fecha y líneas con identificadores UUID', () => {
 const valid = { supplierId: idA, documentNumber: 'FC-001', documentDate: '2026-11-09', currency: 'USD' as const, lines: [{ productId: idB, quantity: '2', unitCost: '10.50' }] };
 assert.equal(validatePurchase(valid).length, 0);
 assert.ok(validatePurchase({ ...valid, documentDate: '09/11/2026', lines: [] }).length >= 2);
});

test('valida recepción idempotente', () => {
 const valid = { purchaseId: idA, warehouseId: idB, idempotencyKey: 'receipt-001', receivedAt: '2026-11-09T10:00:00Z', lines: [{ purchaseLineId: idA, quantityReceived: '1' }] };
 assert.equal(validateReceipt(valid).length, 0);
 assert.ok(validateReceipt({ ...valid, idempotencyKey: ' ', lines: [] }).length >= 2);
});

test('valida pago a proveedor, fecha y tasa', () => {
 const valid = { payableId: idA, amount: '12.50', currency: 'USD' as const, paymentDate: '2026-11-09', method: 'Transferencia', idempotencyKey: 'pay-001', exchangeRate: '42.123456' };
 assert.equal(validatePayment(valid).length, 0);
 assert.ok(validatePayment({ ...valid, paymentDate: 'ayer', exchangeRate: '0' }).length >= 2);
});
