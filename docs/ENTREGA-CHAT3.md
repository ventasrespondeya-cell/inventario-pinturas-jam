# Entrega técnica — Chat 3 / Pinturas JAM

## Archivos clave

- `lib/modules/purchases/`: tipos, cálculos, validaciones y servicio de compras.
- `lib/modules/commercial/`: tipos, cálculos, validaciones y servicio comercial.
- `lib/modules/inventory/`: tipos, validaciones, decimales y servicio de inventario de Chat 2.
- `supabase/migrations/20261109190000_chat2_pinturas_jam.sql`: migración de catálogo e inventario.
- `supabase/migrations/20261109200000_chat3_commercial.sql`: migración comercial.
- `tests/`: pruebas unitarias y de contrato de migraciones.
- `docs/INSTRUCCIONES-CHAT4.md`: coordinación pendiente para caja.

## Orden de migración

1. Aplicar migración Chat 2.
2. Aplicar migración Chat 3.

Sólo en una base de desarrollo aprobada. No aplicar a producción ni al proyecto conectado sin validación previa.

## Comandos

```bash
pnpm install --frozen-lockfile
npm test
npm run typecheck
npm run build
```

## Límites conocidos

La UI todavía es demostrativa, la integración con caja requiere aceptación de Chat 4, y los procesos fiscales/devoluciones no están implementados. No se cargan datos de ejemplo en la base de datos.
