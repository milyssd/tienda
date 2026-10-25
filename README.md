# NEXO / Tienda Bolivia

Tienda funcional en español, mobile-first, con estética gamer minimalista, moneda Bs y catálogo mixto de gaming, perfumes y digitales. Next.js 16.4.3, React 19, TypeScript, Tailwind, Prisma 6.19.3 y MariaDB. Ilustraciones SVG propias, locales y sin rastreadores. La portada combina grafito y lima con tipografía Barlow Condensed y Manrope autoalojada, selector de destacados, categorías visuales y tarjetas de producto con detalles al pasar el cursor. Incluye navegación móvil y soporte de movimiento reducido.

Se actualizó el requisito original de Next.js 14 a una versión corregida tras detectar vulnerabilidades en las dependencias solicitadas. `npm audit --omit=dev` no reporta vulnerabilidades conocidas en la revisión final. Esto no reemplaza una auditoría de la aplicación.

## Código y datos incluidos

- `app/`, `components/` y `lib/`: código fuente (Next.js App Router, sin carpeta `src/` adicional).
- `public/products/`: ilustraciones del catálogo.
- `prisma/`: esquema, migraciones y seed con productos y archivos digitales de demostración.
- `data/catalog.json`: copia del catálogo público y sus variantes, con precios en centavos de boliviano.
- `docs/screenshots/`: capturas del diseño de escritorio y móvil.

No se incluyen usuarios, contraseñas, pedidos ni archivos privados. Consulta [data/README.md](data/README.md) para el alcance de los datos.

## Compilar desde una copia nueva

Requiere Node.js 22.14+ o 24 y npm 10+. `.nvmrc` fija la versión utilizada aquí (24.19.0).

```bash
npm ci
npm run build
```

`build` genera automáticamente Prisma y la salida de producción en `.next/`. **La compilación no necesita `.env`, contraseñas ni conexión a la base de datos.** También puedes ejecutar `npm run typecheck` desde una copia limpia; prepara los tipos de Prisma y Next antes de comprobarlos.

Para ejecutar la aplicación por primera vez en otro equipo, instala MariaDB/MySQL, crea una base y un usuario exclusivo, copia `.env.example` a `.env` y configura `DATABASE_URL`, `SESSION_SECRET` y las credenciales iniciales del administrador. Luego:

```bash
npm run db:migrate
npm run db:seed
npm start
```

En otra terminal, ejecuta `npm run stock:worker` para liberar reservas vencidas. Conserva `.env`, la base y `storage/` entre reinicios. El seed conserva cuentas, productos y archivos existentes. No necesitas volver a ejecutarlo para arrancar.

El ZIP de entrega contiene código, recursos y lockfile; excluye credenciales, base de datos, dependencias, compilaciones y archivos privados. El flujo de compilación se verifica en una copia limpia del código, además de las pruebas funcionales con base de datos.

## Arrancar en este entorno

```bash
cd /workspace/tienda
bash scripts/cloud-db.sh
npm run dev
```

La instancia preparada puede tener ya el servidor de producción activo en el puerto 3000. Detén solo ese proceso antes de ejecutar `dev`. Administración: ruta `/admin`. Las credenciales iniciales aleatorias están en `.env`, en `ADMIN_EMAIL` y `ADMIN_PASSWORD`; no se incluyen en este documento. El repositorio contiene el código y los datos de ejemplo; `.env`, los datos de clientes y la base privada quedan fuera de Git.

Guía de instalación, restauración, PM2, Nginx, túnel y backups: [deploy/README.md](deploy/README.md). Variables documentadas: [.env.example](.env.example).

## Funciona y está probado

