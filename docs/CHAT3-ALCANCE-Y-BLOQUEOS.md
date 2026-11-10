# Chat 3 — Alcance confirmado y bloqueos de arquitectura

## Alcance confirmado por el usuario

1. Proveedores y compras.
2. Ventas.
3. Cotizaciones.
4. Clientes.
5. Cuentas por cobrar y ventas a crédito.
6. Abonos y pagos.
7. Comprobantes e historial documental.
8. Arquitectura de facturación fiscal venezolana, sin afirmar validez SENIAT no verificada.

## Contratos técnicos que faltan

La especificación de Chat 3 exige estudiar y respetar los contratos de Chat 1 y Chat 2, y coordinar caja con Chat 4. En los dos ZIP recibidos no aparecen los documentos de Chat 1 (arquitectura, contratos, modelo de datos, reglas, seguridad y plan de pruebas) ni los contratos de caja de Chat 4.

La documentación de Chat 2 confirma además estas decisiones relevantes:

- Inventario opera mediante RPC `jam_inventory_*` y catálogo mediante `jam_catalog_*`.
- El puente `jam_user_access` es autónomo y debe armonizarse con el RBAC global; no debe asumirse como autorización definitiva.
- La recepción de compra debe coordinarse dentro de una sola transacción PostgreSQL con el movimiento de inventario.
- No se deben actualizar existencias desde componentes visuales ni realizar una llamada HTTP separada después de crear la compra.

## Inconsistencia concreta encontrada

`lib/modules/purchases/supabase.ts` invoca RPC como `jam_purchase_suppliers_list`, `jam_purchase_create`, `jam_purchase_receive_and_post`, `jam_purchase_payment_register` y otras. La migración SQL recibida de Chat 2 no define esas RPC ni tablas de compras/proveedores. El adaptador por sí solo no implementa persistencia.

## Por qué no se inventó una migración comercial

Crear tablas, funciones `SECURITY DEFINER`, permisos/RLS, límites de crédito, relaciones de pagos o contratos de caja sin el modelo y RBAC de Chat 1 podría romper la arquitectura aprobada y las reglas de Chat 4. Por eso se conserva el código parcial recibido y se deja la implementación SQL bloqueada hasta recibir los contratos.

## Facturación fiscal

No se agregaron números de control, rangos, RIF, certificados, tasas tributarias ni conexiones ficticias. El diseño fiscal debe esperar verificación documentada de normativa vigente y del mecanismo autorizado de emisión. Un PDF interno no equivale a una factura fiscal validada.
