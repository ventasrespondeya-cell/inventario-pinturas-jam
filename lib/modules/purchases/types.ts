export type UUID = string;
export type Currency = "USD" | "VES";

export type PurchaseStatus =
  | "draft"
  | "approved"
  | "partially_received"
  | "received"
  | "cancelled";

export type ReceiptStatus = "received" | "posted" | "reversed";

export type PaymentStatus = "pending" | "partial" | "paid" | "cancelled";

export interface ApiResult<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  code: string;
  message: string;
}

export type Result<T> =
  | ApiResult<T>
  | { ok: false; error: ApiError };

export interface Supplier {
  id: UUID;
  businessId: UUID;
  name: string;
  taxId: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierInput {
  id?: UUID;
  name: string;
  taxId?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  active?: boolean;
}

export interface PurchaseCostSnapshot {
  currency: Currency;
  originalUnitCost: string;
  discountPerUnit: string;
  attributableExpensePerUnit: string;
  finalUnitCostOriginalCurrency: string;
  exchangeRate: string;
  exchangeRateId: UUID | null;
  exchangeRateDate: string | null;
  exchangeRateSource: string | null;
  finalUnitCostVes: string;
  valuationCurrency: "VES";
  capturedAt: string;
}

export interface PurchaseLineInput {
  productId: UUID;
  description?: string | null;
  quantity: string;
  unitCost: string;
  discountAmount?: string;
  attributableExpenses?: string;
}

export interface PurchaseLine extends PurchaseLineInput {
  id: UUID;
  purchaseId: UUID;
  lineTotal: string;
  costSnapshot: PurchaseCostSnapshot | null;
}

export interface Purchase {
  id: UUID;
  businessId: UUID;
  supplierId: UUID;
  documentNumber: string;
  documentDate: string;
  currency: Currency;
  status: PurchaseStatus;
  subtotal: string;
  discountTotal: string;
  expenseTotal: string;
  total: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  lines: PurchaseLine[];
}

export interface PurchaseInput {
  supplierId: UUID;
  documentNumber: string;
  documentDate: string;
  currency: Currency;
  notes?: string | null;
  lines: PurchaseLineInput[];
}

export interface ReceiptLineInput {
  purchaseLineId: UUID;
  quantityReceived: string;
  quantityMissing?: string;
  quantityDamaged?: string;
  notes?: string | null;
}

export interface ReceivePurchaseInput {
  purchaseId: UUID;
  warehouseId: UUID;
  idempotencyKey: string;
  receivedAt: string;
  lines: ReceiptLineInput[];
}

export interface PurchaseReceipt {
  id: UUID;
  purchaseId: UUID;
  warehouseId: UUID;
  status: ReceiptStatus;
  receivedAt: string;
  postedAt: string | null;
  reversedAt: string | null;
  idempotencyKey: string;
  createdAt: string;
}

export interface Payable {
  id: UUID;
  purchaseId: UUID;
  supplierId: UUID;
  originalCurrency: Currency;
  originalAmount: string;
  paidAmount: string;
  balance: string;
  status: PaymentStatus;
  dueDate: string | null;
  createdAt: string;
}

export interface SupplierPaymentInput {
  payableId: UUID;
  amount: string;
  currency: Currency;
  paymentDate: string;
  method: string;
  exchangeRate?: string;
  reference?: string | null;
  idempotencyKey: string;
}

export interface SupplierPayment {
  id: UUID;
  payableId: UUID;
  amount: string;
  currency: Currency;
  paymentDate: string;
  reference: string | null;
  createdAt: string;
}

export interface PurchaseReturnInput {
  receiptId: UUID;
  idempotencyKey: string;
  reason: string;
  lines: Array<{
    receiptLineId: UUID;
    quantity: string;
  }>;
}

export interface ExchangeRateSnapshot {
  id: UUID;
  rate: string;
  effectiveAt: string;
  source: string;
}

export function success<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function failure<T = never>(
  code: string,
  message: string,
): Result<T> {
  return { ok: false, error: { code, message } };
}