import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const chat2 = readFileSync(new URL('../supabase/migrations/20261109190000_chat2_pinturas_jam.sql', import.meta.url), 'utf8');
const chat3 = readFileSync(new URL('../supabase/migrations/20261109200000_chat3_commercial.sql', import.meta.url), 'utf8');
const catalogArchive = readFileSync(new URL('../supabase/migrations/20261112230500_inventory_catalog_soft_deactivation.sql', import.meta.url), 'utf8');

function functionBody(sql: string, name: string): string {
  const start = sql.indexOf(`function public.${name}(`);
  assert.notEqual(start, -1, `No se encontró ${name}`);
  const end = sql.indexOf('$$;', start);
  assert.notEqual(end, -1, `No se encontró el cierre de ${name}`);
  return sql.slice(start, end);
}

test('Chat 3 delega las entradas de compra a la RPC de inventario de Chat 2', () => {
  assert.match(chat2, /create or replace function public\.jam_inventory_record_movement\(p_movement jsonb,p_actor_id uuid\)/);
  const body = functionBody(chat3, 'jam_purchase_receive_and_post');
  assert.match(body, /public\.jam_inventory_record_movement\(/);
  assert.doesNotMatch(body, /insert into public\.jam_stock_balances/i);
  assert.doesNotMatch(body, /update public\.jam_stock_balances/i);
  assert.doesNotMatch(body, /insert into public\.jam_inventory_movements/i);
});

test('Chat 3 delega las salidas de venta a la RPC de inventario de Chat 2', () => {
  const body = functionBody(chat3, 'jam_sale_confirm');
  assert.match(body, /public\.jam_inventory_record_movement\(/);
  assert.doesNotMatch(body, /insert into public\.jam_stock_balances/i);
  assert.doesNotMatch(body, /update public\.jam_stock_balances/i);
  assert.doesNotMatch(body, /insert into public\.jam_inventory_movements/i);
  assert.match(body, /'idempotencyKey','sale:'\|\|sid::text\|\|':line:'\|\|line_index::text/);
});

test('el rol ventas sólo puede ejecutar salidas; entradas y ajustes siguen restringidos', () => {
  const body = functionBody(chat2, 'jam_inventory_record_movement');
  assert.match(body, /v_type='exit' and v_role not in \('owner','admin','inventory','sales'\)/);
  assert.match(body, /v_type in \('entry','adjustment'\) and v_role not in \('owner','admin','inventory'\)/);
});

test('el helper de negocio exige autenticación y restringe EXECUTE a usuarios autenticados', () => {
  assert.match(chat3, /if auth\.uid\(\) is null or auth\.uid\(\) <> p_actor then raise exception 'No autorizado'/);
  assert.match(chat3, /revoke all on function public\.jam_commercial_business\(uuid,boolean\) from public,anon/i);
  assert.match(chat3, /grant execute on function public\.jam_commercial_business\(uuid,boolean\) to authenticated/i);
});

test('el catálogo se archiva sin borrar registros y conserva controles de negocio', () => {
  assert.match(catalogArchive, /jam_catalog_set_product_active/);
  assert.match(catalogArchive, /jam_catalog_set_category_active/);
  assert.match(catalogArchive, /jam_my_business\(p_actor_id, true\)/);
  assert.match(catalogArchive, /jam_stock_balances/);
  assert.match(catalogArchive, /No se puede desactivar un producto con existencias/);
  assert.match(catalogArchive, /No se puede desactivar una categoría que todavía tiene productos activos/);
  assert.match(catalogArchive, /revoke all on function .* from public, anon/i);
  assert.match(catalogArchive, /grant execute on function .* to authenticated/i);
});
