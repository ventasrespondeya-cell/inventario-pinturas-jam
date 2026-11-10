# PINTURAS JAM — estado final del código (etapa 8)

## Módulos incluidos
- Panel principal y navegación.
- Catálogo, categorías, productos, depósitos e inventario.
- Compras, aprobación, recepción de mercancía y cuentas por pagar.
- Ventas, cotizaciones, clientes, cobros y cuentas por cobrar.
- Caja por moneda, ingresos/egresos, sincronización de eventos, arqueo y cierres.
- Reportes operativos.
- Administración de accesos y auditoría desde `/administracion`.

## Validación en este entorno
- `node --experimental-strip-types --test tests/*.test.ts`: 43 aprobadas, 0 fallidas.
- `pnpm install`, `pnpm typecheck` y `pnpm build`: no ejecutables aquí por falta de pnpm/node_modules y falta de conexión al registro npm.
- Migraciones SQL: revisadas como archivos; no ejecutadas contra PostgreSQL/Supabase.
- E2E con usuarios reales y navegador: pendiente en el entorno del propietario.

## Límites que no deben ocultarse
- Facturación fiscal autorizada venezolana no implementada: falta proveedor fiscal autorizado, credenciales y pruebas reales de autorización.
- Devoluciones, reembolsos y reversión formal de ventas aún no implementados.
- Conversión de cotización guardada a venta no expuesta en la interfaz.
- Las migraciones deben aplicarse en orden en staging con respaldo antes de producción.
- Los usuarios deben existir primero en Supabase Auth; después se asignan en `/administracion`.

## Próximo paso operativo
Seguir `docs/VALIDACION-STAGING.md`, ejecutar instalación/typecheck/build en el equipo Windows y validar cada rol y flujo en Supabase antes de cargar datos reales.
