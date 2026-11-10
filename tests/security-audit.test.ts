import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
const root = process.cwd()
const migration = readFileSync(join(root, 'supabase/migrations/20261110400000_chat5_security_audit.sql'), 'utf8')
test('security migration creates business-scoped audit with restricted read access', () => {
  assert.match(migration, /create table if not exists public\.jam_system_audit/)
  assert.match(migration, /enable row level security/)
  assert.match(migration, /role in \('owner','admin'\)/)
  assert.match(migration, /create trigger .*after insert or update or delete/s)
  assert.match(migration, /revoke all on public\.jam_system_audit from anon, authenticated/)
})
test('administration RPCs require an authenticated owner or admin and do not create Auth users', () => {
  assert.match(migration, /function public\.jam_admin_require\(\)/)
  assert.match(migration, /function public\.jam_admin_users_list\(\)/)
  assert.match(migration, /function public\.jam_admin_user_access_set/)
  assert.match(migration, /from auth\.users where id=p_user_id/)
  assert.match(migration, /p_role not in \('admin','inventory','sales','viewer'\)/)
  assert.match(migration, /No puedes desactivar tu propia cuenta/)
})
test('cash opening amount is not double-counted and event imports preserve original currency', () => {
  const openFn = migration.slice(migration.indexOf('function public.jam_cash_session_open'), migration.indexOf('-- Consumo idempotente'))
  assert.doesNotMatch(openFn, /insert into public\.jam_cash_movements/)
  const consumeFn = migration.slice(migration.indexOf('function public.jam_cash_events_consume'))
  assert.match(consumeFn, /values\(b,s\.id,typ,e\.amount,e\.currency/)
  assert.match(consumeFn, /event:'\|\|e\.id/)
})
test('admin UI exposes user access management and audit review without service role', () => {
  const page = readFileSync(join(root, 'app/administracion/page.tsx'), 'utf8')
  for (const label of ['Asignar o actualizar acceso','Usuarios autorizados','Bitácora de auditoría','jam_admin_user_access_set','jam_admin_audit_list']) assert.ok(page.includes(label))
  assert.doesNotMatch(page, /service_role/i)
})
test('cash read access is restricted to authorized cash roles and audit reads to admins', () => {
  assert.match(migration, /role in \('owner','admin','sales'\)/)
  assert.match(migration, /jam_commercial_audit_admin_read/)
  assert.match(migration, /Permiso de caja requerido/)
})
