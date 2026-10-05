# PlanetaFicha - prototipo de eCommerce de importación

PlanetaFicha es un prototipo académico de canal digital de venta para un comercio de juegos de mesa y puzzles de diseño europeo y asiático. No hay actividad comercial ni pagos reales: el pago es simulado y los datos de cliente deben ser siempre ficticios.

La web tiene un **front-end estático** (HTML, CSS y JavaScript sin compilación) y un **back-end PHP + MySQL/MariaDB** con API propia, cuentas de usuario con sesión (roles `cliente` y `administrador`), pedidos y eventos guardados en base de datos, back-office protegido y aviso por correo de cada pedido nuevo. Está publicada en un hosting con PHP y HTTPS (DonDominio).

## Puesta en marcha

### Requisitos

- Servidor HTTP con **PHP 8** y extensión `pdo_mysql`, y una base de datos MySQL/MariaDB.
- Conexión a internet en el navegador (tipografías de Google Fonts).

`index.html` carga los componentes (`components/*.html`) con `fetch()`, así que **no funciona abriéndolo con doble clic** (`file://`): hay que servirlo por HTTP.

### Entorno local

```powershell
cd SolInfEmpresa_Grupo9-JP
php -S localhost:8080
```

Live Server de VS Code y `python -m http.server` **no ejecutan PHP**: sirven solo para revisar la parte visual (el catálogo usa entonces los productos estáticos de respaldo, pero no hay login, pedidos ni back-office). Para probar la API sin MySQL puede usarse el adaptador `mock` (ver "Pruebas automáticas").

### Despliegue en el hosting

Pasos resumidos (el detalle está en `DEPLOYAR.md`; ese archivo es solo para el equipo y **no debe subirse al hosting**):

1. Crear una base de datos MySQL/MariaDB y un usuario con permisos sobre ella; importar `database/juegos_y_puzles.sql`.
2. Copiar `api/config/config.example.php` a `api/config/config.php` y rellenarlo **directamente en el servidor** (dominio, host MySQL, base de datos, usuario, contraseña y, opcionalmente, SMTP).
3. Subir el contenido de la carpeta respetando las carpetas (`api/`, `components/`, `js/`, `img/`, `database/`). En DonDominio se hace con el cliente web FTP (Monsta FTP) del panel, dentro de la carpeta `public`.
4. Abrir `https://TU-DOMINIO/api/health.php`: con MySQL conectado devuelve JSON con `"ok":true`.
5. Probar a mano: registro e inicio de sesión de cliente, añadir al carrito, pedido, acceso al back-office con un administrador, y que llega el correo del pedido.

GitHub Pages, Netlify y Cloudflare Pages solo sirven archivos estáticos y no ejecutan PHP, por lo que no valen para esta versión. El hosting ya redirige `http` a `https`.

### Versión de los archivos (caché del navegador)

`index.html` carga los scripts y la hoja de estilos con un parámetro de versión (`?v=...`). Hay **dos valores que deben ser siempre idénticos**: la constante `ASSET_VERSION` del script de `index.html` y el `?v=` del enlace a `styles.css`. Cada vez que se suba al hosting un cambio en cualquier `.js` o en `styles.css`, hay que cambiar ambos al mismo valor nuevo (por ejemplo, `20261005-2` → `20261005-4`). No se debe reutilizar un valor ya publicado. (Versión desplegada actualmente: `20261005-4`.)

## Estructura del proyecto

