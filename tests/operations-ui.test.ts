import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const route = readFileSync(new URL('../app/operaciones/page.tsx', import.meta.url), 'utf8')

test('la consola operativa exige sesión Supabase', () => {
  assert.match(route, /auth\.getSession\(\)/)
  assert.match(route, /signInWithPassword/)
  assert.match(route, /auth\.signOut\(\)/)
})

test('la consola consulta servicios reales de catálogo, inventario y área comercial', () => {
  assert.match(route, /catalog\.listProducts/)
  assert.match(route, /inventory\.stock/)
  assert.match(route, /commercial\.listSales/)
  assert.match(route, /purchases\.listPurchases/)
})

test('clientes y proveedores no aparecen como módulos independientes', () => {
  assert.doesNotMatch(route, /type Section = [^\n]*'Clientes'/)
  assert.doesNotMatch(route, /type Section = [^\n]*'Proveedores'/)
  assert.doesNotMatch(route, /section === 'Clientes'|section === 'Proveedores'/)
  assert.doesNotMatch(route, /createCustomer|createSupplier/)
})

test('inventario permite editar y archivar productos y categorías sin borrar historial', () => {
  assert.match(route, /catalog\.saveProduct/)
  assert.match(route, /editingProduct/)
  assert.match(route, /catalog\.setProductActive/)
  assert.match(route, /catalog\.saveCategory/)
  assert.match(route, /catalog\.setCategoryActive/)
})

test('inventario registra movimientos y expone mínimos y alertas', () => {
  assert.match(route, /inventory\.recordMovement/)
  assert.match(route, /inventory\.movements/)
  assert.match(route, /inventory\.setMinimumStock/)
  assert.match(route, /Alertas/)
  assert.match(route, /Stock mínimo/)
})

test('la consola no expone secretos de Supabase', () => {
  assert.doesNotMatch(route, /process\.env\.[A-Z_]*SERVICE_ROLE/i)
})

test('la ruta principal entra directamente al mismo sistema, sin un segundo panel de bienvenida', () => {
  const home = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8')
  assert.match(home, /redirect\('\/operaciones'\)/)
  assert.doesNotMatch(home, /Bienvenido a Pinturas JAM|ENTRAR A OPERACIONES/)
})

test('la interfaz usa un solo inicio de sesión y una sola navegación', () => {
  assert.match(route, /Iniciar sesión/)
  assert.match(route, /Navegación principal/)
  assert.doesNotMatch(route, /radial-gradient|Acceso autorizado/)
})

test('inventario separa productos, categorías, mínimos, movimientos y alertas', () => {
  for (const label of ['Productos', 'Categorías', 'Stock mínimo', 'Movimientos', 'Alertas']) {
    assert.ok(route.includes(label), `Falta el apartado ${label}`)
  }
  assert.match(route, /inventoryView === 'categories'/)
  assert.match(route, /inventoryView === 'minimum'/)
})

test('la consola abre la sección indicada por el enlace del dashboard', () => {
  assert.match(route, /params\.get\('section'\)/)
  assert.match(route, /setSection\(requested as Section\)/)
})

test('compras permite crear, aprobar y recibir mercancía usando PurchasesService', () => {
  assert.match(route, /purchases\.createPurchase/)
  assert.match(route, /purchases\.approvePurchase/)
  assert.match(route, /purchases\.receiveAndPost/)
  assert.match(route, /idempotencyKey: crypto\.randomUUID\(\)/)
  assert.match(route, /Recibir cantidades pendientes y actualizar stock/)
})

test('cuentas por pagar registra pagos mediante el servicio y conserva la moneda de la deuda', () => {
  assert.match(route, /purchases\.listPayables/)
  assert.match(route, /purchases\.registerPayment/)
  assert.match(route, /currency: String\(payable\.currency\) as Currency/)
})

test('resumen del negocio muestra valores reales y productos más vendidos', () => {
  assert.match(route, /commercial\.listSales\(reportFrom, reportTo\)/)
  assert.match(route, /purchases\.listPurchases\(\{ from: reportFrom, to: reportTo \}\)/)
  assert.match(route, /commercial\.listReceivables\(\)/)
  assert.match(route, /purchases\.listPayables\(\)/)
  assert.match(route, /Productos más vendidos/)
  assert.match(route, /Balance comercial del período/)
})

test('Ventas se elimina del menú y las cuentas se unifican en un apartado', () => {
  assert.doesNotMatch(route, /type Section = [^\\n]*'Ventas'/)
  assert.match(route, /'Cuentas'/)
  assert.match(route, /setAccountView\('receivable'\)/)
  assert.match(route, /setAccountView\('payable'\)/)
  assert.match(route, /commercial\.registerCustomerPayment/)
})

test('cotizaciones sólo muestran métodos de pago y se confirman como operación real', () => {
  assert.match(route, /Métodos de pago disponibles/)
  assert.match(route, /async function confirmQuote/)
  assert.match(route, /quoteId: String\(quote\.id\)/)
  assert.match(route, /payments: \[\]/)
  assert.match(route, /Confirmar operación/)
  assert.doesNotMatch(route, /Monto recibido/)
})

test('compras mantiene un formulario simple sin descuentos ni gastos atribuibles', () => {
  assert.doesNotMatch(route, /Descuento total<input|Gastos atribuibles<input/)
  assert.match(route, /currency: 'USD'/)
  assert.match(route, /COMP-\$\{Date\.now\(\)\}/)
})

test('inventario calcula el valor de mercancía en dólares', () => {
  assert.match(route, /valueUsd:/)
  assert.match(route, /Valor de mercancía/)
  assert.match(route, /Costo promedio convertido a USD/)
})
