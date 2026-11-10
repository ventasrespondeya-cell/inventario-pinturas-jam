# Validación obligatoria en Supabase staging

No ejecutar primero en producción. Crear un proyecto/branch de desarrollo y respaldo previo.

## 1. Migraciones

Aplicar en orden los cuatro archivos SQL listados en el README. Si una migración falla, detenerse y corregirla; no continuar con las siguientes ni ejecutar bloques sueltos en producción.

## 2. Usuarios y roles

Crear usuarios de prueba desde Supabase Auth (sin reutilizar contraseñas personales). Asignar acceso inicial `owner` mediante el procedimiento seguro acordado para el proyecto; después probar en `/administracion`:

- Propietario: lista usuarios, asigna `admin`, `inventory`, `sales` y `viewer`.
- Administrador: puede gestionar roles operativos, pero no crear administradores ni modificar propietario.
- Inventario: puede operar inventario/recepción según RPC, no administrar ni usar caja.
- Ventas: puede vender y operar caja, no recibir compras ni administrar.
- Sólo lectura: consulta, sin escrituras ni acceso a caja/auditoría.

Verificar que las llamadas directas a RPC también respetan permisos; ocultar botones en UI no sustituye RLS/RPC.

## 3. Flujos con datos ficticios de staging

1. Crear categoría, producto y depósito.
2. Recibir una compra aprobada y comprobar movimiento de entrada y saldo.
3. Crear una venta y comprobar salida de inventario y outbox.
4. Abrir caja VES, sincronizar eventos VES, revisar ingresos/egresos y cerrar con arqueo.
5. Repetir por USD, asegurando tasa BCV cargada con fuente y fecha correctas.
6. Reintentar la sincronización y confirmar que no duplica movimientos.
7. Verificar que el fondo inicial aparece una sola vez en el efectivo esperado.
8. Revisar auditoría y confirmar que sólo owner/admin pueden consultarla.
9. Probar sesión expirada, usuario inactivo y usuario sin acceso.

## 4. Validación local en Windows PowerShell

Desde la carpeta raíz del proyecto:

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
# Editar .env.local con URL y publishable key del proyecto de staging
pnpm test
pnpm typecheck
pnpm build
pnpm dev
```

No copiar `service_role` al frontend. No usar datos reales hasta completar estas pruebas.

## 5. Fiscalidad

No emitir documentos internos como facturas fiscales. La conexión fiscal requiere proveedor autorizado aplicable, contrato, credenciales/certificados y confirmación verificable de autorización fiscal.
