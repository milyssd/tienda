# Operación local y despliegue

La instancia de nube tiene MariaDB 11.8 en `/workspace/mysql`, datos en `/workspace/mysql/data` y el proyecto en `/workspace/tienda`. Ambos deben conservarse en la instantánea. Los procesos deben iniciarse de nuevo después de restaurarla. No es necesario crear worktrees.

## En esta nube

```bash
cd /workspace/tienda
bash scripts/cloud-db.sh
npm ci --cache /workspace/.npm
npm run db:generate
npm run db:migrate
npm run db:seed
npm run build
npm start
```

`npm run dev` sirve para desarrollar; `npm start` ejecuta el resultado del build. No ejecutar ambos sobre el mismo puerto. `.env` contiene credenciales locales aleatorias, no está versionado y tiene permisos 0600. El administrador inicial usa `ADMIN_EMAIL` y `ADMIN_PASSWORD` de ese archivo. Consulta esos valores localmente de forma privada; no los pegues en chats ni logs. El seed no restablece contraseñas ni sobrescribe productos existentes. Para rotar la contraseña de admin, usa un script local con bcrypt y Prisma, o una futura interfaz de gestión de usuarios; cambiar ADMIN_PASSWORD no modifica una cuenta ya creada.

Si una nube nueva no conserva `/workspace/mysql`, instalar MariaDB mediante paquetes Debian firmados. Esta instancia se preparó sin root descargando y extrayendo `mariadb-server-core mariadb-client-core liburing2 libaio1t64 libnuma1 libpcre2-8-0 libmariadb3 mariadb-common` desde `https://deb.debian.org/debian` (trixie). Las descargas y metadatos verificados permanecen en `/workspace/mysql-apt`. Conservar estos directorios al publicar. No desactivar validaciones de firma, checksum o TLS.

El host de binarios de Prisma no era accesible. El cliente utiliza su compilador WASM y el adaptador oficial `@prisma/adapter-mariadb`, entregados por npm con integridad de lockfile. `prisma.config.ts` usa el adaptador de esquema sin conexión exclusivamente para generar el cliente. No ejecutar `prisma migrate` con esa configuración. `npm run db:migrate` aplica SQL versionado y registra checksum, fin y pasos en `_prisma_migrations`, bajo un bloqueo asesor. Rechaza migraciones alteradas o incompletas. MySQL no revierte DDL: una migración parcial necesita diagnóstico y restauración, nunca un reintento a ciegas. Toda consulta de la aplicación usa Prisma; el runner de infraestructura es el único que ejecuta los archivos SQL fijos y verificados.

## En un servidor propio Debian/Ubuntu

1. Instala Node.js 22 o 24, MariaDB/MySQL 8, Nginx, PM2 y cloudflared desde fuentes oficiales. Mantén la comprobación de firmas. En ese servidor, instala MariaDB con `sudo apt install mariadb-server` y usa su servicio del sistema; `cloud-db.sh` es solo para esta nube.
2. Crea una base `nexo` utf8mb4 y un usuario exclusivo con permisos sobre esa base. No uses root para la aplicación. Copia `.env.example` a `.env` y completa `DATABASE_URL`, un secreto aleatorio largo y las credenciales del primer admin. Los caracteres reservados en las contraseñas de una URL deben codificarse.
3. En el directorio del proyecto ejecuta `npm ci`, `npm run db:generate`, `npm run db:migrate`, `npm run db:seed`, `npm run build`. La migración y el seed conservan los datos existentes y los archivos privados ya creados. `npm run build` prepara automáticamente el cliente Prisma y puede compilarse sin `.env` ni una base en ejecución.
4. Adapta `cwd` de `deploy/ecosystem.config.cjs`, arranca con `pm2 start deploy/ecosystem.config.cjs`, después `pm2 save` y configura el inicio del sistema. El segundo proceso revisa reservas vencidas cada cinco minutos. La aplicación también las revisa al consultar catálogo o crear pedidos.
5. Copia y adapta `deploy/nginx.conf`, ejecuta `nginx -t` y recarga Nginx. No publiques MariaDB ni los directorios storage, prisma o .env. La aplicación debe escuchar solo en loopback en producción.
6. Con un dominio en Cloudflare: ejecuta `cloudflared tunnel login`, `cloudflared tunnel create nexo`, `cloudflared tunnel route dns nexo tienda.tudominio.bo`. Adapta `deploy/cloudflared.yml` y ejecuta `cloudflared tunnel --config /ruta/cloudflared.yml run`. Configura el servicio del sistema siguiendo la documentación oficial. No hacen falta puertos entrantes del router.
7. Cambia `APP_ORIGIN` al dominio HTTPS exacto y `COOKIE_SECURE=true`; reinicia la aplicación. La verificación CSRF compara el origen exacto. Mantén `TRUST_CLOUDFLARE=false` con el ejemplo Nginx incluido. Solo habilítalo cuando cloudflared sea el único emisor posible y la cabecera se sanee; en ese caso adapta Nginx para reenviar la cabecera confiable. No confíes en cabeceras de clientes directos.
8. En `/admin`, reemplaza catálogo de ejemplo, imágenes, stock, precios, datos de pago y WhatsApp. Completa la información legal y condiciones definitivas. Verifica un pedido completo y recibo antes de abrir al público.

Nginx, PM2 y el túnel se entregan como ejemplos; no se instalaron ni publicaron en esta instancia. Tampoco hay dominio, banco, envío comercial o SMTP conectados.

## Copias de seguridad

Respalda la base con `mariadb-dump` usando un archivo local de opciones con permisos 0600 (no contraseña en argumentos), `storage/` y `.env` cifrado. Mantén copias fuera de esta máquina, prueba restauraciones y define retención. La instantánea del entorno no reemplaza copias regulares.

## Umami

Umami es opcional y no está instalado ni conectado. Para autoalojarlo, despliega la versión oficial actual en un proceso/contenedor separado con PostgreSQL, crea un sitio y cambia inmediatamente la cuenta inicial. Usa un subdominio propio por el mismo túnel o proxy. Añade su script únicamente tras configurar el ID público del sitio y ampliar `script-src` y `connect-src` de CSP para ese origen concreto. No pongas claves del servidor en variables NEXT_PUBLIC_. Esta versión no carga analítica externa.
