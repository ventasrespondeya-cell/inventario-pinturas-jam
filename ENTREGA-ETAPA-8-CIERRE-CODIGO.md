# PINTURAS JAM — Etapa 8: seguridad, auditoría y cierre del código

## Incluido en esta entrega

- Ruta `/administracion` para consultar usuarios autorizados, asignar roles existentes y activar/desactivar accesos.
- Roles soportados por el esquema actual: `owner`, `admin`, `inventory`, `sales` y `viewer`.
- Un administrador no puede crear otros administradores; sólo el propietario puede asignar el rol `admin`.
- La pantalla no crea cuentas Auth ni contraseñas. El usuario debe existir previamente en Supabase Auth.
- Bitácora `jam_system_audit` con captura de INSERT/UPDATE/DELETE en tablas operativas de catálogo, inventario, compras, ventas, pagos, caja y accesos.
- Consulta de auditoría limitada a propietario/administrador. La escritura de la bitácora se realiza mediante triggers; el cliente no puede modificarla.
- Lectura de caja limitada a propietario, administrador y ventas/caja.
- Corrección de caja: el fondo inicial no se suma dos veces al efectivo esperado.
- Sincronización de eventos comerciales conserva importe y moneda originales, usa clave idempotente y clasifica pagos a proveedores/cambio como egresos.
- Enlaces de operaciones hacia caja y administración.

## Migración nueva

`supabase/migrations/20261110400000_chat5_security_audit.sql`

Aplicar después de las migraciones Chat 2, Chat 3 y Chat 4, primero en una base de staging con respaldo. La migración no crea usuarios Auth, no rellena inventario ni altera registros históricos. La auditoría empieza a registrar cambios desde que se instala.

## Validación ejecutada

Comando:

```bash
node --experimental-strip-types --test tests/*.test.ts
```

Resultado de este paquete: **43 pruebas aprobadas, 0 fallidas**.

No se pudo ejecutar `pnpm install`, `tsc`, `next build` ni pruebas SQL contra PostgreSQL en este entorno porque no hay `node_modules`, `pnpm` no está instalado y el entorno no pudo acceder al registro npm. Por tanto, no se afirma que la compilación Next.js ni la migración estén verificadas contra tu instancia Supabase.

## Pendientes externos al cierre del código

1. Aplicar las cuatro migraciones en Supabase de desarrollo/staging y comprobarlas con usuarios de cada rol.
2. Configurar los usuarios Auth reales y asignar sus UUID desde `/administracion`.
3. Ejecutar `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm build` y las pruebas E2E en tu equipo.
4. Facturación fiscal: falta contratar/configurar un proveedor fiscal autorizado compatible con Venezuela, credenciales/certificados y pruebas de autorización. Los documentos internos no son facturas fiscales válidas.
5. Completar procesos comerciales no implementados en la interfaz como devoluciones/reembolsos, reversión formal de ventas y conversión de cotización a venta. No se presentan como terminados.

## Seguridad

No contiene `.env.local`, service_role, claves privadas, usuarios de prueba ni datos de clientes. La clave `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` es la única clave prevista para el cliente web.
