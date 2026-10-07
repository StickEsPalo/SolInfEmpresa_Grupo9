# PlanetaFicha - prototipo de eCommerce de importación

PlanetaFicha es un prototipo académico de canal digital de venta para un comercio de juegos de mesa y puzzles de diseño europeo y asiático. No hay actividad comercial ni pagos reales: el pago es simulado o se hace con **PayPal en modo Sandbox** (dinero ficticio), y los datos de cliente deben ser siempre ficticios. Tampoco deben introducirse cuentas de PayPal reales.

La web tiene un **front-end estático** (HTML, CSS y JavaScript sin compilación) y un **back-end PHP + MySQL/MariaDB** con API propia, cuentas de usuario con sesión (roles `cliente` y `administrador`), pedidos y eventos guardados en base de datos, pago de pruebas con PayPal Sandbox, back-office protegido y aviso por correo de cada pedido nuevo. La interfaz está en español e inglés. Está publicada en un hosting con PHP y HTTPS (DonDominio).

## Puesta en marcha

### Requisitos

- Servidor HTTP con **PHP 8**, **HTTPS** y las extensiones `pdo_mysql` y `curl`, y una base de datos MySQL/MariaDB.
- Una app de **PayPal Developer en modo Sandbox** (Client ID y Secret) para el pago con PayPal. Ver "Pago con PayPal (Sandbox)".
- Conexión a internet en el navegador (tipografías de Google Fonts y SDK de PayPal).

`index.html` carga los componentes (`components/*.html`) con `fetch()`, así que **no funciona abriéndolo con doble clic** (`file://`): hay que servirlo por HTTP.

### Entorno local

```powershell
cd SolInfEmpresa_Grupo9-JP
php -S localhost:8080
```

Live Server de VS Code y `python -m http.server` **no ejecutan PHP**: sirven solo para revisar la parte visual (el catálogo usa entonces los productos estáticos de respaldo, pero no hay login, pedidos ni back-office). Para probar la API sin MySQL puede usarse el adaptador `mock` (ver "Pruebas automáticas"). Para probar PayPal en local, la extensión `curl` debe estar activada en `php.ini` (`extension=curl`).

### Despliegue en el hosting

Pasos resumidos (el detalle está en `DEPLOYAR.md`; ese archivo es solo para el equipo y **no debe subirse al hosting**):

1. Crear una base de datos MySQL/MariaDB y un usuario con permisos sobre ella; importar `database/juegos_y_puzles.sql`.
2. Copiar `api/config/config.example.php` a `api/config/config.php` y rellenarlo **directamente en el servidor** (dominio, MySQL y bloque `paypal` con el Client ID y el Secret de Sandbox). Para SMTP, seguir las instrucciones de “Correo corporativo” más abajo; nunca añadir la copia real al repositorio.
3. Subir el contenido de la carpeta respetando las carpetas (`api/`, `components/`, `js/`, `img/`, `database/`). En DonDominio se hace con el cliente web FTP (Monsta FTP) del panel, dentro de la carpeta `public`. Ver "Archivos para el hosting".
4. Abrir `https://TU-DOMINIO/api/health.php`: con MySQL conectado devuelve JSON con `"ok":true`. Abrir también `https://TU-DOMINIO/api/paypal/settings.php`: con PayPal configurado devuelve `"enabled":true`.
5. Probar a mano: registro e inicio de sesión de cliente, añadir al carrito, pedido con pago simulado, pedido con PayPal (cuenta Personal de Sandbox), cambio de idioma, acceso al back-office con un administrador, y comprobar el aviso de correo de pedido e incidencia.

GitHub Pages, Netlify y Cloudflare Pages solo sirven archivos estáticos y no ejecutan PHP, por lo que no valen para esta versión. El hosting ya redirige `http` a `https`.

### Archivos para el hosting

La página necesita `index.html`, `styles.css`, `app.js`, `components/`, `js/`, `img/`, `api/` y el `.htaccess` de la raíz. También necesita `api/config/config.php`, creado de forma privada en el servidor a partir de la plantilla.

Conserva `database/juegos_y_puzles.sql`, `tests/`, `README.md`, `DEPLOYAR.md` y `.gitignore` en tu copia de trabajo. No son necesarios para servir las páginas: el SQL se importa en la base de datos, las pruebas se ejecutan aparte y los Markdown son documentación. Si el servidor ya tiene la base de datos inicializada, no hace falta subir la carpeta `database/`.

No borres los archivos `.htaccess` de la raíz ni de `api/`: restringen el acceso web a archivos internos. **No bloquees la carpeta `api/paypal/`**: la interfaz necesita llamar a sus endpoints (están protegidos por sesión y CSRF). Conserva también `api/config/config.example.php` como plantilla, aunque no es la configuración que usa la web.

### Versión de los archivos (caché del navegador)

`index.html` carga los scripts y la hoja de estilos con un parámetro de versión (`?v=...`). Hay **dos valores que deben ser siempre idénticos**: la constante `ASSET_VERSION` del script de `index.html` y el `?v=` del enlace a `styles.css`. Cada vez que se suba al hosting un cambio en cualquier `.js` o en `styles.css`, hay que cambiar ambos al mismo valor nuevo. No se debe reutilizar un valor ya publicado. Esta carpeta queda preparada con `20261007-2`; al publicar estos archivos, el hosting debe usar el mismo identificador.

## Estructura del proyecto