```
SolInfEmpresa_Grupo9-JP/
├── index.html              Carga los componentes y los scripts en orden
├── app.js                  Estado global, referencias al DOM, eventos y arranque
├── styles.css              Diseño responsive
├── .htaccess               Bloqueos de acceso y cabeceras de seguridad (ver "Seguridad")
├── DEPLOYAR.md             Guía de despliegue (solo para el equipo)
├── config.mail.example.php Plantilla heredada de la configuración SMTP
├── components/             Fragmentos HTML de cada sección
│   ├── header.html         Cabecera, menú móvil, acceso/cuenta y botón flotante del carrito
│   ├── hero.html           Portada
│   ├── trust.html          Garantías del prototipo
│   ├── catalog.html        Buscador, filtros y rejilla de productos
│   ├── experience.html     "Cómo funciona"
│   ├── traceability.html   Vista previa del registro de eventos
│   ├── support.html        Formulario de soporte
│   ├── footer.html         Pie de página
│   ├── cart.html           Panel lateral del carrito
│   └── dialogs.html        Acceso/registro, ficha de producto, checkout, éxito y back-office
├── img/products/           Fotos de los productos (una por juego y variante, .jpg)
├── js/
│   ├── data/products.js    Catálogo estático: visuales (`PRODUCT_VISUALS`) y respaldo (`STATIC_PRODUCTS`)
│   ├── utils.js            Cliente de la API (CSRF), readStorage(), persist(), safeText(), formatPrice()
│   ├── auth.js             Sesión, login, registro, cierre de sesión y formularios de acceso
│   ├── events.js           logEvent(), vista previa, exportación y envío de eventos a la API
│   ├── catalog.js          getVariants(), getProduct(), filtrado y renderizado del catálogo
│   ├── cart.js             Carrito por usuario, totales, miniaturas y botón flotante
│   ├── checkout.js         Checkout, validación y creación del pedido (API)
│   ├── support.js          Incidencias de soporte (API)
│   └── admin.js            Back-office (pedidos, eventos y modelo de datos)
├── api/
│   ├── lib/                bootstrap.php (config, sesión, CSRF, roles), repository.php (acceso a datos), mail.php (SMTP)
│   ├── auth/               login.php, logout.php, register.php, session.php
│   ├── products.php        Catálogo desde la base de datos
│   ├── orders/             create.php (crear pedido), my-orders.php (pedidos del usuario)
│   ├── admin/              orders.php, events.php (solo administrador)
│   ├── events/log.php      Registro de eventos de la interfaz
│   ├── support.php         Alta de incidencias
│   ├── health.php          Comprobación de la conexión a la base de datos
│   └── config/             config.example.php (plantilla); config.php real solo en el servidor
├── database/
│   ├── juegos_y_puzles.sql Esquema y datos iniciales
│   └── migraciones/        Cambios opcionales del esquema (ver "Mejoras propuestas")
└── tests/                  Prueba virtual end-to-end (virtual_e2e.py, mock-db.json)
```

> `enviar-pedido.php` y `enviar-incidencia.php` pertenecen a la versión anterior (correo sin base de datos). Ya no los usa la web y se han eliminado del hosting; si siguen en el repositorio, pueden borrarse.

**Orden de carga** (definido en `index.html`): `products.js` → `utils.js` → `auth.js` → *(espera a la sesión, `authReady`)* → carga del catálogo desde `api/products.php` (con respaldo estático si la API falla) → `events.js` → `catalog.js` → `cart.js` → `checkout.js` → `support.js` → `admin.js` → `app.js`. Los scripts comparten el ámbito global, así que **no se puede declarar dos veces la misma `const`/`let` en archivos distintos** (provoca un `SyntaxError` y la web deja de cargar). Los módulos usan funciones globales y `state`/`refs` (definidos en `app.js`) solo al ejecutarse, nunca al cargarse.

## Usuarios, roles y datos de prueba

- **Hay que iniciar sesión** para añadir productos al carrito y hacer el pedido. El registro crea cuentas con rol `cliente` (nombre y apellidos con mayúscula inicial, correo con `@` que termine en `.com` y contraseña que empiece por mayúscula, con al menos 6 caracteres y un número); el rol `administrador` da acceso al back-office ("Panel de evidencias").
- Las contraseñas se guardan con `password_hash()` y se comprueban con `password_verify()`. Los administradores se crean directamente en la base de datos.
- **Las credenciales de las cuentas (administrador, demostración) no se publican en este archivo ni en GitHub.** Se entregan por separado para la evaluación.
- En el checkout deben introducirse datos ficticios. Ejemplo: nombre `Ada Lovelace`, dirección `C/ Ejemplo, 42`, código postal `28001`, ciudad `Madrid`. Promoción opcional: `YUZU10` (10 % de descuento simulado).

