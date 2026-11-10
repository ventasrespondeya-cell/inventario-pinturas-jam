# PINTURAS JAM — Etapa 6: reportes operativos

## Implementado
- Nueva sección Reportes en la consola operativa.
- Filtro de fechas para ventas y compras.
- Consulta de ventas, compras, cuentas por cobrar y cuentas por pagar usando los servicios/RPC existentes de Supabase.
- Listados de ventas y compras con moneda original, sin sumar USD y VES como si fueran equivalentes.
- Indicador de eventos comerciales pendientes de consumir por la integración de caja.
- Mensaje explícito que impide interpretar ese indicador como saldo de caja o cierre.

## Límites deliberados
- No se implementó libro de caja, apertura, movimientos, arqueo ni cierre porque el repositorio no contiene un contrato ni tablas de caja aprobadas por Chat 4. Consumir el outbox sin ese contrato podría duplicar o perder movimientos.
- No se implementó RBAC nuevo: la autorización actual sigue dependiendo de `jam_user_access` y sus validaciones RPC. No se creó una segunda fuente de permisos.
- No se emiten facturas fiscales. El perfil fiscal preparable no equivale a autorización de impresora fiscal, proveedor homologado ni conexión SENIAT.
- No se aplicaron migraciones ni se hicieron cambios al proyecto remoto Supabase.
- El build/typecheck de Next.js requiere instalar dependencias; este entorno no tiene `node_modules`.

## Verificación
- Pruebas Node: 35 aprobadas, 0 fallidas.