- Catálogo de 10 productos (al menos tres de cada categoría), búsqueda, filtros por categoría/precio/disponibilidad, orden, favoritos autenticados, detalle modal y variantes de perfume con precio y stock independientes.
- Carrito persistente en este navegador. Checkout de invitado para productos físicos; los digitales requieren cuenta para recuperar la descarga. Precios y totales calculados en servidor. Recojo, delivery y encomienda con tarifas de ejemplo. Pago manual por transferencia/QR y contra entrega solo para delivery local.
- Reserva atómica de stock, vencimiento de 24 horas, liberación al cancelar, historial de estados y consulta de invitado por código aleatorio más correo.
- Registro e inicio con bcrypt, cookie httpOnly, SameSite=Lax, Secure configurable para HTTPS, invalidación de sesiones y roles comprobados en servidor y middleware para API admin. Limitación de intentos persistente por IP/identidad. Se exige origen exacto en toda escritura.
- Cuenta con pedidos, recibos comerciales PDF y descargas privadas con enlaces firmados de cinco minutos, comprobación del dueño y del pago, límite de cinco descargas y log. Los archivos de seed son muestras Markdown, no ebooks o plantillas comerciales finales.
- Admin: resumen, tabla de pedidos, confirmación manual, transiciones válidas, guía y transportista, recibos PDF, CSV protegido contra fórmulas, creación de productos, edición de precio/stock simple, listado de usuarios, configuración de pago/WhatsApp/mantenimiento y auditoría de acciones.
- Subida admin JPG/PNG/WebP por firma real, hasta 8 MB, límite de píxeles, rotación, WebP sin EXIF, tamaños 1600/800/400 y comparación de peso. Almacenamiento fuera de public, servido por API. Los archivos digitales requieren autorización.
- Modo mantenimiento HTTP 503 con Retry-After, caché corta y acceso de administradores. Metadatos básicos, sitemap, robots y cabeceras de seguridad.

## Alcance pendiente del documento original

Esta es una base funcional local, **no una implementación completa de todo el pliego ni una tienda lista para recibir pagos reales**. Se conservó el documento del usuario en `attachments` fuera del repositorio. Faltan:

- Verificación y recuperación por correo, SMTP transaccional y 2FA TOTP.
- Direcciones guardadas y carrito sincronizado en base de datos/cookie firmada; por ahora usa localStorage.
- CRUD completo de categorías jerárquicas, marcas y atributos, filtros olfativos, galerías, reseñas verificadas/moderación y avisos de reposición.
- Borrado de productos/archivos, edición de variantes desde admin, bloqueo/cambio de rol de usuarios y cupones.
- Subida de comprobantes por cliente, imagen QR configurable, tarifas editables por zona y carritos abandonados.
- Archivos digitales comerciales y su carga/administración desde el panel. Los tres ejemplos se entregan después del pago; productos digitales nuevos necesitan un archivo y su asociación del lado servidor.
- Datos de tienda/NIT/logo editables para recibos, archivo persistente del PDF y envío por correo. El recibo actual se genera bajo demanda y **no es factura fiscal del SIN**.
- Páginas individuales de producto con SEO, políticas legales finales y enlace flotante de WhatsApp. El contacto y finalización por WhatsApp se muestran cuando el administrador configura su número.
- Umami, operación mediante Nginx/PM2 y Cloudflare Tunnel en un servidor público: se incluyen ejemplos y guía, no un despliegue activo.

No hay tareas bloqueadas por credenciales para ejecutar el flujo local. Los datos bancarios, WhatsApp y dominio deben ser reales antes de operar. El checkout no procesa ni cobra dinero.

## Validación

Con el servidor activo:

```bash
npm run typecheck
npm test
npm run test:e2e
```

11 pruebas de API cubren catálogo, CSRF, registro/cookies, roles, totales, reserva/liberación de stock, consulta de invitado, IDOR, pago manual, PDF, enlaces/límite de descarga, favoritos e invalidación de sesiones. Tres pruebas Chromium cubren filtros, carrito, detalle, persistencia y móvil sin overflow. Las pruebas API usan cuentas y pedidos temporales que se limpian al terminar. Ejecutar solo sobre la base de desarrollo. Chromium está disponible en `/usr/bin/chromium` en esta nube. En otro sistema usa `npx playwright install chromium` o define `CHROMIUM_EXECUTABLE_PATH`. Las capturas se escriben en `test-results/`.

## Antes de publicar comercialmente

- [ ] Completar identidad del responsable, contacto y políticas definitivas.
- [ ] Sustituir productos, imágenes, precios, stock y archivos de muestra.
- [ ] Configurar HTTPS/origen exacto y COOKIE_SECURE=true; mantener MariaDB y almacenamiento privados.
- [ ] Configurar pagos y confirmar un flujo real sin exponer credenciales.
- [ ] Implementar recuperación/verificación de correo antes de abrir registros públicos.
- [ ] Añadir MFA admin, protección adicional en el perímetro y gestión/rotación de cuentas.
- [ ] Revisar dependencias, CSP, límites y respaldo/restauración; probar con concurrencia de producción.
- [ ] Resolver funciones pendientes que el negocio requiera; realizar revisión de seguridad independiente.
