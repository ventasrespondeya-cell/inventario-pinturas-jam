-- Soft-deactivation for catalog records. Historical references remain intact.
-- Deactivation is audited by the existing jam_system_audit triggers.

create or replace function public.jam_catalog_set_product_active(
  p_product_id uuid,
  p_active boolean,
  p_actor_id uuid default auth.uid()
) returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $function$
declare
  v_business uuid;
  v_row public.jam_products;
begin
  v_business := public.jam_my_business(p_actor_id, true);
  if p_active is null then raise exception 'Estado de producto no válido'; end if;
  if not p_active and exists (
    select 1 from public.jam_stock_balances b
    where b.business_id = v_business and b.product_id = p_product_id and b.quantity > 0
  ) then
    raise exception 'No se puede desactivar un producto con existencias. Registra primero su salida o transferencia.';
  end if;
  update public.jam_products
     set active = p_active, updated_at = now()
   where id = p_product_id and business_id = v_business
   returning * into v_row;
  if not found then raise exception 'Producto no encontrado'; end if;
  return to_jsonb(v_row);
end
$function$;

create or replace function public.jam_catalog_set_category_active(
  p_category_id uuid,
  p_active boolean,
  p_actor_id uuid default auth.uid()
) returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $function$
declare
  v_business uuid;
  v_row public.jam_categories;
begin
  v_business := public.jam_my_business(p_actor_id, true);
  if p_active is null then raise exception 'Estado de categoría no válido'; end if;
  if not p_active and exists (
    select 1 from public.jam_products p
    where p.business_id = v_business and p.category_id = p_category_id and p.active
  ) then
    raise exception 'No se puede desactivar una categoría que todavía tiene productos activos. Reasigna esos productos primero.';
  end if;
  update public.jam_categories
     set active = p_active
   where id = p_category_id and business_id = v_business
   returning * into v_row;
  if not found then raise exception 'Categoría no encontrada'; end if;
  return to_jsonb(v_row);
end
$function$;

revoke all on function public.jam_catalog_set_product_active(uuid, boolean, uuid) from public, anon;
revoke all on function public.jam_catalog_set_category_active(uuid, boolean, uuid) from public, anon;
grant execute on function public.jam_catalog_set_product_active(uuid, boolean, uuid) to authenticated;
grant execute on function public.jam_catalog_set_category_active(uuid, boolean, uuid) to authenticated;
