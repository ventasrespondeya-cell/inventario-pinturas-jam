# Integración de Chat 4 — Pinturas JAM

Esta versión contiene una implementación comercial parcial de Chat 3 y una propuesta de outbox para caja. No declararla lista para producción.

## Incorporado
- Inventario/catálogo de Chat 2 conservado.
- Migración comercial aditiva `20261109200000_chat3_commercial.sql`.
- Compras y recepción atómica con inventario.
- Ventas y salidas atómicas de inventario.
- Clientes, cotizaciones, crédito, abonos, pagos, documentos internos.
- Outbox `jam_cash_events` para cobros, abonos, pagos a proveedores y cambio.

## Trabajo requerido de Chat 4
1. Revisar el outbox y mapear sus eventos al modelo oficial de caja sin crear caja paralela.
2. Implementar consumo idempotente y reintentos seguros. Sólo marcar evento consumido después de persistir el movimiento de caja.
3. Armonizar `jam_user_access` con RBAC global de Chat 1/Chat 4; no convertirlo en segunda fuente de permisos.
4. Revisar políticas RLS, roles y permisos en entorno de desarrollo.
5. Validar saldos y reportes usando fuentes de datos comerciales, no métricas demo del dashboard.

## No asumir como terminado
- La migración SQL comercial no ha sido ejecutada en PostgreSQL/Supabase.
- La interfaz de Next.js aún conserva placeholders y no llama a los nuevos servicios.
- No hay devoluciones ni anulación/reversión de ventas, reembolsos o notas de crédito/débito completas.
- No hay emisión fiscal autorizada ni conexión SENIAT.
- El typecheck/build de Next.js no se completó porque faltan dependencias locales.

Leer `CHAT3-IMPLEMENTACION-Y-CONTRATOS.md`, `CHAT3-VERIFICACION-FISCAL-VENEZUELA.md` y `PROGRESO.md` antes de integrar.


## Estado de este contrato (actualización 2026-11-09)

Este outbox es una propuesta de integración, no un contrato aprobado por Chat 1/Chat 4. El consumidor debe registrar el evento de caja de forma idempotente usando `id` como clave externa y sólo después llamar a `jam_cash_event_mark_consumed` con la referencia persistida. Los eventos `sale_change` representan salida de efectivo/cambio entregado, no un cobro adicional. No consumir eventos hasta acordar el mapeo de tipos, monedas, cierres y anulaciones con Chat 4.

La integración no se ha probado contra una implementación de caja real.

> **Actualización:** este documento describe el bloqueo inicial de integración. La etapa 7 añadió `/caja` y la etapa 8 corrigió el cálculo de fondo inicial, restringió permisos de caja y añadió auditoría. Ver `ENTREGA-ETAPA-8-CIERRE-CODIGO.md` y `docs/VALIDACION-STAGING.md` para el estado posterior. La integración aún requiere validación real en staging.
