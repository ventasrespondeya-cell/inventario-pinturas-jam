import type { MovementInput, ProductInput } from './types';

const DECIMAL = /^\d{1,12}(?:\.\d{1,6})?$/;
export function isPositiveDecimal(value: string): boolean {
  return DECIMAL.test(value) && Number(value) > 0 && Number.isFinite(Number(value));
}
export function isNonNegativeDecimal(value: string): boolean {
  return DECIMAL.test(value) && Number(value) >= 0 && Number.isFinite(Number(value));
}
export function validateProduct(input: ProductInput): string[] {
  const errors: string[] = [];
  if (!input.name?.trim()) errors.push('El nombre del producto es obligatorio.');
  if ((input.name ?? '').trim().length > 160) errors.push('El nombre no puede superar 160 caracteres.');
  if (input.salePrice != null && !isNonNegativeDecimal(input.salePrice)) errors.push('El precio de venta debe ser un número válido.');
  if (input.bcvPrice != null && !isNonNegativeDecimal(input.bcvPrice)) errors.push('El precio BCV debe ser un número válido.');
  if (input.unit && input.unit.length > 24) errors.push('La unidad es demasiado larga.');
  return errors;
}
export function validateMovement(input: MovementInput): string[] {
  const errors: string[] = [];
  if (!input.productId) errors.push('Selecciona un producto.');
  if (!input.warehouseId) errors.push('Selecciona un depósito.');
  if (!isPositiveDecimal(input.quantity)) errors.push('La cantidad debe ser mayor que cero.');
  if (!input.idempotencyKey?.trim()) errors.push('Falta la clave de operación.');
  if (input.type === 'entry' && input.originalUnitCost != null && !isNonNegativeDecimal(input.originalUnitCost)) errors.push('El costo debe ser válido.');
  if (input.originalCurrency === 'USD' && (!input.rateId || !input.originalUnitCost)) errors.push('Una compra en USD requiere costo y tasa BCV.');
  if (input.originalCurrency === 'USD' && (!input.operationDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.operationDate))) errors.push('La compra en USD requiere fecha de operación.');
  if (input.type === 'adjustment' && (!input.quantityDelta || !/^-?\d{1,12}(?:\.\d{1,6})?$/.test(input.quantityDelta) || Number(input.quantityDelta) === 0)) errors.push('El ajuste requiere una diferencia distinta de cero.');
  if (input.type !== 'entry' && (input.originalUnitCost != null || input.rateId || input.originalCurrency)) errors.push('El costo y la tasa solo se indican en entradas.');
  return errors;
}
