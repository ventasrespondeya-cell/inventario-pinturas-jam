# PINTURAS JAM — Etapa 4: Ventas y cotizaciones

## Incluido en esta entrega
- Formulario de punto de venta conectado a `CommercialService.confirmSale`.
- Selección de productos activos, cantidad, precio y depósito.
- Carrito de venta con edición por eliminación de líneas y cálculo decimal con `BigInt` (sin aritmética flotante para los totales).
- Selección de cliente y método de pago previamente configurado.
- Registro de cobro y confirmación transaccional mediante `jam_sale_confirm`.
- La RPC valida depósito, cliente, existencias, métodos de pago, impuestos y permisos; registra la salida de inventario y los eventos de caja en la misma transacción.
- Formulario de cotización persistida mediante `CommercialService.saveQuote` / `jam_quote_save`, sin descontar inventario.
- Las cotizaciones y ventas existentes siguen apareciendo en sus listados.

## Límites explícitos
- Esta interfaz inicia las operaciones en VES. La venta USD requiere integrar la selección de tasa BCV vigente y su identificador; no se simula una tasa.
- Los métodos de pago deben estar configurados previamente en el negocio.
- La venta a crédito requiere cliente habilitado, límite disponible y moneda de crédito coincidente; la base de datos lo valida.
- La emisión fiscal legal no está incluida: el módulo actual sólo prepara un documento pendiente y no emite factura fiscal autorizada.
- La integración de caja/cierre sigue dependiendo del contrato del módulo de caja.

## Verificación
`node --experimental-strip-types --test tests/*.test.ts`
Resultado: 32 pruebas aprobadas, 0 fallidas (pruebas existentes del paquete). La interfaz no se pudo compilar en este entorno porque no se incluyen `node_modules`.
