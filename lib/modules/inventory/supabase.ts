import type { SupabaseClient } from '@supabase/supabase-js';
import type { Actor, MovementInput, ProductInput } from './types';
import { failure, success, type Result } from './types';
import { validateMovement, validateProduct } from './validation';

function dbError<T>(error: { code?: string; message: string } | null, data: T | null): Result<T> {
  if (error) return failure(error.code ?? 'DATABASE_ERROR', error.message);
  if (data == null) return failure('EMPTY_RESPONSE', 'La base de datos no devolvió información.');
  return success(data);
}

export class CatalogService {
  constructor(private readonly db: SupabaseClient) {}
  async listProducts(search = '', includeInactive = false): Promise<Result<unknown[]>> {
    let query = this.db.from('jam_products').select('id,sku,name,brand,category_id,presentation,unit,color,active,sale_price,bcv_price,created_at').order('name');
    if (!includeInactive) query = query.eq('active', true);
    if (search.trim()) query = query.ilike('name', `%${search.trim().replace(/[%_,]/g, '')}%`);
    const { data, error } = await query;
    return dbError(error, data);
  }
  async saveProduct(input: ProductInput, actor: Actor): Promise<Result<unknown>> {
    const errors = validateProduct(input);
    if (errors.length) return failure('VALIDATION_ERROR', errors.join(' '));
    const { data, error } = await this.db.rpc('jam_catalog_save_product', {
      p_product: input, p_actor_id: actor.userId,
    });
    return dbError(error, data);
  }
  async listCategories(includeInactive = false): Promise<Result<unknown[]>> {
    let query = this.db.from('jam_categories').select('id,name,active').order('name');
    if (!includeInactive) query = query.eq('active', true);
    const { data, error } = await query;
    return dbError(error, data);
  }
  async setProductActive(productId: string, active: boolean, actor: Actor): Promise<Result<unknown>> {
    const { data, error } = await this.db.rpc('jam_catalog_set_product_active', { p_product_id: productId, p_active: active, p_actor_id: actor.userId });
    return dbError(error, data);
  }
  async setCategoryActive(categoryId: string, active: boolean, actor: Actor): Promise<Result<unknown>> {
    const { data, error } = await this.db.rpc('jam_catalog_set_category_active', { p_category_id: categoryId, p_active: active, p_actor_id: actor.userId });
    return dbError(error, data);
  }
  async saveCategory(name: string, actor: Actor, categoryId?: string): Promise<Result<unknown>> {
    if (!name.trim() || name.trim().length > 80) return failure('VALIDATION_ERROR', 'El nombre de la categoría es obligatorio y no debe superar 80 caracteres.');
    const { data, error } = await this.db.rpc('jam_catalog_save_category', { p_name: name.trim(), p_category_id: categoryId ?? null, p_actor_id: actor.userId });
    return dbError(error, data);
  }
}

export class InventoryService {
  constructor(private readonly db: SupabaseClient) {}
  async stock(search = ''): Promise<Result<unknown[]>> {
    const { data, error } = await this.db.rpc('jam_inventory_stock', { p_search: search.trim() || null });
    return dbError(error, data);
  }
  async recordMovement(input: MovementInput, actor: Actor): Promise<Result<unknown>> {
    const errors = validateMovement(input);
    if (errors.length) return failure('VALIDATION_ERROR', errors.join(' '));
    const { data, error } = await this.db.rpc('jam_inventory_record_movement', {
      p_movement: input, p_actor_id: actor.userId,
    });
    return dbError(error, data);
  }
  async warehouses(): Promise<Result<unknown[]>> {
    const { data, error } = await this.db.from('jam_warehouses').select('id,name,active').eq('active', true).order('name');
    return dbError(error, data);
  }
  async saveWarehouse(name: string, actor: Actor): Promise<Result<unknown>> {
    if (!name.trim() || name.trim().length > 80) return failure('VALIDATION_ERROR', 'El nombre del depósito es obligatorio y no debe superar 80 caracteres.');
    const { data, error } = await this.db.rpc('jam_inventory_save_warehouse', { p_name: name.trim(), p_actor_id: actor.userId });
    return dbError(error, data);
  }
  async movements(productId?: string, limit = 100): Promise<Result<unknown[]>> {
    const safeLimit = Math.max(1, Math.min(500, Math.trunc(limit)));
    let query = this.db.from('jam_inventory_movements').select('id,product_id,warehouse_id,movement_type,quantity_delta,unit_cost_ves,balance_after,reason,created_at,actor_id').order('created_at', { ascending: false }).limit(safeLimit);
    if (productId) query = query.eq('product_id', productId);
    const { data, error } = await query;
    return dbError(error, data);
  }
  async setMinimumStock(productId: string, warehouseId: string, minimum: string, actor: Actor): Promise<Result<unknown>> {
    if (!/^\d{1,12}(?:\.\d{1,6})?$/.test(minimum) || Number(minimum) < 0) return failure('VALIDATION_ERROR', 'El mínimo debe ser cero o mayor.');
    const { data, error } = await this.db.rpc('jam_inventory_set_minimum_stock', { p_product_id: productId, p_warehouse_id: warehouseId, p_minimum: minimum, p_actor_id: actor.userId });
    return dbError(error, data);
  }
  async saveBcvRate(rate: string, effectiveAt: string, source: string, actor: Actor): Promise<Result<unknown>> {
    if (!/^\d{1,10}(?:\.\d{1,8})?$/.test(rate) || Number(rate) <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveAt) || !source.toUpperCase().includes('BCV')) return failure('VALIDATION_ERROR', 'Indica una tasa positiva, fecha válida y fuente BCV.');
    const { data, error } = await this.db.rpc('jam_inventory_save_bcv_rate', { p_rate: rate, p_effective_at: effectiveAt, p_source: source, p_actor_id: actor.userId });
    return dbError(error, data);
  }
  async reverseMovement(movementId: string, reason: string, idempotencyKey: string, actor: Actor): Promise<Result<unknown>> {
    if (!movementId || !reason.trim() || !idempotencyKey.trim()) return failure('VALIDATION_ERROR', 'Indica el movimiento, el motivo y la clave de operación.');
    const { data, error } = await this.db.rpc('jam_inventory_reverse_movement', {
      p_movement_id: movementId, p_reason: reason.trim(), p_idempotency_key: idempotencyKey, p_actor_id: actor.userId,
    });
    return dbError(error, data);
  }
}
