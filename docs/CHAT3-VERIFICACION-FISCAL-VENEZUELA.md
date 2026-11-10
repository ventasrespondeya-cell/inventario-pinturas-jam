# Verificación inicial — facturación fiscal venezolana

**Fecha de revisión:** 9 de noviembre de 2026.  
**Alcance:** revisión documental inicial para diseñar estados y evitar presentar comprobantes internos como facturas fiscales. No es dictamen legal ni certificación SENIAT.

## Normativa identificada en la revisión

- La Providencia Administrativa SNAT/2024/000102 regula el uso de medios digitales para emitir facturas y otros documentos. La publicación en Gaceta Oficial 43.032 fue el 19-12-2024; la norma se mantiene hasta el 18-04-2027 según el compendio consultado.
- La Providencia SNAT/2018/0141 regula imprentas autorizadas y máquinas fiscales y se mantiene identificada como vigente hasta el 18-04-2027 en el compendio consultado.
- La Providencia SNAT/2024/000121 sobre proveedores de sistemas informáticos fue derogada por SNAT/2026/00084, publicada en Gaceta Oficial 43.435 del 12-08-2026.
- La Providencia SNAT/2026/00093, publicada en Gaceta Oficial 43.484 del 21-10-2026, establece nuevas normas generales y medios para emitir facturas y otros documentos fiscales. La fuente consultada indica entrada en vigencia el 19-04-2027; por tanto, al 09-11-2026 se encuentra publicada pero con vigencia futura. Debe diseñarse la adaptación para ese cambio.
- La Providencia SNAT/2026/00099 sobre sujetos pasivos especiales fue publicada el 22-10-2026 y el compendio consultado señala vigencia desde el 01-11-2026. La clasificación concreta del contribuyente debe comprobarse con su situación real.

## Fuentes consultadas

- [Índice de normativa fiscal venezolana — iDyn](https://www.idynsoft.com/docs/fiscal), consulta 09-11-2026. Resume números de providencias, gacetas y fechas de vigencia.
- [Providencia SNAT/2026/00093 — IVECOFI](https://tributos.ivecofi.net/informacion/legislacion/providencias/pa-2026-93), texto reproducido de la norma y artículos iniciales.
- [Providencia SNAT/2026/00084 — Cachicamo Docs](https://docs.cachicamo.app/fiscal/providencia00084), identifica la derogación de SNAT/2024/000121.
- [Providencia SNAT/2024/000102 — iDyn](https://idynsoft.com/docs/fiscal/venezuela/snat-2024-000102-medios-digitales-facturacion), resumen de ámbito y vigencia.
- [Providencia SNAT/2018/0141 — iDyn](https://www.idynsoft.com/docs/fiscal/venezuela/snat-2018-0141-imprentas-y-maquinas-fiscales), resumen de imprentas y máquinas fiscales.

## Decisiones técnicas tomadas

- Se separa venta comercial de documento fiscal.
- Un comprobante de venta se almacena como `internal_receipt` con estado `internal`.
- La preparación fiscal guarda snapshot y estado `pending_fiscal`.
- No se generan RIF, números de control, rangos autorizados, certificados, secuencias fiscales ni referencias SENIAT.
- La configuración fiscal del comercio no cambia automáticamente a `configured=true`.
- Las reglas tributarias no se precargan. Una persona responsable debe introducirlas con referencia documental y validación contable.
- No existe integración autorizada con imprenta digital, máquina fiscal ni proveedor de facturación en esta entrega.

## Pendiente antes de emitir

1. Obtener del comercio su RIF, razón social y domicilio fiscal reales y verificar su condición tributaria.
2. Determinar qué régimen de emisión le aplica a Pinturas JAM, incluyendo su condición de sujeto pasivo especial y los canales de venta utilizados.
3. Contratar/verificar imprenta digital, proveedor o dispositivo autorizado que corresponda y obtener credenciales/contrato reales.
4. Revisar la normativa vigente al momento de desplegar y preparar la transición a SNAT/2026/00093 antes del 19-04-2027.
5. Validar formatos, datos obligatorios, numeración, control, conservación, contingencia y transmisión con asesor tributario venezolano y el SENIAT.
6. Ejecutar certificación y pruebas de extremo a extremo con el mecanismo autorizado.

**Conclusión:** esta versión no está habilitada para emitir facturas fiscales válidas. La preparación fiscal implementada es una capa interna de datos/documentación, no una autorización de emisión.