## Flujo funcional demostrable

1. Navegar o filtrar el catálogo (productos reales de juegos de mesa y puzzles) por **categoría** (Estrategia, Familiar, Cooperativo, Puzzle), **jugadores** (1, 2-3 o 4+), **dificultad** (Iniciación, Media, Experta) y **búsqueda de texto**. En móvil, el panel de filtros se pliega con el botón "Filtros". Si una imagen falta, la tarjeta muestra el diseño de color con el símbolo del juego.
2. Abrir una ficha (`product.viewed`). Algunos juegos tienen **variantes** (ediciones) con flechas y puntos para cambiar entre ellas.
3. Iniciar sesión o registrarse; los formularios se limpian al cerrar el diálogo, al entrar y al cerrar sesión.
4. Añadir productos al carrito (`cart.item_added`). El carrito es **por usuario** y se guarda en `localStorage`. Se abre desde la cabecera o desde el botón flotante.
5. Abrir el checkout (`checkout.started`): IVA del 21 %, transporte gratuito desde 70 EUR y descuento `YUZU10`.
6. Confirmar el pedido: el servidor valida los datos, **recalcula los importes con los precios de la base de datos**, comprueba y **descuenta el stock** dentro de una transacción, crea el pedido con código `PF-AAAA-XXXXXXXX`, simula el pago (método de prueba) y registra los eventos `order.created` y `payment.simulated`. Tras responder al navegador, el servidor envía un **resumen del pedido por correo** al buzón configurado (si el SMTP falla, el pedido se guarda igualmente y el error solo queda en el log del servidor).
7. Consultar "Mis pedidos" (cliente) o el "Panel de evidencias" (administrador): pedidos de todos los usuarios y los últimos 500 eventos, con exportación de eventos a JSON.
8. Enviar el formulario de soporte (`support.requested`): la incidencia se guarda en la tabla `incidencias`.

## Catálogo

El catálogo se lee de la base de datos (`api/products.php`, tablas `productos`, `categorias`, `origenes` y relaciones). El archivo `js/data/products.js` aporta solo la parte visual (colores, símbolo e imagen por producto, `PRODUCT_VISUALS`) y un **catálogo estático de respaldo** (`STATIC_PRODUCTS`) que se usa si la API no responde. Hay 12 referencias base de 6 países de diseño, más variantes (2 de Ajedrez y 2 de Catan), con una ficha por variante.

