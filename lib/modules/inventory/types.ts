export type UUID = string;
export type Currency = 'VES' | 'USD';
export type MovementType = 'entry' | 'exit' | 'adjustment' | 'transfer' | 'reversal';
export type Result<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

export interface Product {
  id: UUID; sku: string | null; name: string; brand: string | null;
  categoryId: UUID | null; presentation: string | null; unit: string;
  color: string | null; active: boolean; salePrice: string | null;
  bcvPrice: string | null; createdAt: string;
}
export interface ProductInput {
  id?: UUID; sku?: string | null; name: string; brand?: string | null;
  categoryId?: UUID | null; presentation?: string | null; unit?: string;
  color?: string | null; salePrice?: string | null; bcvPrice?: string | null;
}
export interface Category { id: UUID; name: string; active: boolean }
export interface Warehouse { id: UUID; name: string; active: boolean }
export interface StockRow {
  productId: UUID; productName: string; sku: string | null;
  warehouseId: UUID; warehouseName: string; quantity: string;
  averageCostVes: string; minimumStock: string;
}
export interface MovementInput {
  productId: UUID; warehouseId: UUID; type: Exclude<MovementType, 'reversal'>;
  quantity: string; reason?: string; reference?: string;
  originalCurrency?: Currency; originalUnitCost?: string;
  rateId?: UUID; operationDate?: string; quantityDelta?: string; idempotencyKey: string;
}
export interface Movement {
  id: UUID; productId: UUID; warehouseId: UUID; type: MovementType;
  quantity: string; unitCostVes: string | null; balanceAfter: string;
  reason: string | null; createdAt: string;
}
export interface BcvRateSnapshot {
  rateId: UUID; rate: string; effectiveAt: string; source: string;
}
export interface Actor { userId: UUID }

export function success<T>(data: T): Result<T> { return { ok: true, data }; }
export function failure<T = never>(code: string, message: string): Result<T> {
  return { ok: false, error: { code, message } };
}
