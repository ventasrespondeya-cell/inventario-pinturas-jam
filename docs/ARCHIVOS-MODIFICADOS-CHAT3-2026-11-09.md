# Archivos modificados en esta continuación

- `supabase/migrations/20261109200000_chat3_commercial.sql` — acumulación de cuentas por pagar según recepciones parciales; unicidad de cuenta por compra; bloqueo de notas de crédito/débito no implementadas; referencia obligatoria al consumir eventos de caja.
- `lib/modules/purchases/supabase.ts` — validaciones de proveedor, compra, recepción, pago y devolución antes de invocar RPC.
- `lib/modules/purchases/validation.ts` — validación de fecha y tasa de cambio en pagos a proveedores.
- `tests/purchases.test.ts` — cuatro pruebas adicionales de validación de proveedores, compras, recepciones y pagos.
- `docs/PROGRESO.md` — estado actualizado y limitaciones reales.
- `docs/PRUEBAS-CHAT3.md` — resultados reproducibles y pruebas no ejecutadas.
- `docs/INSTRUCCIONES-CHAT4.md` — aclaración de que el outbox es propuesta pendiente de aceptación y semántica de cambio.
- `.env.example` — variables públicas de Supabase de desarrollo, sin secretos.

No se modificó la interfaz original en esta continuación. `app/page.tsx` conserva los datos de demostración y placeholders; la UI comercial sigue siendo un pendiente explícito.