```
SolInfEmpresa_Grupo9-JP/
├── index.html              Carga los componentes y los scripts en orden
├── app.js                  Estado global, referencias al DOM, eventos y arranque
├── styles.css              Diseño responsive
├── .htaccess               Bloqueos de acceso y cabeceras de seguridad (ver "Seguridad")
├── .gitignore              Exclusión de configuraciones con credenciales
├── README.md               Descripción del proyecto
├── DEPLOYAR.md             Guía de despliegue (solo para el equipo)
├── components/             Fragmentos HTML de cada sección
│   ├── header.html         Cabecera, botón de idioma, menú móvil, acceso/cuenta y botón flotante del carrito
│   ├── hero.html           Portada
│   ├── trust.html          Garantías del prototipo
│   ├── catalog.html        Buscador, filtros y rejilla de productos
│   ├── experience.html     "Cómo funciona"
│   ├── traceability.html   Vista previa del registro de eventos
│   ├── support.html        Formulario de soporte
│   ├── footer.html         Pie de página
│   ├── cart.html           Panel lateral del carrito
│   └── dialogs.html        Acceso/registro, ficha de producto, checkout (con botón de PayPal), éxito y back-office
├── img/products/           Fotos de los productos (una por juego y variante, .jpg)
├── js/
│   ├── i18n.js             Selector ES/EN (bandera de España o de EE. UU.), traducciones y preferencia de idioma guardada
│   ├── data/products.js    Catálogo estático: visuales (`PRODUCT_VISUALS`) y respaldo (`STATIC_PRODUCTS`)
│   ├── utils.js            Cliente de la API (CSRF), readStorage(), persist(), safeText(), formatPrice() y currentCurrency()
│   ├── auth.js             Sesión, login, registro, cierre de sesión y formularios de acceso
│   ├── events.js           logEvent(), vista previa, exportación y envío de eventos a la API
│   ├── catalog.js          getVariants(), getProduct(), filtrado y renderizado del catálogo
│   ├── cart.js             Carrito por usuario, totales, miniaturas y botón flotante
│   ├── checkout.js         Checkout, validación, creación del pedido (API) y botones de PayPal
│   ├── support.js          Incidencias de soporte (API)
│   └── admin.js            Back-office (pedidos, eventos y modelo de datos)
├── api/
│   ├── lib/                bootstrap.php (config, sesión, CSRF, roles), repository.php (acceso a datos), mail.php (SMTP), paypal.php (cliente de la API de PayPal)
│   ├── auth/               login.php, logout.php, register.php, session.php
│   ├── products.php        Catálogo desde la base de datos
│   ├── orders/             create.php (crear pedido con pago simulado), my-orders.php (pedidos del usuario)
│   ├── paypal/             settings.php (Client ID público), create-order.php (crear pedido en PayPal), capture-order.php (cobrar y guardar)
│   ├── admin/              orders.php, events.php (solo administrador)
│   ├── events/log.php      Registro de eventos de la interfaz
│   ├── support.php         Alta de incidencias
│   ├── health.php          Comprobación de la conexión a la base de datos
│   └── config/             config.example.php (plantilla); config.php real solo en el servidor
├── database/
│   └── juegos_y_puzles.sql Esquema y datos iniciales
└── tests/                  Prueba virtual end-to-end (virtual_e2e.py, mock-db.json)
```

> `enviar-pedido.php` y `enviar-incidencia.php` pertenecen a la versión anterior (correo sin base de datos). Ya no los usa la web y se han eliminado del hosting; si siguen en el repositorio, pueden borrarse.

**Orden de carga** (definido en `index.html`): `i18n.js` → `products.js` → `utils.js` → `auth.js` → *(espera a la sesión, `authReady`)* → carga del catálogo desde `api/products.php` (con respaldo estático si la API falla) → `events.js` → `catalog.js` → `cart.js` → `checkout.js` → `support.js` → `admin.js` → `app.js`. Los scripts comparten el ámbito global, así que **no se puede declarar dos veces la misma `const`/`let` en archivos distintos** (provoca un `SyntaxError` y la web deja de cargar). Los módulos usan funciones globales y `state`/`refs` (definidos en `app.js`) solo al ejecutarse, nunca al cargarse. `i18n.js` se carga primero porque `utils.js` usa su variable `currentLanguage` para decidir la moneda. El SDK de PayPal no se carga al inicio: `checkout.js` lo descarga solo cuando se elige PayPal como método de pago.

## Usuarios, roles y datos de prueba

- **Hay que iniciar sesión** para añadir productos al carrito y hacer el pedido. El registro crea cuentas con rol `cliente` (nombre y apellidos con mayúscula inicial, correo con `@` que termine en `.com` y contraseña que empiece por mayúscula, con al menos 6 caracteres y un número); el rol `administrador` da acceso al back-office ("Panel de evidencias").
- Las contraseñas se guardan con `password_hash()` y se comprueban con `password_verify()`. Los administradores se crean directamente en la base de datos.

### Cuentas de prueba

| Tipo | Acceso | Qué permite |
| --- | --- | --- |
| **Usuario de prueba (cliente)** | Creación de cuentas **habilitada**: cualquier persona puede registrarse desde "Iniciar sesión" → "Crear cuenta" (con las reglas de registro indicadas arriba) | Añadir al carrito, hacer pedidos de demostración, enviar incidencias y consultar "Mis pedidos" |
| **Usuario de prueba (administrador / desarrollador)** | Correo: `admin@example.com` Contraseña: `admin123` | Acceso **solo de consulta** al funcionamiento del back-office ("Panel de evidencias": pedidos y eventos). No permite editar datos, ni acceder al código, a los ajustes de la web, de la base de datos o del hosting, ni ningún otro permiso |
| **Comprador de PayPal Sandbox (cuenta Personal)** | Correo: `sb-...@personal.example.com` Contraseña: *(completar con la cuenta Personal de Sandbox)* | Iniciar sesión en la ventana de PayPal y aprobar pagos de prueba. Es una cuenta ficticia del entorno Sandbox, sin dinero real |