| Categoría | Referencias |
| --- | --- |
| Estrategia | 5 (Ajedrez, Shogi, Catan, Let's Catch the Lion!, Oshi) |
| Familiar | 4 (Virus, Carcassonne, Dixit, Kabuto Sumo) |
| Cooperativo | 2 (Pandemic, Tragedy Looper) |
| Puzzle | 1 (Rush Hour) |

Reglas de datos al añadir o cambiar productos:

- El precio y el stock **solo cuentan en la base de datos**; el servidor ignora los importes que envía el navegador. Si se cambia un precio, hay que actualizarlo también en el catálogo estático de respaldo para que coincidan.
- Un producto nuevo necesita su fila en `productos` (con categoría y origen) y, para que se vea bien, su entrada en `PRODUCT_VISUALS` (`tone`, `text`, `symbol`, `image`).
- El valor de la categoría debe coincidir **exactamente** con el `data-value` de los botones de `components/catalog.html` (p. ej. `Puzzle`, en singular).
- Los filtros de jugadores se calculan en `api/products.php` a partir de los mínimos y máximos de jugadores: `solo` (admite 1), `small` (admite 2-3) y `group` (admite 4 o más). Un juego de 1 a 4 jugadores aparece en los tres filtros.
- `difficulty` debe ser `Iniciación`, `Media` o `Experta`.
- Si cambia el número de referencias o de países, actualizar a mano los datos del hero (`components/hero.html`).
- El campo `image` es una ruta relativa a `index.html` (p. ej. `img/products/ajedrez.jpg`). Es opcional; sin ella la tarjeta usa el diseño de color, por lo que `tone`, `text` y `symbol` no deben borrarse.

### Variantes de producto

Una variante es un producto de la base de datos con `producto_padre_id` apuntando al producto base; hereda lo que no cambia. `getVariants(product)` (`js/catalog.js`) devuelve el producto base y sus variantes, y `getProduct(id)` encuentra cualquiera por `id`. En el catálogo solo aparece la tarjeta del producto base; la ficha (`openProduct(productId, index)` en `app.js`) permite pasar de una edición a otra (acción `show-variant`). Cada variante se añade al carrito, se cobra y se registra con su propio `id`. Variantes actuales: Ajedrez (caballeros templarios y premium) y Catan (Navegantes y Piratas y Exploradores).

### Imágenes de productos

Están en `img/products/`, en `.jpg`, con el nombre del `id` del producto (`ajedrez.jpg`, `rush-hour.jpg`...). Se recomiendan imágenes cuadradas, fondo blanco, unos 800×800 px y menos de 150 KB. Se muestran en el catálogo (foto entera sobre fondo blanco), en la ficha (panel izquierdo) y como miniatura de 56×56 px en el carrito. Si una imagen no carga, un `onerror` la retira y se ve el diseño de color.

## Persistencia y modelo de datos

La información importante vive en **MySQL**; en el navegador solo queda el carrito.

| Dónde | Qué guarda |
| --- | --- |
| Base de datos | usuarios, productos y stock, pedidos, líneas, pagos simulados, direcciones de pedido, eventos e incidencias |
| `localStorage` | carrito por usuario (clave `planetaFicha.cart.user.v3.<id de usuario>`) |
| Cookie de sesión | identificador de sesión PHP (`HttpOnly`, `SameSite=Lax`, `Secure` en HTTPS) |

### Base de datos (`database/juegos_y_puzles.sql`)

Tablas: `productos`, `categorias`, `producto_categoria`, `origenes`, `producto_origen`, `usuarios` (con `apellidos` y `rol`), `pedidos`, `lineas_pedido`, `pagos`, `direcciones_pedido`, `eventos` e `incidencias`. Detalles de funcionamiento:

- **Stock:** al crear un pedido se descuenta con `UPDATE productos SET stock = stock - ? WHERE id = ? AND stock >= ?` dentro de una transacción; si no hay stock suficiente, el pedido se rechaza completo y no se crea nada. Aún no se muestra el stock en la tienda.
- **Eventos:** el administrador ve los últimos 500 (`LIMIT 500`). No hay política de retención ni índice sobre `fecha_evento`, por lo que la tabla crece sin límite (ver "Mejoras propuestas").
- **Incidencias:** se guardan en `incidencias`, pero todavía no se listan en el back-office.
- La estadística "Usuarios" del back-office cuenta usuarios con pedidos, no todos los registrados.

## API y flujo de seguridad de la aplicación

| Endpoint | Método | Acceso |
| --- | --- | --- |
| `api/auth/session.php` | GET | público (devuelve usuario y token CSRF) |
| `api/auth/login.php`, `register.php`, `logout.php` | POST | público / sesión |
| `api/products.php` | GET | público |
| `api/orders/create.php` | POST | cliente con sesión |
| `api/orders/my-orders.php` | GET | cliente con sesión |
| `api/support.php` | POST | cliente con sesión |
| `api/events/log.php` | POST | público (eventos de la interfaz) |
| `api/admin/orders.php`, `api/admin/events.php` | GET | solo administrador |
| `api/health.php` | GET | público (comprobación de la base de datos) |

Todas las respuestas son JSON. Las peticiones que modifican datos exigen el token **CSRF** en la cabecera `X-CSRF-Token` y comprueban el origen (`sameOrigin`). El token se renueva al iniciar y cerrar sesión, y el identificador de sesión se regenera al entrar (`session_regenerate_id`).

## Seguridad

- **Importes y stock en el servidor:** subtotal, descuento, IVA y envío se recalculan con los precios de la base de datos; lo que envíe el navegador se ignora.
- **Contraseñas y sesiones:** hash con `password_hash()`, cookie de sesión `HttpOnly`/`SameSite=Lax`/`Secure`, CSRF y roles comprobados en cada endpoint (`requireAuth`, `requireAdmin`).
- **Consultas preparadas (PDO)** en todo el acceso a datos y escape de la salida con `safeText()` en el HTML.
- **`.htaccess`:** bloquea desde el navegador (403) `config.php`, `config.mail.php`, `.env`, `health-debug.php` y los archivos `*.md`, `*.sql` y `*.py`; añade las cabeceras `X-Content-Type-Options`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy` y una `Content-Security-Policy`. Las carpetas `api/lib`, `api/config`, `database` y `tests` tienen además su propio `.htaccess` con `Require all denied`. Estos bloqueos solo afectan al acceso HTTP: PHP sigue pudiendo leer esos archivos.
- **Errores no visibles:** `display_errors` está desactivado y los errores van solo al log del servidor, para no filtrar rutas ni datos.
- **Credenciales fuera de GitHub:** `api/config/config.php` (contraseña de MySQL y de SMTP) existe solo en el servidor. En el repositorio solo está `config.example.php`, y `.gitignore` excluye `api/config/config.php`, `config.mail.php` y `.env`. Si alguna vez se subió una contraseña real, hay que cambiarla.
- **Correo SMTP cifrado:** puerto 465 con TLS directo; otros puertos con STARTTLS obligatorio. Se verifica el certificado y el nombre del host (el `host` debe coincidir con el del certificado). Si el servidor no ofrece STARTTLS, el envío se aborta antes de enviar usuario o contraseña. Las credenciales viajan en base64 solo **dentro** del canal ya cifrado; base64 no es cifrado.
- **Antiabuso:** campo señuelo oculto en los formularios y comprobación de origen. No hay todavía límite de intentos de login (ver "Mejoras propuestas").
- **Datos de prueba:** las cuentas de demostración que venían con la base de datos se han neutralizado y la cuenta de administrador de la entrega es propia del equipo; ninguna contraseña figura en el repositorio.

## Instrumentación de eventos

Los eventos se generan en `logEvent()` (`js/events.js`), se envían a `api/events/log.php` y se guardan en la tabla `eventos` con identificador, marca temporal, origen y payload JSON. El administrador los consulta y exporta a JSON desde el back-office; en una segunda tarea podrían consumirse desde un endpoint de integración, una cola o un ETL hacia un ERP/CRM o analítica.

Eventos incluidos: `product.viewed`, `cart.item_added`, `checkout.started`, `order.created`, `payment.simulated` y `support.requested`.

## Pruebas automáticas

Desde la raíz del proyecto:

```bash
python tests/virtual_e2e.py
```

Levanta el servidor integrado de PHP con el adaptador `mock` (archivo JSON en lugar de MySQL, con la misma API) y comprueba sesión y CSRF, protección del back-office, login y roles, registro, pedidos separados por usuario, cálculo en servidor, descuento de stock, eventos e incidencias, carga de `index.html` y componentes, e integración front-end/API. Algunas comprobaciones están ligadas al estado de `mock-db.json` y a la versión de caché concreta de cada entrega, por lo que pueden fallar tras actualizar `ASSET_VERSION` o la configuración sin que la web esté rota. Nunca debe usarse la configuración real para probar.

## Arquitectura y decisiones

- **Interfaz:** `index.html` es un armazón que carga en tiempo de ejecución los fragmentos de `components/`; `styles.css` contiene el diseño responsive. Un `[hidden]{display:none !important}` global garantiza que el atributo `hidden` oculte también elementos con `display` propio (botones).
- **Comportamiento:** `app.js` define `state`, `refs`, toasts, ficha de producto y la delegación de clics (`data-action`).
- **Lógica de negocio:** en el servidor (`api/lib/repository.php`: pedidos, stock, usuarios, eventos) y, en el navegador, por módulos de `js/`.
- **Acceso a datos:** clase `PFDatabase` con PDO (MySQL) y un adaptador `mock` para pruebas.
- **Alternativas consideradas:** un backend Node/Express con SQLite; se eligió PHP + MySQL por ser lo que ofrece el hosting contratado.

## Limitaciones conocidas

- El pago, el transporte y el envío son simulados; no hay pasarela de pago ni proveedor logístico.
- El carrito está en `localStorage` (por navegador): no se sincroniza entre dispositivos.
- Los precios del catálogo de respaldo (`products.js`) deben mantenerse iguales a mano a los de la base de datos; la base de datos manda.
- No hay recuperación de contraseña, verificación del correo ni límite de intentos de acceso.
- Los eventos crecen sin límite y las incidencias no se ven aún en el back-office.
- Los datos de cliente son solo de demostración y nunca deben ser reales.
- Es necesario ejecutar la web desde un servidor con PHP y MySQL; no funciona abriendo `index.html` directamente.

## Historial de cambios

### Versión inicial

Desarrollo en un único bloque: `index.html` con todas las vistas, `styles.css`, `app.js` con toda la lógica y el catálogo incluido, sin botón flotante del carrito.

### Evolución posterior

1. **Modularización / factorización del código.** La interfaz se separa en `components/*.html` y la lógica en `js/`. El catálogo pasa a `js/data/products.js`.
2. **Botón flotante del carrito.** Botón fijo en `components/header.html` con contador sincronizado (`IntersectionObserver` en `initFloatingCart()`), respetando el área segura de móviles y `prefers-reduced-motion`.
3. **Catálogo con productos reales.** Sustitución de los productos de ejemplo por juegos y puzzles reales.
4. **Revisión completa del código** (fase 3). Comprobación de sintaxis, cruce entre HTML, JS, CSS y datos, y revisión manual de la lógica.
5. **Imágenes en el catálogo y en la ficha.** Carpeta `img/products/`, campo `image` y rediseño de la tarjeta (foto arriba, título en la franja de color).
6. **Miniatura de imagen en el carrito** (56×56 px, decorativa).
7. **Aviso de prototipo más visible** (`.prototype-strip`: texto de 11 a 14 px y mayor altura; en móvil, de 9 a 11 px).
8. **Variantes de producto** (`getVariants()`, `getProduct()`, `show-variant`): dos de Ajedrez y dos de Catan.
9. **Carrito en cookie** (versión anterior; sustituido más tarde por el carrito por usuario en `localStorage`).
10. **Envío de pedidos e incidencias por correo (PHP)** con `enviar-pedido.php`, `enviar-incidencia.php` y `config.mail.php` (versión anterior, sustituida por la API; ver punto 14).
11. **Protección de `config.mail.php` con `.htaccess`** (comprobado: 403 desde el navegador).
12. **Cifrado SMTP:** TLS directo (465) o STARTTLS, con verificación del certificado y sin credenciales en claro.
13. **Control de caché al publicar** con `ASSET_VERSION` y `?v=`.
14. **Back-end con base de datos, login y roles** (trabajo del equipo). API PHP en `api/`, MySQL con las tablas descritas arriba, registro e inicio de sesión de clientes y administradores, carrito por usuario, pedidos con stock transaccional, eventos e incidencias en base de datos, back-office restringido a administradores, catálogo servido por `api/products.php` con respaldo estático y prueba virtual `tests/virtual_e2e.py`.

### Correcciones y mejoras posteriores (5 de octubre de 2026)

**Errores corregidos**

- **Formularios de acceso con datos anteriores.** Los campos del login y del registro conservaban lo escrito antes (incluido un correo o contraseña ya usados). `js/auth.js` incorpora `resetAuthForms()`, que limpia ambos formularios al cerrar el diálogo, tras iniciar sesión, tras registrarse y al cerrar sesión.
- **Filtro de jugadores incorrecto** (p. ej. Rush Hour no salía con "1 jugador"). `api/products.php` calcula ahora `solo`, `small` y `group` según el mínimo y máximo de jugadores de cada juego.
- **Formulario de incidencias roto.** `components/support.html` había perdido su estructura y estilos; se restauran las clases `support-section`, `support-intro`, `support-form`, `support-honeypot` y `support-feedback`, con su CSS.
- **Botón del back-office visible a todos.** `.button{display:inline-flex}` anulaba el atributo `hidden`; se añade la regla global `[hidden]{display:none !important}` en `styles.css`.
- **Pie de página** centrado de nuevo (rejilla de tres columnas con marca a la izquierda, texto central y botón a la derecha; en móvil, una columna).

**Seguridad y despliegue**

- Nuevo `.htaccess` en la raíz (bloqueo de `config.php`, `config.mail.php`, `.env`, `health-debug.php`, `*.md`, `*.sql`, `*.py` y cabeceras de seguridad, con la CSP probada sin infracciones) y `api/lib/.htaccess` con `Require all denied`.
- `display_errors` desactivado y `log_errors` activado en `api/lib/bootstrap.php`.
- Eliminados del hosting `api/health-debug.php`, `enviar-pedido.php` y `enviar-incidencia.php`.
- Cuentas de demostración neutralizadas, cuenta de administrador propia del equipo y **contraseña de MySQL rotada**; `config.php` editado solo en el servidor.
- `.gitignore` con `api/config/config.php`, `config.mail.php` y `.env`.
- `ASSET_VERSION` y `?v=` actualizados a `20261005-4`.

**Funcionalidad**

- **Aviso por correo de cada pedido.** `api/lib/mail.php` incorpora `pfNotifyOrder()`, invocada desde `api/orders/create.php` tras guardar el pedido: responde primero al navegador y después envía por SMTP un resumen en texto (código, cliente, líneas, totales y método de pago). Si el correo falla, el pedido no se ve afectado y el error solo se registra en el servidor.

**Pendiente (decisión del equipo)**

- Se decidió mantener la web hasta este punto. Quedan propuestas, sin implementar, en "Mejoras propuestas".

## Mejoras propuestas (no implementadas)

- **Límite de intentos:** bloqueos temporales (ventana deslizante) para login, registro, incidencias, pedidos y eventos, con tabla `limites_uso` e índice sobre `eventos.fecha_evento` (propuesta preparada en `database/migraciones/002_limites_y_eventos.sql`; el código asociado no está en la web).
- **Registro:** reglas más estrictas de correo y contraseña.
- **Tienda y back-office:** mostrar el stock en la ficha, listar las incidencias y retener/depurar eventos antiguos.
- **Pasarela de pago:** valorar una integración de pruebas (sandbox); hoy el pago es solo simulado.
- Erratas de `products.js` (`duartion` en las variantes en lugar de `duration`).

## Declaración de punto de partida y uso de IA

Punto de partida: desarrollo nuevo, sin plantilla ni repositorio de terceros. La interfaz, los datos ficticios y el código se crearon con apoyo de IA generativa y requieren revisión, pruebas y comprensión del grupo antes de una entrega académica.

Para el anexo de IA de la memoria, el grupo debe completar con honestidad: herramienta utilizada, tareas asistidas, fragmentos relevantes, errores detectados, cambios introducidos por el equipo y método de validación.

### Registro de las sesiones de revisión con IA (Claude)

- **Tareas asistidas:** botón flotante del carrito; corrección del filtrado del catálogo; revisión completa del código; imágenes de producto; aviso de prototipo; variantes; carrito en cookie; integración de los endpoints PHP y del correo; protección de `config.mail.php`; cifrado TLS/STARTTLS; control de caché; **diagnóstico y corrección de los cuatro errores del proyecto con base de datos y login; recentrado del pie de página; auditoría de ciberseguridad, UX y base de datos; endurecimiento (`.htaccess`, errores ocultos, archivos de depuración eliminados, credenciales y `.gitignore`); aviso por correo de cada pedido; actualización de este README.**
- **Errores detectados por la IA:** filtro "1 jugador" sin productos; erratas en los datos; los problemas de las revisiones anteriores; y, en la última fase, los cuatro errores indicados arriba, el atributo `hidden` anulado por el CSS, la exposición de archivos de configuración/depuración y la visualización de errores de PHP.
- **Cambios introducidos por el equipo:** productos reales y fotos; el back-end (API, base de datos, login y roles); contratación y configuración del hosting; subida de archivos, rotación de contraseñas y pruebas en la web publicada (incluidos los 403 de los archivos protegidos, la redirección a HTTPS y la recepción del correo de pedido).
- **Método de validación empleado:** comprobación de sintaxis y cruce entre archivos; los errores se reprodujeron antes y después de corregirlos con un navegador automatizado (Chromium); la CSP se probó sin infracciones; el envío de correo se probó contra servidores SMTP de prueba (TLS directo, STARTTLS, rechazo de conexiones sin cifrar y de certificados no válidos); la prueba `tests/virtual_e2e.py` se ejecutó con el adaptador `mock`; y el equipo verificó cada cambio en la web real.

## Problemas pendientes

Marcar cada punto con `[x]` cuando se resuelva. Los puntos A1-A4 de la revisión anterior se han reevaluado con la web actual y siguen pendientes de confirmar.

### A. Posibles bugs de la interfaz (revisar)

- [ ] **A1. El checkout se cierra al hacer clic en su margen** (`app.js`): cerrar solo si el clic queda fuera del rectángulo del diálogo (`getBoundingClientRect()`).
- [ ] **A2. `persist()` sin `try/catch`** (`js/utils.js`): puede lanzar excepción si `localStorage` está lleno o bloqueado; validar también en `readStorage()` que el valor es un array.

### B. Accesibilidad

- [ ] **B1. Carrito lateral:** cerrado sigue enfocable con el teclado; usar `inert`, cerrar con Escape y gestionar el foco.
- [ ] **B2. Botones del carrito:** dos botones con la misma etiqueta "Abrir carrito"; incluir el número de artículos en `aria-label`.

### C. Detalles menores

- [ ] **C1.** `promoCode` guarda el texto escrito aunque no sea exacto; los importes deberían redondearse a 2 decimales.
- [ ] **C2.** Textos del hero ("12 referencias", "6 países") escritos a mano; unificar el contador del catálogo ("1 referencia encontrada" / "N referencias seleccionadas").
- [ ] **C3. Back-office:** las tarjetas de "Modelo de datos" no reflejan todos los campos reales.

### D. Otras tareas pendientes

- [ ] Probar en navegador cada filtro, el flujo completo de compra y la vista móvil tras cada cambio.
- [ ] Comprobar que ningún `config.php`/`config.mail.php` con datos reales **está** en GitHub ni en su historial (si lo estuvo, cambiar la contraseña).
- [ ] Decidir con el equipo si se adopta alguna de las "Mejoras propuestas".
- [ ] Completar el anexo de IA de la memoria.
- [ ] Anotar en la memoria la procedencia y licencia de las fotos de `img/products/` (las portadas de juegos suelen tener derechos de autor; al ser un prototipo sin fines comerciales, basta con citar la fuente).
