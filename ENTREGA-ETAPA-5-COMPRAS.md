# PINTURAS JAM — Etapa 5: compras, recepción y cuentas por pagar

## Incluido en esta entrega

- Alta de proveedores con nombre, identificación fiscal y teléfono.
- Registro de compras con proveedor, número de documento, fecha, moneda y líneas de productos.
- Captura por línea de cantidad, costo unitario, descuento total y gastos atribuibles.
- Creación de compra en borrador y aprobación separada.
- Consulta del detalle de compra desde la tabla de compras.
- Recepción de cantidades pendientes en un depósito seleccionado.
- La recepción usa `jam_purchase_receive_and_post`, que registra en una transacción la recepción, la entrada de inventario por el contrato de Chat 2 y la cuenta por pagar.
- Recepciones idempotentes mediante clave aleatoria por operación.
- Listado de cuentas por pagar y registro de pagos parciales o totales con método, fecha y referencia.
- En pagos USD, la base de datos exige tasa BCV registrada para la fecha del pago. En recepción de compras USD exige la tasa BCV correspondiente a la fecha del documento.

## Límites conocidos

- La interfaz recibe todas las cantidades pendientes de una compra en una sola operación; todavía no ofrece edición manual de cantidades parciales por línea ni registro de faltantes/dañados.
- La devolución de compras no está habilitada porque falta cerrar el contrato de reversión de inventario.
- Los pagos a proveedores generan eventos pendientes para la integración de caja de Chat 4; esta entrega no afirma que la caja esté conciliada ni cerrada.
- No se aplicaron migraciones ni se modificó la base de datos remota.
- La emisión de factura fiscal autorizada sigue pendiente de integrar un emisor fiscal habilitado; los documentos comerciales no equivalen a facturas fiscales válidas.
- La compilación Next.js no se pudo ejecutar porque este paquete no incluye `node_modules`. Se verificó la sintaxis TSX con el compilador TypeScript disponible y pasaron las pruebas automatizadas del repositorio.

## Verificación

Comando: `node --experimental-strip-types --test tests/*.test.ts`

Resultado: 34 pruebas aprobadas, 0 fallidas.
