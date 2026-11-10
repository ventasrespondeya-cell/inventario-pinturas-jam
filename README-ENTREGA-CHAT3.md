# Pinturas JAM — entrega Chat 3 actualizada

## Qué se agregó en esta revisión

- Ruta `/operaciones` con autenticación Supabase (correo/contraseña), lectura de inventario, clientes, proveedores, compras, ventas, cotizaciones y cuentas por cobrar.
- Alta básica de clientes a través de `CommercialService.saveCustomer` (RPC y validación del servidor).
- Manejo explícito de sesión, errores de RPC y estados vacíos; no se presentan registros ficticios como datos reales.
- Acceso directo desde el panel visual a la consola `/operaciones`.

## Preparación local

1. Requiere Node.js 22 o superior y pnpm compatible con `packageManager`.
2. `pnpm install --frozen-lockfile`
3. Copia `.env.example` a `.env.local` y coloca URL + publishable/anon key de Supabase. No usar `service_role` en el navegador.
4. `pnpm dev` y abrir `http://localhost:3000/operaciones`.
5. Inicia sesión con un usuario ya creado en Supabase y autorizado en `jam_user_access` para el negocio correspondiente.

## Base de datos

Las migraciones se mantienen en `supabase/migrations/` y deben aplicarse en orden, sólo en un proyecto de desarrollo respaldado y validado:

1. `20261109190000_chat2_pinturas_jam.sql`
2. `20261109200000_chat3_commercial.sql`

No se ejecutaron migraciones sobre el proyecto Supabase conectado. No se crearon ramas ni recursos pagos.

## Límites honestos

- La consola ofrece consultas reales y alta de clientes; no presenta aún formularios completos para compras, ventas, cobros, pagos, recepción de mercancía ni cierres.
- Chat 4 debe aprobar e implementar el consumidor idempotente de `jam_cash_events` antes de operar caja.
- No están implementadas devoluciones, reversos comerciales completos ni reembolsos.
- No hay emisión fiscal autorizada/SENIAT. Los documentos internos no deben tratarse como facturas fiscales.
- Las métricas del panel principal original siguen siendo ilustrativas; usa `/operaciones` para consultar registros reales.


## Corrección de navegación y botones del panel (revisión posterior)

- Las acciones rápidas del dashboard ahora abren la sección correspondiente de `/operaciones`.
- El menú de operación rápida ya no cierra silenciosamente: ofrece enlaces a ventas, compras, clientes y estado de caja.
- La consola lee el parámetro `?section=` para seleccionar la sección solicitada.
- Los módulos no implementados muestran explícitamente que la integración está pendiente y no ofrecen acciones ficticias.
- Las métricas y los productos del dashboard siguen siendo ilustrativos; no deben usarse para tomar decisiones operativas.
- Esta corrección no convierte las consultas en formularios de transacción ni habilita caja, compras, ventas o inventario transaccional. Esas funciones siguen bloqueadas por la ausencia de migraciones ejecutadas y contratos/permisos completos.
