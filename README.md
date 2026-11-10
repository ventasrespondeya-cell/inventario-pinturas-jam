# PINTURAS JAM — Sistema comercial

Aplicación Next.js + Supabase para operaciones de una tienda de pinturas: catálogo, inventario, compras y recepción, ventas, cotizaciones, clientes, cuentas por cobrar/pagar, caja, cierres, reportes, accesos y auditoría.

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

No aplicar a producción sin respaldar, revisar RLS y probar cada rol. No se crean productos, clientes, existencias, tasas ni saldos ficticios.

## Rutas principales

- `/` — panel principal.
- `/operaciones` — catálogo, inventario y módulos comerciales.
- `/caja` — apertura, movimientos, sincronización y cierres por moneda.
- `/administracion` — accesos y auditoría (sólo owner/admin).

## Estado y limitaciones

El código contiene flujos operativos y RPC transaccionales, pero esta entrega no equivale a una certificación de producción: la migración nueva no se ha aplicado a tu proyecto remoto y no se pudo ejecutar `pnpm install`, `pnpm typecheck` o `pnpm build` en el entorno de generación. Las pruebas Node incluidas son de lógica/contratos, no sustituyen pruebas SQL/E2E reales.

La facturación fiscal venezolana requiere proveedor autorizado, credenciales y validación real de documentos ante el mecanismo fiscal aplicable. El sistema no debe presentar sus documentos internos como facturas fiscales autorizadas. También quedan fuera devoluciones/reembolsos y reversión formal de ventas hasta implementar y probar su flujo contable e inventario.

Consulta `ENTREGA-ETAPA-8-CIERRE-CODIGO.md` y los documentos de `docs/` antes de desplegar.