Estas credenciales de administrador son de uso público, solo para la evaluación del prototipo. No son las cuentas del hosting, de la base de datos ni del correo corporativo, cuyas contraseñas nunca se publican. Tampoco se publican el Secret de la app de PayPal, la cuenta Business de Sandbox ni la cuenta real de PayPal Developer.
- En el checkout deben introducirse datos ficticios. Ejemplo: nombre `Ada Lovelace`, dirección `C/ Ejemplo, 42`, código postal `28001`, ciudad `Madrid`. Promoción opcional: `YUZU10` (10 % de descuento simulado).

## Correo corporativo

Los endpoints vigentes son `api/orders/create.php`, `api/paypal/capture-order.php` y `api/support.php`. Los tres comparten el envío SMTP de `api/lib/mail.php`, guardan primero el pedido/incidencia en MySQL y después intentan notificar al buzón `correocorporativo@planetaficha.onl`. Los PHP sueltos `enviar-pedido.php` y `enviar-incidencia.php` pertenecen a la versión antigua: usaban otro formato JSON, no guardaban en esta base de datos y no deben usarse ni volver a subirse al hosting.

La plantilla `api/config/config.example.php` deja el correo apagado. En el servidor, dentro de `api/config/config.php`, configura el bloque `mail` con estos datos:

| Campo | Valor |
| --- | --- |
| `enabled` | `true`, cuando el buzón ya esté configurado |
| `host` | `smtp.dondominio.com` (confirma el servidor que muestra el panel de correo) |
| `port` | `587` (STARTTLS), o `465` si el panel indica TLS implícito |
| `username` | `correocorporativo@planetaficha.onl` |
| `password` | Contraseña del buzón; introducirla solo en el archivo protegido del servidor |
| `from_email` | `correocorporativo@planetaficha.onl` |
| `to_email` | `correocorporativo@planetaficha.onl` |
| `ehlo` | `planetaficha.onl` |

