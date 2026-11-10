import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { weightedAverage, toMicros, fromMicros } from '../lib/modules/inventory/decimal.ts';
import { validateProduct, validateMovement } from '../lib/modules/inventory/validation.ts';

describe('Pinturas JAM inventory core', () => {
  it('converts decimal values without floating point arithmetic', () => assert.equal(fromMicros(toMicros('10.250001')), '10.250001'));
  it('calculates weighted average', () => assert.equal(weightedAverage('10', '5', '10', '7'), '6'));
  it('rejects invalid product prices and zero movements', () => {
    assert.ok(validateProduct({ name: 'Esmalte', salePrice: '-2' }).length > 0);
    assert.ok(validateMovement({ productId: 'p', warehouseId: 'w', type: 'exit', quantity: '0', idempotencyKey: 'k' }).length > 0);
  });
  it('requires BCV rate and operation date for USD receipts', () => {
    const base = { productId: 'p', warehouseId: 'w', type: 'entry' as const, quantity: '2', originalCurrency: 'USD' as const, originalUnitCost: '10', idempotencyKey: 'k' };
    assert.ok(validateMovement(base).length > 0);
    assert.equal(validateMovement({ ...base, rateId: 'r', operationDate: '2026-11-09' }).length, 0);
  });
  it('requires signed quantity difference for adjustments', () => {
    const base = { productId: 'p', warehouseId: 'w', type: 'adjustment' as const, quantity: '1', idempotencyKey: 'k' };
    assert.ok(validateMovement(base).length > 0);
    assert.equal(validateMovement({ ...base, quantityDelta: '-2' }).length, 0);
  });
});
