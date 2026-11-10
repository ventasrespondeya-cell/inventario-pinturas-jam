export type UUID = string;
export type Currency = 'USD' | 'VES';
export interface CustomerInput {
  id?: UUID; name: string; identificationType?: string | null; identificationNumber?: string | null;
  taxId?: string | null; phone?: string | null; email?: string | null; address?: string | null;
  fiscalAddress?: string | null; creditEnabled?: boolean; creditLimit?: string; creditCurrency?: Currency; active?: boolean; notes?: string | null;
}
export interface CommercialLineInput {
  productId: UUID; description?: string | null; quantity: string; unitPrice: string;
  discountAmount?: string; taxRate?: string; taxAmount?: string; taxCode?: string | null;
}
export interface SalePaymentInput {
  amount: string; currency: Currency; exchangeRate?: string; method: string; paymentDate?: string; reference?: string | null;
}
export interface SaleInput {
  saleNumber?: string; idempotencyKey: string; customerId?: UUID | null; warehouseId: UUID;
  currency: Currency; exchangeRate?: string; exchangeRateId?: UUID | null; dueDate?: string | null;
  quoteId?: UUID | null; notes?: string | null; lines: CommercialLineInput[]; payments: SalePaymentInput[];
}
export interface QuoteInput {
  id?: UUID; quoteNumber?: string; customerId?: UUID | null; currency: Currency; validUntil?: string | null;
  notes?: string | null; lines: CommercialLineInput[];
}
export interface CustomerPaymentInput {
  receivableId: UUID; amount: string; currency: Currency; exchangeRate?: string; paymentDate: string;
  method: string; reference?: string | null; idempotencyKey: string;
}
export interface SupplierPaymentInput {
  payableId: UUID; amount: string; currency: Currency; exchangeRate?: string; paymentDate: string;
  method: string; reference?: string | null; idempotencyKey: string;
}
export type Result<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };
