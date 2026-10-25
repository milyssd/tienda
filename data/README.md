# Datos públicos de la tienda

`catalog.json` conserva el catálogo público de esta versión: productos, variantes, identificadores, descripciones, ilustraciones, precios y stock. Los precios se expresan en centavos de boliviano (89900 = Bs 899). Son datos de demostración, no un inventario comercial verificado.

No es un respaldo de la base completa. Excluye usuarios, hashes de contraseñas, sesiones, pedidos, direcciones, comprobantes, auditorías, credenciales y configuración bancaria. Los identificadores de producto son públicos y no conceden acceso a compras.

Para inicializar una instalación nueva, configura `.env` de forma privada y ejecuta `npm run db:migrate` y `npm run db:seed`. El seed contiene los productos iniciales y genera tres archivos digitales de demostración fuera de `/public`; preserva registros y archivos existentes. El JSON es una referencia/exportación legible, no se importa automáticamente ni sobrescribe el stock de una instalación.
