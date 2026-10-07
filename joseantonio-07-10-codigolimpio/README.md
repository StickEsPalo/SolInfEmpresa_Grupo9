# PlanetaFicha

Prototipo académico de comercio electrónico de juegos de mesa y puzles. La interfaz usa HTML, CSS y JavaScript; el servidor usa PHP y MySQL. El pago es simulado: no se deben introducir datos bancarios ni datos personales reales.

## Requisitos

- Hosting con PHP 8 o posterior, HTTPS y la extensión `pdo_mysql`.
- Una base de datos MySQL o MariaDB.
- Para ver la web, abrirla a través de un servidor web. `index.html` carga fragmentos con `fetch()` y no funciona al abrirlo con doble clic (`file://`).

## Ejecución local

Para revisar solo la interfaz, puede usarse Live Server. La API PHP y las funciones que dependen de la base de datos no estarán disponibles.

Con PHP instalado, desde la carpeta del proyecto:

```powershell
php -S localhost:8080
```

Abre `http://localhost:8080`. Para probar el backend localmente también hace falta configurar una base MySQL en `api/config/config.php`.

## Despliegue

1. Crea la base de datos e importa `database/juegos_y_puzles.sql`.
2. Copia `api/config/config.example.php` como `api/config/config.php` y añade la configuración del servidor directamente en el hosting. No publiques ese archivo ni compartas sus contraseñas.
3. Sube los archivos de la web y las carpetas `api/`, `components/`, `img/` y `js/`, conservando su estructura.
4. Comprueba `https://TU-DOMINIO/api/health.php`. Si responde con `"ok":true`, el servidor pudo conectar con la base de datos.
5. Prueba registro, inicio de sesión, catálogo, carrito, pedido e incidencias. El pago y los datos introducidos deben ser ficticios.

La guía paso a paso para el equipo está en [DEPLOYAR.md](DEPLOYAR.md). No es necesario subirla al hosting.

## Estructura

```text
index.html                 Página principal y orden de carga
styles.css                 Estilos
app.js                     Estado, interacciones globales y arranque
components/                 Fragmentos HTML cargados por index.html
js/                         Lógica de interfaz
  data/products.js           Catálogo estático de respaldo e imágenes
  i18n.js                    Traducciones e idioma elegido
  utils.js                   Funciones compartidas y cliente de la API
  auth.js                    Sesión, registro y acceso
  catalog.js                 Catálogo, búsqueda y filtros
  cart.js                    Carrito y totales
  checkout.js                Formulario y creación de pedidos
  support.js                 Formulario de incidencias
  events.js                  Registro de eventos de actividad
  admin.js                   Panel de consulta administrativa
api/                         API PHP
  auth/                      Sesión, registro, acceso y cierre de sesión
  orders/                    Pedidos y consulta de compras
  admin/                     Consultas del panel de administración
  lib/                       Inicio, acceso a datos y correo
  config/                    Plantilla y configuración privada
  products.php               Catálogo desde la base de datos
  support.php                Recepción de incidencias
  health.php                 Comprobación de base de datos
img/products/                Imágenes del catálogo y sus variantes
database/juegos_y_puzles.sql Esquema y datos iniciales
tests/                       Prueba automatizada y base de datos simulada
DEPLOYAR.md                  Guía interna de despliegue
README.md                    Descripción del proyecto
.gitignore                   Reglas locales de Git
.htaccess                    Protección y cabeceras del hosting
```

## Archivos para el hosting

La página necesita `index.html`, `styles.css`, `app.js`, `components/`, `js/`, `img/`, `api/` y el `.htaccess` de la raíz. También necesita `api/config/config.php`, creado de forma privada en el servidor a partir de la plantilla.

Conserva `database/juegos_y_puzles.sql`, `tests/`, `README.md`, `DEPLOYAR.md` y `.gitignore` en tu copia de trabajo. No son necesarios para servir las páginas: el SQL se importa en la base de datos, las pruebas se ejecutan aparte y los Markdown son documentación. Si el servidor ya tiene la base de datos inicializada, no hace falta subir la carpeta `database/`.

No borres los archivos `.htaccess` de la raíz ni de `api/`: restringen el acceso web a archivos internos. Conserva también `api/config/config.example.php` como plantilla, aunque no es la configuración que usa la web.

## Funciones incluidas

- Catálogo servido desde la base de datos, con catálogo estático de respaldo.
- Registro e inicio de sesión con roles de cliente y administrador.
- Carrito separado por cuenta, cálculo de impuestos y envío de demostración.
- Pedidos y pagos simulados, consulta de compras e incidencias.
- Registro de eventos en la interfaz y en la API.
- Notificaciones por correo mediante la configuración SMTP del servidor.

Las funciones del servidor requieren PHP, conexión a la base de datos y los valores correctos en `api/config/config.php`. El contenido de ese archivo es privado.