DonDominio documenta SMTP autenticado con `smtp.dondominio.com`, puerto 587 y STARTTLS ([ayuda oficial](https://www.dondominio.com/es/help/88/como-configuro-las-cuentas-correo-en-microsoft-outlook/)). El remitente y usuario SMTP deben ser un buzón válido del dominio con su propia contraseña. Si la cuenta está alojada en otro proveedor, usa los datos de su panel.

La respuesta de las APIs incluye `mailSent`. La interfaz confirma cuando el servidor SMTP aceptó el aviso; si no, indica que el pedido/incidencia quedó guardado pero que el correo no se pudo enviar. El error técnico se escribe en el log PHP del servidor sin registrar la contraseña. La aceptación SMTP confirma que el servidor recibió el mensaje para procesarlo, no garantiza que el destinatario lo vea fuera de spam.

**Privacidad:** cada notificación de pedido incluye nombre, correo y dirección de entrega junto a los artículos y totales; la incidencia incluye asunto y descripción. La aplicación es un prototipo académico: usar solo datos ficticios. No guardar el bloque real de SMTP ni la contraseña de MySQL en GitHub. `.gitignore` ayuda al usar Git, pero no impide seleccionar esos archivos manualmente al subir desde la web de GitHub.

## Pago con PayPal (Sandbox)

Además de los métodos simulados (tarjeta, Bizum y transferencia de prueba), el checkout ofrece **PayPal (sandbox)**. Usa el entorno de pruebas de PayPal: las cuentas y el dinero son ficticios y no se realiza ningún cobro real.

### Flujo

1. En el checkout, el cliente rellena la entrega y elige "PayPal (sandbox)". El botón "Simular pago y enviar pedido" se oculta y aparece el botón de PayPal. `checkout.js` descarga el SDK de PayPal con el Client ID que devuelve `api/paypal/settings.php`.
2. Al pulsar el botón, se valida el formulario y `api/paypal/create-order.php` calcula el total **con los precios de la base de datos** (`quoteOrder()` en `repository.php`) y crea el pedido en PayPal (`POST /v2/checkout/orders`, `intent: CAPTURE`, moneda EUR). El carrito, el cliente y el total se guardan en la sesión de PHP (`$_SESSION['paypal_pending']`).
3. El cliente inicia sesión en la ventana de PayPal con la cuenta Personal de Sandbox y aprueba el pago.
4. `api/paypal/capture-order.php` recupera el pedido de la sesión, lo cobra (`POST /v2/checkout/orders/{id}/capture`) y comprueba que el estado es `COMPLETED` y que el importe cobrado coincide con el calculado. Después guarda el pedido con `createOrder()` (método `paypal_simulado`, referencia `PAYPAL-<id de captura>`), borra el pedido pendiente de la sesión y envía el aviso por correo.
5. La interfaz muestra el mismo diálogo de éxito que el pago simulado (`showOrderSuccess()` en `checkout.js`).

### Configuración

En `api/config/config.php` del servidor, bloque `paypal`:

| Campo | Valor |
| --- | --- |
| `enabled` | `true` para mostrar y usar PayPal |
| `client_id` | Client ID de la app de Sandbox (público) |
| `secret` | Secret de la app de Sandbox; **solo** en el archivo protegido del servidor |
| `api_base` | `https://api-m.sandbox.paypal.com` (Sandbox). Las credenciales Live usarían `https://api-m.paypal.com` |
| `currency` | `EUR` |

La app, sus credenciales y las cuentas de prueba (Business, que recibe los pagos, y Personal, que paga) se gestionan en [developer.paypal.com](https://developer.paypal.com/) (*Apps & Credentials* y *Testing Tools → Sandbox Accounts*), con el interruptor en **Sandbox**. Referencia: [PayPal REST APIs](https://developer.paypal.com/api/rest/) y [Orders API v2](https://developer.paypal.com/docs/api/orders/v2/).

En la base de datos no hace falta ningún cambio: la columna `pagos.metodo_pago` ya admite `paypal_simulado`.

### Seguridad del pago

- El total lo calcula siempre el servidor; se ignora el importe del navegador.
- La comunicación con PayPal es **de servidor a servidor** por HTTPS (API REST con OAuth 2.0 *client credentials*). El Secret y el token de acceso nunca llegan al navegador.
- El inicio de sesión del comprador ocurre en la ventana de PayPal, por lo que la tienda nunca recibe sus credenciales ni datos bancarios. Una cuenta real de PayPal no funciona en Sandbox.
- El pedido pendiente se borra de la sesión al cobrarlo, para que un mismo pago no pueda generar dos pedidos.
- `api/orders/create.php` (pago simulado) rechaza el método `PayPal`, de modo que no se puede registrar un pago de PayPal sin haberlo cobrado.

## Idioma y moneda

El botón de idioma de la cabecera alterna entre **español** (bandera de España, euros, formato `es-ES`) e **inglés** (bandera de EE. UU., dólares, formato `en-US`). La moneda ya no se elige por separado: `currentCurrency()` (`js/utils.js`) la deduce del idioma activo cada vez que se formatea un precio, y `setSiteLanguage()` (`js/i18n.js`) vuelve a dibujar el catálogo, el carrito, la ficha y el checkout al cambiar de idioma. La preferencia de idioma se guarda en `localStorage`.

Los importes en dólares son **orientativos**: se convierten con una tasa fija (USD 1,1204 por euro, referencia del BCE del 5 de octubre de 2026). La base de datos guarda todos los importes en euros y **PayPal cobra siempre en euros**, aunque la interfaz se esté viendo en inglés.

## Flujo funcional demostrable

1. Navegar o filtrar el catálogo (productos reales de juegos de mesa y puzzles) por **categoría** (Estrategia, Familiar, Cooperativo, Puzzle), **jugadores** (1, 2-3 o 4+), **dificultad** (Iniciación, Media, Experta) y **búsqueda de texto**. En móvil, el panel de filtros se pliega con el botón "Filtros". Si una imagen falta, la tarjeta muestra el diseño de color con el símbolo del juego.
2. Abrir una ficha (`product.viewed`). Algunos juegos tienen **variantes** (ediciones) con flechas y puntos para cambiar entre ellas.
3. Iniciar sesión o registrarse; los formularios se limpian al cerrar el diálogo, al entrar y al cerrar sesión.
4. Añadir productos al carrito (`cart.item_added`). El carrito es **por usuario** y se guarda en `localStorage`. Se abre desde la cabecera o desde el botón flotante.
5. Abrir el checkout (`checkout.started`): IVA del 21 %, transporte gratuito desde 70 EUR y descuento `YUZU10`.
6. Confirmar el pedido: el servidor valida los datos, **recalcula los importes con los precios de la base de datos**, comprueba y **descuenta el stock** dentro de una transacción, crea el pedido con código `PF-AAAA-XXXXXXXX`, registra el pago y los eventos `order.created` y `payment.simulated`. Con un método simulado, el pago se aprueba directamente; con **PayPal (sandbox)**, el pedido solo se guarda después de que PayPal confirme el cobro (ver "Pago con PayPal (Sandbox)"). Una vez guardado, intenta enviar el **resumen del pedido por correo** y devuelve el resultado en `mailSent`. Si SMTP falla, el pedido se conserva y la interfaz lo indica.
7. Consultar "Mis pedidos" (cliente) o el "Panel de evidencias" (administrador): pedidos de todos los usuarios y los últimos 500 eventos, con exportación de eventos a JSON. Los pedidos de PayPal aparecen con el método `paypal_simulado` y la referencia `PAYPAL-...`.
8. Enviar el formulario de soporte (`support.requested`): la incidencia se guarda en la tabla `incidencias` y se intenta notificar al buzón corporativo; la interfaz informa si el servidor aceptó el correo.
9. Cambiar el idioma con el botón de la cabecera: los textos, la bandera y la moneda de los precios cambian a la vez (ES/EUR ↔ EN/USD).

## Catálogo

El catálogo se lee de la base de datos (`api/products.php`, tablas `productos`, `categorias`, `origenes` y relaciones). El archivo `js/data/products.js` aporta solo la parte visual (colores, símbolo e imagen por producto, `PRODUCT_VISUALS`) y un **catálogo estático de respaldo** (`STATIC_PRODUCTS`) que se usa si la API no responde. Hay 12 referencias base de 6 países de diseño, más dos variantes de Ajedrez y dos de Catan, con una ficha por variante.

**Presentación de precios:** los precios guardados en la base de datos y enviados por la API son importes **sin IVA**. Las tarjetas del catálogo, las fichas de producto, el carrito y las líneas del checkout muestran primero el precio con el 21 % de IVA y, debajo, en menor tamaño, el precio sin IVA. `priceIncludingVat()` y `priceBreakdownMarkup()` (`js/utils.js`) centralizan ese formato. El subtotal, descuento y envío del resumen siguen expresándose antes de IVA, la línea de IVA conserva el desglose y el total final ya incluye el impuesto. El servidor sigue calculando el pedido con los importes de la base de datos; el cambio es solo de presentación y no añade IVA una segunda vez.

**Moneda mostrada:** depende del idioma (ver "Idioma y moneda"): euros en español y dólares estadounidenses en inglés. El catálogo y los cálculos del pedido conservan el euro como moneda base; `formatPrice()` convierte solo lo que se muestra en pantalla con una tasa orientativa por cada euro (USD 1,1204, referencia del BCE del 5 de octubre de 2026, [BCE](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.eu.html)). El BCE publica estas tasas para información y desaconseja su uso para transacciones: no son tasas en tiempo real y no deben usarse para cobrar. El antiguo selector de moneda EUR/USD/GBP se ha eliminado.

**Paleta y variantes:** cada juego usa un tono pastel propio con texto oscuro de alto contraste; la franja del título y la etiqueta «Diseño · país» comparten el tono. En productos con ediciones, las flechas laterales del catálogo cambian la foto, subtítulo, descripción, precio e identificador que se añade al carrito. La ficha conserva las mismas variantes y permite cambiarlas con flechas y puntos. Los colores de `PRODUCT_VISUALS` (`js/data/products.js`) están asociados tanto a los IDs numéricos de la base de datos como a los IDs del catálogo de respaldo.

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

Una variante es un producto de la base de datos con `producto_padre_id` apuntando al producto base; hereda lo que no cambia. `getVariants(product)` (`js/catalog.js`) devuelve el producto base y sus variantes, y `getProduct(id)` encuentra cualquiera por `id`. En el catálogo solo aparece una tarjeta por producto base, con flechas para pasar entre ediciones; la ficha también permite navegar las variantes. Cada variante se añade al carrito, se cobra y se registra con su propio `id`. Ajedrez tiene la edición base y dos variantes (tres ediciones en total); Catan tiene la caja base y dos expansiones.

### Imágenes de productos

Están en `img/products/`, en `.jpg`, con el nombre del `id` del producto (`ajedrez.jpg`, `rush-hour.jpg`...). Se recomiendan imágenes cuadradas, fondo blanco, unos 800×800 px y menos de 150 KB. Se muestran en el catálogo (foto entera sobre fondo blanco), en la ficha (panel izquierdo) y como miniatura de 56×56 px en el carrito. Si una imagen no carga, un `onerror` la retira y se ve el diseño de color.

## Persistencia y modelo de datos

La información importante vive en **MySQL**; en el navegador solo quedan el carrito y la preferencia de idioma.

| Dónde | Qué guarda |
| --- | --- |
| Base de datos | usuarios, productos y stock, pedidos, líneas, pagos (simulados y de PayPal Sandbox), direcciones de pedido, eventos e incidencias |
| `localStorage` | carrito por usuario (clave `planetaFicha.cart.user.v3.<id de usuario>`) e idioma elegido (`planetaficha.language.v1`) |
| Cookie de sesión | identificador de sesión PHP (`HttpOnly`, `SameSite=Lax`, `Secure` en HTTPS) |
| Sesión PHP (servidor) | usuario, rol, token CSRF y, durante un pago con PayPal, el pedido pendiente de cobrar (`paypal_pending`) |

### Base de datos (`database/juegos_y_puzles.sql`)

Tablas: `productos`, `categorias`, `producto_categoria`, `origenes`, `producto_origen`, `usuarios` (con `apellidos` y `rol`), `pedidos`, `lineas_pedido`, `pagos`, `direcciones_pedido`, `eventos` e `incidencias`. Detalles de funcionamiento:

- **Stock:** al crear un pedido se descuenta con `UPDATE productos SET stock = stock - ? WHERE id = ? AND stock >= ?` dentro de una transacción; si no hay stock suficiente, el pedido se rechaza completo y no se crea nada. Aún no se muestra el stock en la tienda.
- **Pagos:** `pagos.metodo_pago` admite `tarjeta_simulada`, `bizum_simulado`, `transferencia_simulada` y `paypal_simulado`. La referencia es `SIM-XXXXXX` en los pagos simulados y `PAYPAL-<id de captura>` en los de PayPal.
- **Eventos:** el administrador ve los últimos 500 (`LIMIT 500`). No hay política de retención ni índice sobre `fecha_evento`, por lo que la tabla crece sin límite (ver "Mejoras propuestas").
- **Incidencias:** se guardan en `incidencias`, pero todavía no se listan en el back-office.
- La estadística "Usuarios" del back-office cuenta usuarios con pedidos, no todos los registrados.

## API y flujo de seguridad de la aplicación

| Endpoint | Método | Acceso |
| --- | --- | --- |
| `api/auth/session.php` | GET | público (devuelve usuario y token CSRF) |
| `api/auth/login.php`, `register.php`, `logout.php` | POST | público / sesión |
| `api/products.php` | GET | público |
| `api/orders/create.php` | POST | cliente con sesión (solo métodos simulados) |
| `api/orders/my-orders.php` | GET | cliente con sesión |
| `api/paypal/settings.php` | GET | público (Client ID y estado de PayPal; nunca el Secret) |
| `api/paypal/create-order.php` | POST | cliente con sesión |
| `api/paypal/capture-order.php` | POST | cliente con sesión |
| `api/support.php` | POST | cliente con sesión |
| `api/events/log.php` | POST | público (eventos de la interfaz) |
| `api/admin/orders.php`, `api/admin/events.php` | GET | solo administrador |
| `api/health.php` | GET | público (comprobación de la base de datos) |

Todas las respuestas son JSON. Las peticiones que modifican datos exigen el token **CSRF** en la cabecera `X-CSRF-Token` y comprueban el origen (`sameOrigin`). El token se renueva al iniciar y cerrar sesión, y el identificador de sesión se regenera al entrar (`session_regenerate_id`).

## Seguridad

- **Importes y stock en el servidor:** subtotal, descuento, IVA y envío se recalculan con los precios de la base de datos; lo que envíe el navegador se ignora. También el importe enviado a PayPal se calcula en el servidor y se vuelve a comprobar al cobrar.
- **Contraseñas y sesiones:** hash con `password_hash()`, cookie de sesión `HttpOnly`/`SameSite=Lax`/`Secure`, CSRF y roles comprobados en cada endpoint (`requireAuth`, `requireAdmin`).
- **Consultas preparadas (PDO)** en todo el acceso a datos y escape de la salida con `safeText()` en el HTML.
- **`.htaccess`:** bloquea desde el navegador (403) `config.php`, `config.mail.php`, `.env`, `health-debug.php` y los archivos `*.md`, `*.sql` y `*.py`; añade las cabeceras `X-Content-Type-Options`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy` y una `Content-Security-Policy`. Las carpetas `api/lib`, `api/config`, `database` y `tests` tienen además su propio `.htaccess` con `Require all denied`. Estos bloqueos solo afectan al acceso HTTP: PHP sigue pudiendo leer esos archivos. Como el bloqueo afecta a cualquier archivo llamado `config.php`, el endpoint de PayPal se llama `settings.php`.
- **Errores no visibles:** `display_errors` está desactivado y los errores van solo al log del servidor, para no filtrar rutas ni datos.
- **Credenciales fuera de GitHub:** `api/config/config.php` (contraseñas de MySQL y SMTP y Secret de PayPal) existe solo en el servidor. En el repositorio solo está `config.example.php`, y `.gitignore` excluye `api/config/config.php`, `config.mail.php` y `.env`. Si alguna vez se subió una contraseña real, hay que cambiarla.
- **PayPal:** el Secret solo está en el servidor; el navegador recibe únicamente el Client ID, que es público. La tienda nunca maneja credenciales ni datos bancarios del comprador. Ver "Seguridad del pago".
- **Correo SMTP cifrado:** puerto 465 con TLS directo; otros puertos con STARTTLS obligatorio. Se verifica el certificado y el nombre del host (el `host` debe coincidir con el del certificado). Si el servidor no ofrece STARTTLS, el envío se aborta antes de enviar usuario o contraseña. Las credenciales viajan en base64 solo **dentro** del canal ya cifrado; base64 no es cifrado.
- **Antiabuso:** campo señuelo oculto en los formularios y comprobación de origen. No hay todavía límite de intentos de login (ver "Mejoras propuestas").
- **Datos de prueba:** las cuentas de demostración que venían con la base de datos se han neutralizado. La cuenta de administrador de pruebas (ver "Cuentas de prueba") es de solo consulta y su contraseña es pública a propósito; las contraseñas de MySQL, del hosting y del correo corporativo no figuran en el repositorio.

## Instrumentación de eventos

Los eventos se generan en `logEvent()` (`js/events.js`), se envían a `api/events/log.php` y se guardan en la tabla `eventos` con identificador, marca temporal, origen y payload JSON. El administrador los consulta y exporta a JSON desde el back-office; en una segunda tarea podrían consumirse desde un endpoint de integración, una cola o un ETL hacia un ERP/CRM o analítica.

Eventos incluidos: `product.viewed`, `cart.item_added`, `checkout.started`, `order.created`, `payment.simulated` y `support.requested`. Los pagos con PayPal Sandbox también se registran como `payment.simulated`, con `method: paypal_simulado` y la referencia `PAYPAL-...` en el payload.

## Pruebas automáticas

Desde la raíz del proyecto:

```bash
python tests/virtual_e2e.py
```

Levanta el servidor integrado de PHP con el adaptador `mock` (archivo JSON en lugar de MySQL, con la misma API) y comprueba sesión y CSRF, protección del back-office, login y roles, registro, pedidos separados por usuario, cálculo en servidor, descuento de stock, eventos e incidencias, carga de `index.html` y componentes, e integración front-end/API. Algunas comprobaciones están ligadas al estado de `mock-db.json` y a la versión de caché concreta de cada entrega, por lo que pueden fallar tras actualizar `ASSET_VERSION` o la configuración sin que la web esté rota. Nunca debe usarse la configuración real para probar.

La prueba no cubre el pago con PayPal, porque necesita conexión con el Sandbox de PayPal. Ese flujo se valida a mano en la web publicada (ver "Despliegue en el hosting", paso 5).

## Arquitectura y decisiones

- **Interfaz:** `index.html` es un armazón que carga en tiempo de ejecución los fragmentos de `components/`; `styles.css` contiene el diseño responsive. Un `[hidden]{display:none !important}` global garantiza que el atributo `hidden` oculte también elementos con `display` propio (botones).
- **Comportamiento:** `app.js` define `state`, `refs`, toasts, ficha de producto y la delegación de clics (`data-action`).
- **Lógica de negocio:** en el servidor (`api/lib/repository.php`: pedidos, stock, usuarios, eventos) y, en el navegador, por módulos de `js/`. `quoteOrder()` calcula el total sin guardar nada; `createOrder()` lo reutiliza y guarda el pedido, tanto para el pago simulado como para PayPal.
- **Acceso a datos:** clase `PFDatabase` con PDO (MySQL) y un adaptador `mock` para pruebas.
- **Pasarela de pago:** integración de PayPal en servidor (Orders API v2 con `intent: CAPTURE`) en lugar de una integración solo en el navegador, para que el importe y el Secret no dependan del cliente.
- **Alternativas consideradas:** un backend Node/Express con SQLite; se eligió PHP + MySQL por ser lo que ofrece el hosting contratado.

## Limitaciones conocidas

- El transporte y el envío son simulados, y el pago es simulado o de PayPal **Sandbox**: no hay cobros reales ni proveedor logístico.
- Si PayPal cobra pero la base de datos falla al guardar el pedido (por ejemplo, porque se agotó el stock en ese momento), el pago queda registrado en el log del servidor con su identificador para devolverlo a mano; no hay reembolso automático.
- Los importes en dólares son orientativos (tasa fija); el cargo de PayPal es siempre en euros.
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
8. **Variantes de producto** (`getVariants()`, `getProduct()`, `show-variant`): dos variantes adicionales de Ajedrez y dos de Catan.
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
- Cuentas de demostración neutralizadas, cuenta de administrador de pruebas de solo consulta (documentada en "Cuentas de prueba") y **contraseña de MySQL rotada**; `config.php` editado solo en el servidor.
- `.gitignore` con `api/config/config.php`, `config.mail.php` y `.env`.
- `ASSET_VERSION` y `?v=` actualizados a `20261005-9`.

**Funcionalidad**

- **Avisos por correo de pedido e incidencia.** Ambos registros se guardan primero en la base de datos; luego `api/lib/mail.php` los notifica por SMTP compartido. Las respuestas `mailSent` se reflejan en el checkout y el formulario de incidencias, por lo que ya no se afirma que el aviso se envió cuando SMTP está apagado o lo rechaza.
- **Protección del repositorio.** Se añade `.gitignore` para excluir `api/config/config.php`, `.env` y configuraciones SMTP locales; también se bloquea el acceso HTTP directo a las carpetas de configuración y biblioteca PHP.
- **Configuración del buzón.** La plantilla incluye el destinatario corporativo y valores de conexión DonDominio de ejemplo. La contraseña queda fuera del repositorio y se introduce solo en la configuración privada del servidor.
- **Precios del catálogo con IVA visible.** Se muestra el precio final con el 21 % incluido y debajo el importe sin IVA en las tarjetas, fichas, carrito y checkout. La lógica de cálculo y cobro del servidor no cambia.
- **Mejora visual del catálogo y carrusel de ediciones.** Paleta pastel por producto con contraste oscuro, etiqueta de origen coordinada, flechas laterales con transición y actualización de imagen, descripción y precio al cambiar de variante. Se sincroniza la edición elegida con la ficha y con el producto que se añade al carrito.
- **Selector de idioma español/inglés.** Se añade a la cabecera un botón con la bandera del idioma activo (España o Inglaterra); recuerda la preferencia en el navegador, traduce textos y etiquetas de la interfaz y localiza títulos, subtítulos y descripciones de los 16 productos. También ajusta el título de la pestaña, el idioma del documento, los precios y la búsqueda del catálogo. El contador numérico superpuesto sobre las imágenes de variantes se elimina; se conservan las flechas y los indicadores por puntos de la ficha. *(La bandera de Inglaterra se sustituyó el 7 de octubre por la de EE. UU.)*
- **Selector de moneda EUR/USD/GBP.** Se añade una lista en la cabecera y se convierten los importes mostrados en las tarjetas, fichas, carrito, checkout y avisos. La moneda elegida se guarda en el navegador; el servidor y el pedido mantienen los cálculos en euros. Los cambios son de presentación con tasas fijas orientativas del BCE (05/10/2026), no una conversión en tiempo real ni una moneda de cobro. *(Sustituido el 7 de octubre: la moneda pasa a depender del idioma.)*

### Pasarela de pago e idioma con moneda (7 de octubre de 2026)

**Pago con PayPal Sandbox**

- Nueva opción "PayPal (sandbox)" en el checkout (`components/dialogs.html`) con el botón oficial de PayPal, que sustituye al botón de pago simulado cuando se elige ese método.
- Nuevos endpoints `api/paypal/settings.php`, `api/paypal/create-order.php` y `api/paypal/capture-order.php`, y cliente de la API REST de PayPal en `api/lib/paypal.php` (cURL y OAuth 2.0 *client credentials*).
- `api/lib/repository.php`: el cálculo de importes se separa en `quoteOrder()`, que reutilizan `createOrder()` y PayPal. `createOrder()` acepta el método `PayPal` (`paypal_simulado`) y una referencia de pago externa.
- `api/orders/create.php` rechaza el método `PayPal`, para que solo pueda registrarse tras un cobro real en Sandbox.
- `js/checkout.js`: carga bajo demanda del SDK de PayPal, `readCheckoutData()`, `togglePayPal()` y `showOrderSuccess()`, compartida con el pago simulado. `app.js` escucha el cambio de método de pago.
- Nuevo bloque `paypal` en `api/config/config.php` y en la plantilla `config.example.php` (con `enabled` en `false` y sin credenciales).
- Sin cambios en la base de datos: `pagos.metodo_pago` ya incluía `paypal_simulado` (comprobado en el servidor con `SHOW COLUMNS`).

**Idioma con moneda asociada**

- Se elimina el selector de moneda de la cabecera (`components/header.html`) y su lógica de `js/utils.js` (`setSiteCurrency()`, `updateCurrencyControl()` y la preferencia de moneda en `localStorage`). Se retira la libra esterlina.
- `currentCurrency()` (`js/utils.js`) deduce la moneda del idioma: EUR en español y USD en inglés.
- La bandera del idioma inglés pasa de Inglaterra a **EE. UU.** (`.flag-usa` en `styles.css`, asignada en `js/i18n.js`), y el formato del inglés pasa de `en-GB` a `en-US`, a juego con el dólar.

**Despliegue**

- `ASSET_VERSION` y `?v=` actualizados a `20261007-2`.

**Pendiente (decisión del equipo)**

- Se decidió mantener la web hasta este punto. Quedan propuestas, sin implementar, en "Mejoras propuestas".

## Mejoras propuestas (no implementadas)

- **Límite de intentos:** bloqueos temporales (ventana deslizante) para login, registro, incidencias, pedidos y eventos, con tabla `limites_uso` e índice sobre `eventos.fecha_evento`.
- **Registro:** reglas más estrictas de correo y contraseña.
- **Tienda y back-office:** mostrar el stock en la ficha, listar las incidencias y retener/depurar eventos antiguos.
- **Pasarela de pago:** reembolso automático en PayPal si el pedido no puede guardarse tras el cobro, y aviso en el checkout de que los importes en USD son orientativos y el cargo se hace en euros. *(La integración de pruebas con PayPal Sandbox ya está implementada.)*
- Erratas de `products.js` (`duartion` en las variantes en lugar de `duration`).

## Declaración de punto de partida y uso de IA

Punto de partida: desarrollo nuevo, sin plantilla ni repositorio de terceros. La interfaz, los datos ficticios y el código se crearon con apoyo de IA generativa y requieren revisión, pruebas y comprensión del grupo antes de una entrega académica.

Para el anexo de IA de la memoria, el grupo debe completar con honestidad: herramienta utilizada, tareas asistidas, fragmentos relevantes, errores detectados, cambios introducidos por el equipo y método de validación.

### Registro de las sesiones de revisión con IA (Claude)

- **Tareas asistidas:** botón flotante del carrito; corrección del filtrado del catálogo; revisión completa del código; imágenes de producto; aviso de prototipo; variantes; carrito en cookie; integración de los endpoints PHP y del correo; protección de `config.mail.php`; cifrado TLS/STARTTLS; control de caché; **diagnóstico y corrección de los cuatro errores del proyecto con base de datos y login; recentrado del pie de página; auditoría de ciberseguridad, UX y base de datos; endurecimiento (`.htaccess`, errores ocultos, archivos de depuración eliminados, credenciales y `.gitignore`); aviso por correo de cada pedido; actualización de este README.**
- **Errores detectados por la IA:** filtro "1 jugador" sin productos; erratas en los datos; los problemas de las revisiones anteriores; y, en la última fase, los cuatro errores indicados arriba, el atributo `hidden` anulado por el CSS, la exposición de archivos de configuración/depuración y la visualización de errores de PHP.
- **Cambios introducidos por el equipo:** productos reales y fotos; el back-end (API, base de datos, login y roles); contratación y configuración del hosting; subida de archivos, rotación de contraseñas y pruebas en la web publicada (incluidos los 403 de los archivos protegidos, la redirección a HTTPS y la recepción del correo de pedido).
- **Método de validación empleado:** comprobación de sintaxis y cruce entre archivos; los errores se reprodujeron antes y después de corregirlos con un navegador automatizado (Chromium); la CSP se probó sin infracciones; el envío de correo se probó contra servidores SMTP de prueba (TLS directo, STARTTLS, rechazo de conexiones sin cifrar y de certificados no válidos); la prueba `tests/virtual_e2e.py` se ejecutó con el adaptador `mock`; y el equipo verificó cada cambio en la web real.
- **Revisión SMTP asistida por Codex (5 de octubre de 2026):** se comprobó que los PHP anteriores no correspondían a los endpoints de la versión con base de datos y que la configuración SMTP local no contenía credenciales. Se actualizó la integración compartida de pedidos/incidencias, el estado visible de envío, la plantilla de configuración, la guía de despliegue y las exclusiones/protecciones para secretos. El equipo aún debe introducir la contraseña del buzón solo en la configuración privada del hosting y verificar la recepción real; este cambio no incluye ni declara validada esa contraseña.
- **Sesión guiada de PayPal Sandbox e idioma con moneda (7 de octubre de 2026, Claude):** la IA propuso el diseño de la integración (cálculo en servidor, flujo create/capture, sesión como almacén temporal) y guió paso a paso; un miembro del equipo creó la app y las cuentas de Sandbox en PayPal Developer, aplicó cada cambio en el proyecto y lo envió para revisión. La IA revisó cada archivo, detectó y explicó errores antes de publicar (un `if` de PayPal que debía quitarse de la copia del endpoint, una variable de cliente inexistente en la captura y `currentCurrency` definida como valor calculado una sola vez en lugar de como función, que habría roto todos los precios) y señaló que el `.htaccess` bloquea cualquier `config.php`, motivo por el que el endpoint se llama `settings.php`. **Validación:** comprobación de sintaxis PHP y JavaScript de los archivos enviados, ejecución de `tests/virtual_e2e.py` antes y después del cambio en `repository.php` (mismos resultados), prueba del formato de precios en ambos idiomas, comprobación en el servidor de que `pagos.metodo_pago` admite `paypal_simulado`, y pruebas manuales del equipo en la web publicada (pago simulado, pago con PayPal Sandbox, pedido visible en "Mis pedidos" y en el back-office, y cambio de idioma y moneda).

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
- [ ] Comprobar que ningún `config.php`/`config.mail.php` con datos reales **está** en GitHub ni en su historial (si lo estuvo, cambiar las contraseñas de MySQL y del buzón).
- [ ] Completar en "Cuentas de prueba" el correo y la contraseña de la cuenta Personal de PayPal Sandbox (antes de entregar; no en un repositorio público).
- [ ] Decidir con el equipo si se adopta alguna de las "Mejoras propuestas".
- [ ] Completar el anexo de IA de la memoria.
- [ ] Anotar en la memoria la procedencia y licencia de las fotos de `img/products/` (las portadas de juegos suelen tener derechos de autor; al ser un prototipo sin fines comerciales, basta con citar la fuente).
