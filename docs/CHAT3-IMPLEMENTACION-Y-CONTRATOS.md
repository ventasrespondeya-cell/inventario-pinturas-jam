# Chat 3 — implementación y contratos técnicos

## Instalación

1. Integrar los archivos de `lib/modules/commercial` y `supabase/migrations` en la raíz del proyecto Next.js/Supabase.
2. Instalar dependencias usando el `pnpm-lock.yaml` original: `pnpm install --frozen-lockfile`.
3. Configurar `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (o `NEXT_PUBLIC_SUPABASE_ANON_KEY`). No incluir `service_role` en el navegador.
4. Crear un proyecto Supabase de desarrollo. No aplicar primero en producción.
5. Aplicar migraciones en orden: `20261109190000_chat2_pinturas_jam.sql`, luego `20261109200000_chat3_commercial.sql`.
6. Crear el negocio y la fila real de `jam_user_access` con el usuario autenticado y rol apropiado. El módulo no inventa `business_id` ni usuarios.
7. Crear depósitos y productos usando los servicios de Chat 2.
8. Cargar tasa BCV real por fecha para operaciones USD mediante `jam_inventory_save_bcv_rate`.
9. Configurar métodos de pago mediante `jam_payment_method_save`. No hay métodos de pago ficticios precargados.
10. Configurar reglas tributarias sólo con validación contable/fiscal documentada mediante `jam_tax_rate_save`; no hay alícuotas sembradas.
11. Ejecutar `npm test`, `npm run typecheck`, `npm run build` y pruebas SQL de smoke en desarrollo.

## Fachada TypeScript

```ts
import { createClient } from '@/lib/supabase/client';
import { CommercialService } from '@/lib/modules/commercial';

const db = createClient();
const commercial = new CommercialService(db);

// Cliente
await commercial.saveCustomer({
  name: 'Cliente de prueba',
  creditEnabled: false,
});

// Cotización: sólo guarda el documento, no mueve stock ni caja.
await commercial.saveQuote({
  currency: 'USD',
  lines: [{ productId, quantity: '2', unitPrice: '10.00' }],
});

// Venta: requiere almacén, clave idempotente y métodos de pago configurados.
await commercial.confirmSale({
  idempotencyKey: crypto.randomUUID(),
  warehouseId,
  currency: 'VES',
  lines: [{ productId, quantity: '1', unitPrice: '15.00' }],
  payments: [{ amount: '15.00', currency: 'VES', method: 'Punto de venta' }],
});
```

## Contrato de caja propuesto para Chat 4

Chat 3 inserta eventos en `jam_cash_events` dentro de la misma transacción comercial. Tipos actuales: `sale_collection`, `sale_change`, `customer_payment`, `supplier_payment`, `refund`, `void`.

- `jam_cash_events_pending(p_limit)` entrega eventos no consumidos del negocio autenticado.
- Chat 4 debe traducir el evento al movimiento de caja de su modelo aprobado y conservar `id` como clave idempotente externa.
- Tras registrar correctamente el movimiento en su propio sistema, Chat 4 puede llamar `jam_cash_event_mark_consumed(p_event_id,p_consumer_reference)`.
- No consumir antes de persistir el movimiento de caja.
- No sumar los eventos a un saldo de caja paralelo en Chat 3.
- Este contrato requiere revisión de Chat 4/Chat 1: la estructura no reemplaza su contrato de caja.

## Restricciones comerciales

- Una recepción crea entrada de inventario en la misma transacción SQL.
- Una venta crea salidas de inventario, pagos/outbox y CxC en la misma transacción SQL.
- La cotización no afecta inventario, pagos ni caja.
- Los pagos de venta deben ser de la misma moneda de la venta; no se hace compensación cruzada automática.
- Crédito se configura por cliente y moneda. El servidor bloquea al cliente y comprueba límite antes de crear CxC.
- En operaciones USD se exige una tasa BCV registrada para la fecha o vinculada a la venta; no se recalculan snapshots pasados.
- Métodos de pago y tasas tributarias deben ser configurados explícitamente.
- La numeración `PEND-*` es sólo referencia interna temporal y jamás numeración fiscal.

## Funcionalidades no implementadas

Devoluciones, reversión de ventas y reembolsos, notas de crédito/débito completas, impresión de documentos desde UI, edición de compra con recepciones parciales, informes de antigüedad, impuestos de múltiples jurisdicciones y emisión fiscal autorizada.
