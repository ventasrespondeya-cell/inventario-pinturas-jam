# PINTURAS JAM — Etapa 7: caja y cierres

## Incluido
- Ruta `/caja` con apertura separada por moneda, ingresos y egresos manuales, consulta de movimientos, sincronización de eventos comerciales y cierre con arqueo/diferencia.
- `CashService` para RPCs y lecturas RLS.
- Migración `20261109300000_chat4_cash_control.sql`: sesiones, movimientos, índice de una sola caja abierta por negocio/moneda, RLS, permisos y operaciones transaccionales.
- Sincronización idempotente de `sale_collection`, `customer_payment`, `supplier_payment` y `sale_change`.
- Acceso desde la consola de operaciones.

## Seguridad / restricciones
- Las operaciones de escritura se validan en RPC con `auth.uid()` y rol `owner`, `admin` o `sales` (no se introduce un rol cashier inexistente en el esquema actual).
- Lecturas limitadas al `business_id` del usuario activo.
- No hay `service_role` en cliente.
- La caja se separa por moneda; no convierte ni mezcla USD y VES.
- Los eventos comerciales se sincronizan sólo a una sesión abierta de la misma moneda; se marcan consumidos en la misma transacción que registra el movimiento.
- El cierre almacena esperado, contado y diferencia; no altera ni inventa dinero para cuadrar.

## Aplicación
1. Revisar la migración en una base de desarrollo Supabase.
2. Aplicar primero las migraciones previas Chat 2 y Chat 3 y luego esta migración.
3. Asignar a los usuarios autorizados un rol existente `owner`, `admin` o `sales` en `jam_user_access`.
4. Iniciar sesión y entrar en `/caja`.

No se aplicó ninguna migración al proyecto Supabase remoto desde este entorno. No se validó una emisión fiscal autorizada; eso requiere proveedor/dispositivo fiscal habilitado y credenciales contractuales.
