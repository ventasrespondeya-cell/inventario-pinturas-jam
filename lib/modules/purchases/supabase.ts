import type { SupabaseClient } from "@supabase/supabase-js";
import {
  failure,
  success,
  type Result,
  type Supplier,
  type SupplierInput,
  type Purchase,
  type PurchaseInput,
  type ReceivePurchaseInput,
  type PurchaseReceipt,
  type Payable,
  type SupplierPayment,
  type SupplierPaymentInput,
  type PurchaseReturnInput,
  type ExchangeRateSnapshot,
} from "./types";
import { validatePurchase, validateReceipt, validatePayment, validatePurchaseReturn, validateSupplier } from "./validation";

type RpcClient = SupabaseClient;

export class PurchasesService {
  constructor(private readonly db: RpcClient) {}

  private async call<T>(
    functionName: string,
    args: Record<string, unknown>,
  ): Promise<Result<T>> {
    try {
      const { data, error } = await this.db.rpc(
        functionName,
        args,
      );

      if (error) {
        return failure(error.code ?? "DATABASE_ERROR", error.message);
      }

      if (data === null || data === undefined) {
        return failure("EMPTY_RESPONSE", "La base de datos no devolvió información.");
      }

      return success(data as T);
    } catch (error) {
      return failure(
        "UNEXPECTED_ERROR",
        error instanceof Error ? error.message : "Error inesperado.",
      );
    }
  }

  async listSuppliers(search?: string): Promise<Result<Supplier[]>> {
    return this.call("jam_purchase_suppliers_list", {
      p_search: search?.trim() || null,
    });
  }

  async saveSupplier(
    input: SupplierInput,
  ): Promise<Result<Supplier>> {
    const errors = validateSupplier(input);
    if (errors.length) return failure("VALIDATION_ERROR", errors.join(" "));
    return this.call("jam_purchase_supplier_save", { p_supplier: input });
  }

  async getSupplierHistory(
    supplierId: string,
  ): Promise<Result<Purchase[]>> {
    return this.call("jam_purchase_supplier_history", {
      p_supplier_id: supplierId,
    });
  }

  async createPurchase(
    input: PurchaseInput,
  ): Promise<Result<Purchase>> {
    const errors = validatePurchase(input);
    if (errors.length) return failure("VALIDATION_ERROR", errors.join(" "));
    return this.call("jam_purchase_create", { p_purchase: input });
  }

  async getPurchase(
    purchaseId: string,
  ): Promise<Result<Purchase>> {
    return this.call("jam_purchase_get", {
      p_purchase_id: purchaseId,
    });
  }

  async listPurchases(filters?: {
    supplierId?: string;
    status?: string;
    from?: string;
    to?: string;
  }): Promise<Result<Purchase[]>> {
    return this.call("jam_purchase_list", {
      p_supplier_id: filters?.supplierId ?? null,
      p_status: filters?.status ?? null,
      p_date_from: filters?.from ?? null,
      p_date_to: filters?.to ?? null,
    });
  }

  async approvePurchase(
    purchaseId: string,
  ): Promise<Result<Purchase>> {
    return this.call("jam_purchase_approve", {
      p_purchase_id: purchaseId,
    });
  }

  async receiveAndPost(
    input: ReceivePurchaseInput,
  ): Promise<Result<PurchaseReceipt>> {
    const errors = validateReceipt(input);
    if (errors.length) return failure("VALIDATION_ERROR", errors.join(" "));
    return this.call("jam_purchase_receive_and_post", { p_receipt: input });
  }

  async listReceipts(
    purchaseId: string,
  ): Promise<Result<PurchaseReceipt[]>> {
    return this.call("jam_purchase_receipts_list", {
      p_purchase_id: purchaseId,
    });
  }

  async listPayables(filters?: {
    supplierId?: string;
    status?: string;
  }): Promise<Result<Payable[]>> {
    return this.call("jam_purchase_payables_list", {
      p_supplier_id: filters?.supplierId ?? null,
      p_status: filters?.status ?? null,
    });
  }

  async registerPayment(
    input: SupplierPaymentInput,
  ): Promise<Result<SupplierPayment>> {
    const errors = validatePayment(input);
    if (errors.length) return failure("VALIDATION_ERROR", errors.join(" "));
    return this.call("jam_purchase_payment_register", { p_payment: input });
  }

  async listPayments(
    payableId: string,
  ): Promise<Result<SupplierPayment[]>> {
    return this.call("jam_purchase_payments_list", {
      p_payable_id: payableId,
    });
  }

  async returnPurchase(
    input: PurchaseReturnInput,
  ): Promise<Result<unknown>> {
    const errors = validatePurchaseReturn(input);
    if (errors.length) return failure("VALIDATION_ERROR", errors.join(" "));
    return failure("NOT_IMPLEMENTED", "Las devoluciones de compra requieren el contrato aprobado de reversión de inventario. La validación local está disponible, pero no se registra una devolución hasta implementar ese contrato.");
  }

  async getExchangeRate(
    date: string,
  ): Promise<Result<ExchangeRateSnapshot>> {
    return this.call("jam_purchase_bcv_rate_get", {
      p_date: date,
    });
  }
}