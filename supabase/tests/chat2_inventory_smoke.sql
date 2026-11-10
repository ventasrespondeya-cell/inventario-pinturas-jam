-- Ejecutar en Supabase SQL Editor DESARROLLO con una sesión autenticada.
-- Requiere que auth.uid() tenga una fila activa en jam_user_access con rol owner/admin/inventory.
begin;
do $$
declare
  v_user uuid := auth.uid(); v_category uuid; v_product jsonb; v_warehouse jsonb; v_entry jsonb; v_exit jsonb;
  v_product_id uuid; v_warehouse_id uuid; v_balance numeric;
begin
  if v_user is null then raise exception 'Ejecutar con usuario autenticado'; end if;
  insert into public.jam_categories(business_id,name)
  select business_id,'__TEST_CHAT2__' from public.jam_user_access where user_id=v_user
  on conflict (business_id,name) do update set active=true returning id into v_category;
  v_product := public.jam_catalog_save_product(jsonb_build_object('name','__TEST_PRODUCTO_CHAT2__','categoryId',v_category,'unit','galón'),v_user);
  v_product_id := (v_product->>'id')::uuid;
  v_warehouse := public.jam_inventory_save_warehouse('__TEST_DEPOSITO_CHAT2__',v_user);
  v_warehouse_id := (v_warehouse->>'id')::uuid;
  v_entry := public.jam_inventory_record_movement(jsonb_build_object('productId',v_product_id,'warehouseId',v_warehouse_id,'type','entry','quantity','5','reason','Prueba','idempotencyKey','chat2-smoke-entry-'||gen_random_uuid()),v_user);
  v_exit := public.jam_inventory_record_movement(jsonb_build_object('productId',v_product_id,'warehouseId',v_warehouse_id,'type','exit','quantity','2','reason','Prueba','idempotencyKey','chat2-smoke-exit-'||gen_random_uuid()),v_user);
  select quantity into v_balance from public.jam_stock_balances where product_id=v_product_id and warehouse_id=v_warehouse_id;
  if v_balance <> 3 then raise exception 'Saldo esperado 3, recibido %',v_balance; end if;
  begin
    perform public.jam_inventory_record_movement(jsonb_build_object('productId',v_product_id,'warehouseId',v_warehouse_id,'type','exit','quantity','99','idempotencyKey','chat2-smoke-overflow-'||gen_random_uuid()),v_user);
    raise exception 'Debió rechazar salida mayor al stock';
  exception when others then
    if sqlerrm = 'Debió rechazar salida mayor al stock' then raise; end if;
  end;
end $$;
rollback;
