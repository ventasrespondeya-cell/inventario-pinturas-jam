# PINTURAS JAM — Sistema comercial

Aplicación Next.js + Supabase para operaciones de una tienda de pinturas: inventario, compras y recepción, ventas, cotizaciones, cuentas por cobrar/pagar, caja, cierres, reportes, accesos y auditoría. Los datos de clientes y proveedores se mantienen como referencias operativas dentro de ventas, compras y saldos, pero no existen como módulos independientes de gestión.

## Requisitos

- Node.js 22 o superior.
- pnpm según `packageManager` de `package.json`.
- Proyecto Supabase con Auth habilitado.

## Instalación local (PowerShell o terminal)

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm test
pnpm typecheck
pnpm build
pnpm dev
```

En Windows PowerShell, si `cp` no funciona:

```powershell
Copy-Item .env.example .env.local
```

Configura en `.env.local` únicamente:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Nunca coloques `service_role` ni claves secretas en el navegador o en `.env.local` con prefijo `NEXT_PUBLIC_`.

## Migraciones de base de datos

Aplicar en orden, primero en una base de desarrollo/staging con respaldo:

1. `20261109190000_chat2_pinturas_jam.sql`
2. `20261109200000_chat3_commercial.sql`
3. `20261109300000_chat4_cash_control.sql`
4. `20261110400000_chat5_security_audit.sql`
5. `202611120001_create_daily_cashbook_closings.sql`
6. `20261112230500_inventory_catalog_soft_deactivation.sql`

No aplicar a producción sin respaldar, revisar RLS y probar cada rol. No se crean productos, clientes, existencias, tasas ni saldos ficticios.

## Rutas principales

- `/` — panel principal.
- `/operaciones` — catálogo, inventario y módulos comerciales.
- `/caja` — apertura, movimientos, sincronización y cierres por moneda.
- `/administracion` — accesos y auditoría (sólo owner/admin).

## Estado y limitaciones

El inventario incluye catálogo de productos y categorías, edición, archivo lógico, existencias agregadas por depósito, mínimos, alertas y registro/historial de movimientos. La migración `20261112230500_inventory_catalog_soft_deactivation` ya está aplicada al proyecto Supabase remoto y registrada en su historial. La desactivación es lógica: conserva compras, ventas, movimientos y referencias históricas. Esta entrega no equivale a una certificación de producción; deben pasar las pruebas `pnpm test`, `pnpm typecheck` y `pnpm build` y una revisión funcional de los flujos reales antes de considerar el despliegue productivo.

La facturación fiscal venezolana requiere proveedor autorizado, credenciales y validación real de documentos ante el mecanismo fiscal aplicable. El sistema no debe presentar sus documentos internos como facturas fiscales autorizadas. También quedan fuera devoluciones/reembolsos y reversión formal de ventas hasta implementar y probar su flujo contable e inventario.

Consulta `ENTREGA-ETAPA-8-CIERRE-CODIGO.md` y los documentos de `docs/` antes de desplegar.
