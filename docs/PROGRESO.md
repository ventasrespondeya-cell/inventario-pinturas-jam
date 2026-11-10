# Pinturas JAM — estado de Chat 3

Fecha de revisión: 2026-11-09.

## Alcance del paquete

Chat 3 contiene servicios y RPC para proveedores, compras, recepciones parciales, cuentas por pagar, pagos a proveedores, clientes, cotizaciones, ventas, pagos, cuentas por cobrar, métodos de pago, documentos comerciales y perfil fiscal.

## Correcciones verificadas en esta revisión

- Se agregó la ruta `/operaciones`: autenticación Supabase, consultas reales para catálogo/inventario, clientes, proveedores, compras, ventas, cotizaciones y cuentas por cobrar, más alta de clientes mediante RPC validada.
- El panel principal enlaza a la consola operativa y conserva una etiqueta visible de entorno de demostración; sus indicadores estáticos no se presentan como saldos reales.

- Recepciones de compras y confirmaciones de ventas delegan el registro de inventario a `jam_inventory_record_movement` de Chat 2. No escriben directamente `jam_stock_balances` ni `jam_inventory_movements`.
- Las RPC de inventario y las RPC comerciales se ejecutan dentro de la misma transacción PostgreSQL. Si una validación comercial posterior falla, también se revierte el movimiento de inventario.
- Las claves de movimiento generadas por compra y por línea de venta son deterministas e idempotentes.
- El rol `sales` puede registrar salidas asociadas a ventas; entradas y ajustes manuales siguen reservados a `owner`, `admin` e `inventory`.
- El helper de autorización comercial exige que el actor coincida con `auth.uid()` y su ejecución queda restringida a `authenticated`.
- Se mantiene el outbox `jam_cash_events` como cola de integración, no como libro de caja ni sustituto de Chat 4.
- La preparación fiscal conserva estado `pending_fiscal`; no genera numeración ni afirma que exista una factura fiscal emitida.
- Las devoluciones y notas de crédito/débito no implementadas continúan bloqueadas explícitamente.
- `next.config.mjs` ya no ignora errores de TypeScript durante el build.

## Pruebas

Comando: `npm test` con Node.js v22.16.0.

Resultado de la última ejecución: **29 pruebas aprobadas, 0 fallidas** (incluye cuatro pruebas estáticas de autenticación y conexión de la nueva consola). Incluye pruebas de cálculos, validaciones, aritmética decimal y contratos estáticos entre migraciones de Chat 2 y Chat 3.

## Pendientes que impiden declarar la aplicación terminada

1. La página visual `app/page.tsx` conserva métricas de demostración y algunos placeholders. La nueva ruta `/operaciones` sí consulta Supabase y permite alta de clientes; faltan formularios transaccionales completos para ventas, compras, recepción y pagos.
2. Devoluciones de compras/ventas, reversión de ventas, reembolsos y anulaciones completas.
3. Adaptador definitivo y aceptación de contrato de Chat 4 para consumir `jam_cash_events` y registrar cada evento en su propio libro de caja, sin duplicarlo.
4. Pruebas de integración PostgreSQL/Supabase, concurrencia, RLS y E2E. No se ha ejecutado ninguna migración en el proyecto Supabase conectado.
5. Emisión fiscal real: faltan datos auténticos, proveedor/mecanismo autorizado y validación legal/contable aplicable.
6. Instalación de dependencias y verificación integral de Next.js. Se intentó instalar con `pnpm install --frozen-lockfile --ignore-scripts`, pero el registro npm no resolvió DNS (`EAI_AGAIN`); no existe `node_modules`, por lo que typecheck/build no se pudieron completar. El error es de disponibilidad del registro en este entorno, no un build exitoso.

## Supabase y costos

No se crearon ramas, no se aplicaron migraciones y no se modificó la base de datos conectada. La entrega es código local para revisión. Cualquier despliegue debe hacerse sólo después de confirmar que el plan gratuito cubre el uso y de validar primero el entorno y las migraciones.

## Dictamen

Paquete técnico de Chat 3 actualizado y con pruebas unitarias/estáticas aprobadas. **No es todavía una aplicación comercial lista para producción** ni una entrega final integrada con Chat 4.
