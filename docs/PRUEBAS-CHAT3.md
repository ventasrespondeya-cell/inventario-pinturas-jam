# Pruebas Chat 3 — ejecución y límites

Fecha: 2026-11-09
Entorno: Node.js v22.16.0

## Pruebas unitarias ejecutadas

Comando real:

```bash
npm test
```

Resultado real: 21 tests, 21 aprobados, 0 fallidos.

Cobertura observada:

- Inventario: conversión decimal, costo promedio, validación de precios/movimientos, tasa BCV y ajustes.
- Compras: cálculos de líneas/totales, costo unitario, snapshot USD/VES, descuentos y validaciones de proveedor/compra/recepción/pago.
- Comercial: importes con descuento/impuesto, totales, saldo, cliente, venta y cotización.

## Intentos de validación adicionales

- `npm install --ignore-scripts --no-audit --no-fund`: no terminó; agotó el tiempo disponible al intentar resolver dependencias.
- `corepack pnpm install --offline --frozen-lockfile`: no ejecutó porque Corepack intentó descargar pnpm 12.3.4 y no pudo resolver `registry.npmjs.org`.
- `tsc --noEmit`: no pasó porque no están instaladas las dependencias ni los tipos de React/Next/Node/Supabase. No se interpreta como errores de tipos confirmados del código fuente.

## No ejecutado

- Build Next.js.
- Migraciones contra PostgreSQL/Supabase.
- Tests SQL de concurrencia/idempotencia.
- Pruebas RLS y roles con usuarios reales.
- E2E navegador.
- Integración con caja Chat 4.
- Emisión fiscal SENIAT/proveedor autorizado.

No declarar estas pruebas como aprobadas.
