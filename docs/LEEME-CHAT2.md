# Pinturas JAM — entrega Chat 2 (catálogo e inventario)

## Objetivo de uso

Mantener la operación sencilla: buscar/registrar producto, elegir depósito, indicar cantidad y guardar. El servidor calcula saldos y costos. No se cargan cantidades iniciales ni costos históricos inventados.

## Contenido

- `lib/modules/inventory/types.ts`: tipos del módulo.
- `lib/modules/inventory/validation.ts`: validaciones de formularios.
- `lib/modules/inventory/decimal.ts`: aritmética decimal exacta a seis posiciones.
- `lib/modules/inventory/supabase.ts`: adaptadores Supabase para catálogo e inventario.
- `lib/modules/catalog/index.ts`, `lib/modules/inventory/index.ts`: exports públicos.
- `supabase/migrations/20261109190000_chat2_pinturas_jam.sql`: tablas, índices, RLS, permisos y RPC.
- `supabase/tests/chat2_inventory_smoke.sql`: prueba transaccional de catálogo/entradas/salidas/stock insuficiente.
- `tests/decimal.test.ts`: pruebas unitarias.

## Instalación en Visual Studio Code

1. Copiar las carpetas `lib/modules/catalog`, `lib/modules/inventory` y `supabase` a la raíz del proyecto.
2. Instalar dependencias si aún no existen: `npm install @supabase/supabase-js`.
3. La aplicación debe crear un cliente Supabase autenticado y pasarlo a `new CatalogService(supabase)` o `new InventoryService(supabase)`. Nunca incluir `service_role` en el navegador.
4. Aplicar la migración primero en una base Supabase de desarrollo con Supabase CLI: `supabase db push` (o ejecutar el SQL en SQL Editor de desarrollo después de revisión).
5. Un administrador debe crear una fila de `jam_user_access` por usuario autorizado y negocio. La tabla referencia `auth.users`; `business_id` debe ser el identificador real del negocio en el sistema anfitrión.
6. Crear al menos un depósito desde `jam_inventory_save_warehouse` y cargar las categorías/productos reales.
7. Ejecutar `npm install`, `npm test` y `npm run typecheck` en el paquete o integrar el contenido y ejecutar los scripts equivalentes del proyecto principal.
8. En desarrollo, ejecutar `supabase/tests/chat2_inventory_smoke.sql` con una sesión autenticada de rol `owner`, `admin` o `inventory`.

## Uso desde la aplicación

```ts
import { CatalogService, InventoryService } from '@/lib/modules/inventory/supabase';

const catalog = new CatalogService(supabase);
const inventory = new InventoryService(supabase);
const actor = { userId: user.id }; // debe coincidir con auth.uid(); el servidor lo verifica

const products = await catalog.listProducts('esmalte');
const saved = await catalog.saveProduct({
  name: 'Esmalte sintético', brand: 'Marca real', presentation: 'Galón',
  unit: 'galón',
}, actor);

const stock = await inventory.stock();
const movements = await inventory.movements(undefined, 100);
const entry = await inventory.recordMovement({
  productId, warehouseId, type: 'entry', quantity: '4',
  originalCurrency: 'VES', originalUnitCost: '125.50',
  reason: 'Recepción', idempotencyKey: crypto.randomUUID(),
}, actor);
```

No usar `salePrice: '0'` como dato real si no se conoce el precio; omitirlo o enviar `null`.

## BCV y valoración

- Los costos de inventario se expresan en VES.
- Una entrada en USD debe incluir `originalUnitCost`, `rateId` y `operationDate` en el JSON RPC. El RPC obtiene la tasa guardada en `jam_exchange_rates`, verifica moneda USD→VES y fecha de operación y guarda el snapshot.
- Registrar tasas con `jam_inventory_save_bcv_rate(rate, date, 'BCV', actorId)`. La tasa se expresa en VES por USD.
- Una entrada en VES conserva su costo original como costo VES.
- El promedio ponderado se actualiza al registrar entradas con costo. Las salidas no cambian el costo promedio.
- No se recalculan movimientos pasados al actualizar tasas.

## Integración Chat 3 — recepción de compras

La recepción de compra debe registrar documento comercial y movimiento de inventario dentro de una única transacción PostgreSQL. Chat 3 debe invocar la lógica de movimiento desde su RPC coordinadora o incorporar la operación equivalente en la misma transacción. No ejecutar primero la compra y después una llamada HTTP separada al inventario. Para evitar doble registro, compartir una clave idempotente única por recepción/línea.

## Seguridad y modelo de acceso

- RLS habilitado en todas las tablas del módulo.
- Lectura limitada al `business_id` de `jam_user_access`.
- Escrituras directas revocadas a `anon` y `authenticated`; cambios mediante RPC `SECURITY DEFINER`.
- Cada RPC verifica que `p_actor_id = auth.uid()` y que el usuario tenga acceso activo y rol permitido.
- La tabla `jam_user_access` es un puente autónomo. Chat 4 debe reemplazar/armonizar su origen con RBAC global; no duplicar la fuente de verdad de permisos.

## Decisiones y limitaciones explícitas

1. El esquema de esta entrega es autocontenido y usa `business_id` UUID y acceso de un negocio por usuario (`user_id` es PK). Si el sistema anfitrión permite varios negocios por usuario, Chat 4/Chat 1 debe adaptar el puente a `user_id + business_id` y hacer que las RPC reciban/validen el contexto seleccionado.
2. La migración no crea ni inventa el negocio, usuarios, categorías, productos, depósitos, tasas ni stock iniciales.
3. Los nombres de las tablas `jam_*` evitan colisiones con el esquema del resto de chats.
4. Los movimientos de ajuste aceptan diferencia positiva o negativa en el JSON (`quantityDelta`); motivo obligatorio recomendado por UI. Las salidas normales no permiten saldo negativo.
5. Un movimiento de entrada solo puede reversarse si no hay movimientos posteriores para ese producto/depósito. Si los hay, se debe registrar ajuste correctivo autorizado; esto evita falsificar el promedio histórico.
6. El inventario no implementa lotes, tintometría, fórmulas de color, seriales ni conversiones automáticas entre litros/galones. Para mantenerlo simple, cada presentación/unidad comercial es un producto distinto (por ejemplo, galón y cuarto son fichas distintas).
7. El traspaso entre depósitos se puede representar con salida y entrada coordinadas, pero no se expone como operación atómica en esta entrega. Requiere RPC específica si Chat 1 confirma que se necesita.
8. `precio_bcv` se guarda separado de costo promedio y precio de venta; su significado comercial debe respetar la definición del contrato central.
9. No se afirma prueba contra Supabase real. La prueba SQL incluida debe ejecutarse en desarrollo con usuario y acceso configurados.

## Archivos que deben integrarse o revisarse

- Integrar tipos de `inventory/types.ts` con `lib/contracts/*` cuando Chat 1 publique el contrato definitivo; no copiar tipos duplicados sin resolver nombres.
- Conectar `jam_user_access` con RBAC de Chat 4.
- Coordinar recepción atómica con Chat 3.
- Validar el significado de `precio_bcv` con Chat 1.
- Confirmar si `business_id` corresponde al identificador real del negocio.
