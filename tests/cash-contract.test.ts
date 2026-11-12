import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
const root = process.cwd()
test('Chat 4 cash migration has atomic open, movement, summary and close RPCs', () => {
  const sql = readFileSync(join(root, 'supabase/migrations/20261109300000_chat4_cash_control.sql'), 'utf8')
  for (const fn of ['jam_cash_session_open','jam_cash_movement_add','jam_cash_session_summary','jam_cash_session_close','jam_cash_events_consume']) assert.match(sql, new RegExp(`function public\\.${fn}`))
  assert.match(sql, /for update/)
  assert.match(sql, /unique index if not exists jam_cash_one_open_per_currency/)
  assert.match(sql, /enable row level security/)
})
test('cash client uses RPCs and never accesses service-role credentials', () => {
  const source = readFileSync(join(root, 'lib/modules/cash/index.ts'), 'utf8')
  assert.match(source, /jam_cash_session_open/)
  assert.match(source, /jam_cash_session_close/)
  assert.doesNotMatch(source, /service_role/i)
})
test('daily cash closing screen provides draft save and final close actions', () => {
  const source = readFileSync(join(root, 'app/caja/page.tsx'), 'utf8')
  for (const label of ['Cierre diario de caja','Guardar borrador','Finalizar cierre del día']) assert.ok(source.includes(label))
})
