import type { SupabaseClient } from '@supabase/supabase-js';
import type { CustomerInput, CustomerPaymentInput, QuoteInput, Result, SaleInput, SupplierPaymentInput } from './types';
import { validateCustomer, validateCustomerPayment, validateQuote, validateSale } from './validation';

export class CommercialService {
 constructor(private readonly db: SupabaseClient) {}
 private async rpc<T>(name: string, args: Record<string, unknown>): Promise<Result<T>> {
  try { const {data,error}=await this.db.rpc(name,args); if(error)return {ok:false,error:{code:error.code??'DATABASE_ERROR',message:error.message}}; if(data===null)return {ok:false,error:{code:'EMPTY_RESPONSE',message:'La base de datos no devolvió información.'}}; return {ok:true,data:data as T}; }
  catch(e){return {ok:false,error:{code:'UNEXPECTED_ERROR',message:e instanceof Error?e.message:'Error inesperado.'}}}
 }
 savePaymentMethod(method:Record<string,unknown>){return this.rpc<unknown>('jam_payment_method_save',{p_method:method})}
 listPaymentMethods(){return this.rpc<unknown[]>('jam_payment_method_list',{})}
 listSuppliers(search=''){return this.rpc<unknown[]>('jam_purchase_suppliers_list',{p_search:search.trim()||null})}
 saveSupplier(input: Record<string,unknown>){if(!String(input.name??'').trim())return Promise.resolve({ok:false as const,error:{code:'VALIDATION_ERROR',message:'Nombre de proveedor obligatorio.'}});return this.rpc<unknown>('jam_purchase_supplier_save',{p_supplier:input})}
 cancelPurchase(purchaseId:string,reason:string){return this.rpc<unknown>('jam_purchase_cancel',{p_purchase_id:purchaseId,p_reason:reason})}
 listPurchases(filters: {supplierId?:string;status?:string;from?:string;to?:string}={}){return this.rpc<unknown[]>('jam_purchase_list',{p_supplier_id:filters.supplierId??null,p_status:filters.status??null,p_date_from:filters.from??null,p_date_to:filters.to??null})}
 createPurchase(input: Record<string,unknown>){return this.rpc<unknown>('jam_purchase_create',{p_purchase:input})}
 receivePurchase(input: Record<string,unknown>){return this.rpc<unknown>('jam_purchase_receive_and_post',{p_receipt:input})}
 listCustomers(search=''){return this.rpc<unknown[]>('jam_customer_list',{p_search:search.trim()||null})}
 saveCustomer(input:CustomerInput){const errors=validateCustomer(input);return errors.length?Promise.resolve({ok:false as const,error:{code:'VALIDATION_ERROR',message:errors.join(' ')}}):this.rpc<unknown>('jam_customer_save',{p_customer:input})}
 saveQuote(input:QuoteInput){const errors=validateQuote(input);return errors.length?Promise.resolve({ok:false as const,error:{code:'VALIDATION_ERROR',message:errors.join(' ')}}):this.rpc<unknown>('jam_quote_save',{p_quote:input})}
 cancelQuote(quoteId:string,reason:string){return this.rpc<unknown>('jam_quote_cancel',{p_quote_id:quoteId,p_reason:reason})}
 listQuotes(status?:string){return this.rpc<unknown[]>('jam_quote_list',{p_status:status??null})}
 confirmSale(input:SaleInput){const errors=validateSale(input);return errors.length?Promise.resolve({ok:false as const,error:{code:'VALIDATION_ERROR',message:errors.join(' ')}}):this.rpc<unknown>('jam_sale_confirm',{p_sale:input})}
 listSalePayments(saleId:string){return this.rpc<unknown[]>('jam_sale_payments_list',{p_sale_id:saleId})}
 listSales(from?:string,to?:string){return this.rpc<unknown[]>('jam_sale_list',{p_from:from??null,p_to:to??null})}
 listCustomerPayments(receivableId:string){return this.rpc<unknown[]>('jam_customer_payments_list',{p_receivable_id:receivableId})}
 getCustomerStatement(customerId:string){return this.rpc<unknown[]>('jam_customer_statement',{p_customer_id:customerId})}
 listCashEventsPending(limit=100){return this.rpc<unknown[]>('jam_cash_events_pending',{p_limit:limit})}
 markCashEventConsumed(eventId:string,reference:string){return this.rpc<unknown>('jam_cash_event_mark_consumed',{p_event_id:eventId,p_consumer_reference:reference})}
 saveTaxRate(rule:Record<string,unknown>){return this.rpc<unknown>('jam_tax_rate_save',{p_rule:rule})}
 listReceivables(customerId?:string,status?:string){return this.rpc<unknown[]>('jam_receivable_list',{p_customer_id:customerId??null,p_status:status??null})}
 registerCustomerPayment(input:CustomerPaymentInput){const errors=validateCustomerPayment(input);return errors.length?Promise.resolve({ok:false as const,error:{code:'VALIDATION_ERROR',message:errors.join(' ')}}):this.rpc<unknown>('jam_customer_payment_register',{p_payment:input})}
 registerSupplierPayment(input:SupplierPaymentInput){if(!input.idempotencyKey.trim()||!/^\d+(?:\.\d{1,6})?$/.test(input.amount)||Number(input.amount)<=0)return Promise.resolve({ok:false as const,error:{code:'VALIDATION_ERROR',message:'Importe o clave idempotente inválidos.'}});return this.rpc<unknown>('jam_purchase_payment_register',{p_payment:input})}
 listDocuments(sourceType?:string,sourceId?:string){return this.rpc<unknown[]>('jam_commercial_document_list',{p_source_type:sourceType??null,p_source_id:sourceId??null})}
 prepareFiscalDocument(saleId:string,documentType:'invoice'|'credit_note'|'debit_note'='invoice'){return this.rpc<unknown>('jam_fiscal_document_prepare',{p_sale_id:saleId,p_document_type:documentType})}
 getFiscalProfile(){return this.rpc<unknown>('jam_fiscal_profile_get',{})}
 saveFiscalProfile(profile:Record<string,unknown>){return this.rpc<unknown>('jam_fiscal_profile_save',{p_profile:profile})}
}
