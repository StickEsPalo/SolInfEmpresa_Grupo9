# PlanetaFicha - prototipo de eCommerce de importación

PlanetaFicha es un prototipo académico de canal digital de venta para un comercio de juegos de mesa y puzzles de diseño europeo y asiático. No hay actividad comercial, pagos reales ni cuentas de cliente. Los pedidos y las incidencias se envían por correo desde el servidor mediante PHP; las credenciales de ese correo no forman parte del repositorio (ver "Envío de correos y seguridad").

## Puesta en marcha

El front-end es estático y sin dependencias de instalación (no requiere `npm` ni compilación). Solo necesita conexión a internet para cargar las tipografías de Google Fonts. El envío de pedidos e incidencias por correo requiere un servidor con **PHP** (ver más abajo): el catálogo, el carrito y las fichas funcionan sin él, pero al enviar un pedido o una incidencia el navegador mostrará un error si no hay PHP.

**Importante:** desde que la interfaz se divide en componentes (`components/*.html`), `index.html` los carga con `fetch()`. Por eso **ya no basta con abrir `index.html` haciendo doble clic** (con `file://` el navegador bloquea esas peticiones y aparece el mensaje "No se ha podido cargar la página completa"). Hay que servir la carpeta con un servidor local:

```powershell
cd SolInfEmpresa_Grupo9-JP
python -m http.server 8080
```

Después, abrir `http://localhost:8080`. Alternativa: la extensión *Live Server* de VS Code. Ni `python -m http.server` ni Live Server ejecutan PHP, por lo que con ellos solo se puede probar la parte visual.

Para probar también el envío de correos en local hay que tener PHP instalado y usar su servidor integrado, con un `config.mail.php` propio (no el real):

```powershell
php -S localhost:8080
```

**Despliegue:** la web está publicada en un hosting con PHP (DonDominio, con HTTPS). GitHub Pages, Netlify y Cloudflare Pages solo sirven archivos estáticos y no ejecutan los `.php`, así que con ellos no funcionaría el envío de correos.

### Versión de los archivos (caché del navegador)

`index.html` carga los scripts y la hoja de estilos con un parámetro de versión (`?v=...`) para que los navegadores no usen copias antiguas. Hay **dos valores que deben ser siempre idénticos**: la constante `ASSET_VERSION` del script de `index.html` y el `?v=` del enlace a `styles.css`. Cada vez que se suba al hosting un cambio en cualquier `.js` o en `styles.css`, hay que cambiar ambos al mismo valor nuevo (por ejemplo, `20261001-4` → `20261002-2`). No se debe reutilizar un valor ya publicado.

## Estructura del proyecto

```
SolInfEmpresa_Grupo9-JP/
├── index.html              Carga los componentes y los scripts en orden
├── app.js                  Estado global, referencias al DOM, eventos y arranque
├── styles.css              Diseño responsive
├── styles-backup.css       Copia de seguridad del CSS
├── enviar-pedido.php       Recibe el pedido, lo valida en el servidor y lo envía por correo
├── enviar-incidencia.php   Recibe el formulario de soporte y lo envía por correo
├── config.mail.php         Credenciales SMTP (solo en el servidor; bloqueado desde el navegador)
├── .htaccess               Bloquea el acceso web a config.mail.php (responde 403)
├── juegos_y_puzles.sql     Plantilla de base de datos (aún sin conectar)
├── components/             Fragmentos HTML de cada sección
│   ├── header.html         Cabecera, menú móvil y botón flotante del carrito
│   ├── hero.html           Portada
│   ├── trust.html          Garantías del prototipo
│   ├── catalog.html        Buscador, filtros y rejilla de productos
│   ├── experience.html     "Cómo funciona"
│   ├── traceability.html   Vista previa del registro de eventos
│   ├── support.html        Formulario de soporte
│   ├── footer.html         Pie de página
│   ├── cart.html           Panel lateral del carrito
│   └── dialogs.html        Ficha de producto, checkout, éxito y back-office
├── img/
│   └── products/           Fotos de los productos (una por juego, .jpg)
└── js/
    ├── data/products.js    Catálogo maestro de productos (con variantes)
    ├── utils.js            readStorage(), persist(), cookie del carrito, safeText(), formatPrice()
    ├── events.js           logEvent(), vista previa, exportación y borrado
    ├── catalog.js          getVariants(), getProduct(), filtrado y renderizado del catálogo
    ├── cart.js             Carrito, totales, miniaturas y botón flotante
    ├── checkout.js         Checkout, validación y creación del pedido (envía a enviar-pedido.php)
    ├── support.js          Solicitudes de soporte (envía a enviar-incidencia.php)
    └── admin.js            Back-office (pedidos, eventos y modelo de datos)
```

**Orden de carga** (definido en `index.html`): `products.js` → `utils.js` → `events.js` → `catalog.js` → `cart.js` → `checkout.js` → `support.js` → `admin.js` → `app.js`. Los scripts se cargan de forma secuencial y comparten el ámbito global, así que **no se puede declarar dos veces la misma `const`/`let` en archivos distintos** (provoca un `SyntaxError` y la web deja de cargar). Los módulos usan funciones globales y `state`/`refs` (definidos en `app.js`) solo cuando se ejecutan, nunca al cargarse, por lo que el orden funciona.

## Usuarios y datos de prueba

No se requiere inicio de sesión. En el checkout deben introducirse datos ficticios (el resumen del pedido se envía por correo a la dirección configurada en el servidor, no al correo escrito en el formulario, que solo se usa como "responder a"). Por ejemplo:

- Nombre: `Ada Lovelace`
- Correo: `ada@ejemplo.es`
- Dirección: `C/ Ejemplo, 42`
- Código postal: `28001`
- Ciudad: `Madrid`
- Promoción opcional: `YUZU10` (aplica un 10% de descuento simulado)

## Flujo funcional demostrable

1. Navegar o filtrar el catálogo de 12 referencias reales (juegos de mesa y puzzles) por:
   - **Categoría:** Estrategia, Familiar, Cooperativo o Puzzle.
   - **Jugadores:** 1 jugador, 2-3 o 4+.
   - **Dificultad:** Iniciación, Media o Experta.
   - **Búsqueda de texto** por título, subtítulo, autor, origen o categoría.
   - En móvil, el panel de filtros se pliega con el botón "Filtros".
   - Cada tarjeta muestra la foto del juego; si una imagen falta o no carga, se ve el diseño de color con el símbolo del juego.
2. Abrir una ficha: genera `product.viewed`. La ficha muestra la foto del juego junto a su título.
   - Algunos juegos tienen **variantes** (ver "Variantes de producto"): en la ficha aparecen unas flechas y unos puntos para cambiar de edición, y cada variante se añade al carrito como un producto distinto.
3. Añadir productos al carrito: genera `cart.item_added`. Cada línea del carrito lleva una miniatura con la foto. El carrito se abre desde la cabecera o desde el **botón flotante**, que aparece cuando el botón de la cabecera sale de pantalla y muestra el mismo contador. El carrito se guarda también en una **cookie** y se conserva al cerrar y volver a abrir el navegador.
4. Abrir el checkout: genera `checkout.started`; se calcula IVA al 21%, transporte gratuito a partir de 70 EUR y el descuento de prueba.
5. Completar el formulario: se valida la entrada en el navegador y se envía a `enviar-pedido.php`, que la valida de nuevo, **recalcula los importes con los precios del servidor** y envía el resumen por correo. Después se crea el pedido con identificador propio, se simula un pago y se registra la secuencia de estados `Creado` → `Pago simulado` → `Pendiente de preparación`.
6. Abrir "Panel de evidencias" para consultar pedidos y eventos o exportar estos últimos a JSON.
7. Usar el formulario de soporte para registrar `support.requested`; la solicitud se envía por correo mediante `enviar-incidencia.php`.

## Catálogo

El catálogo maestro está en `js/data/products.js` y contiene 12 referencias reales de 6 países de diseño (India, Japón, España, Alemania, Estados Unidos y Francia), más 4 variantes (2 de Ajedrez y 2 de Catan), lo que da 16 fichas de producto en total. La distribución actual de las 12 referencias base es:

| Categoría | Referencias |
| --- | --- |
| Estrategia | 5 (Ajedrez, Shogi, Catan, Let's Catch the Lion!, Oshi) |
| Familiar | 4 (Virus, Carcassonne, Dixit, Kabuto Sumo) |
| Cooperativo | 2 (Pandemic, Tragedy Looper) |
| Puzzle | 1 (Rush Hour) |

Reglas de datos que conviene respetar al añadir productos:

- El valor de `category` debe coincidir **exactamente** con el `data-value` de los botones de `components/catalog.html` (por ejemplo, `"Puzzle"` en singular). Si no, el filtro no devuelve resultados.
- `playerFilter` debe ser coherente con `players`: `"solo"` (1 jugador), `"small"` (partidas que admiten 2-3) y `"group"` (partidas que admiten 4 o más). Un juego de 2-4 jugadores lleva `["small", "group"]`.
- `difficulty` debe ser `Iniciación`, `Media` o `Experta`.
- Si cambia el número de referencias o de países, actualizar a mano los datos del hero (`components/hero.html`).
- Si se añade un producto o una variante nueva, hay que añadir también su `id` y su precio **en céntimos** al `$catalog` de `enviar-pedido.php`. Si falta, el servidor rechaza el pedido. Si el precio difiere entre `products.js` y el PHP, el que cuenta es el del PHP.
- El campo `image` apunta a la foto del producto con una ruta **relativa a `index.html`** (no a `products.js`), por ejemplo `"img/products/ajedrez.jpg"`. Es opcional: sin él, o si el archivo no carga, el producto conserva el diseño de color con `tone`, `text` y `symbol`, por lo que estos tres campos no deben borrarse.

### Variantes de producto

Un producto puede tener una lista `variants` dentro de `products.js`. Cada variante es un objeto con su propio `id` (por ejemplo, `ajedrez-430`) y solo los campos que cambian (título, subtítulo, imagen, precio, descripción...); el resto se hereda del producto base.

- `getVariants(product)` (`js/catalog.js`) devuelve el producto base y sus variantes ya combinados, y `getProduct(id)` encuentra cualquiera de ellos por `id`.
- En el catálogo solo aparece la tarjeta del producto base. La ficha (`openProduct(productId, index)` en `app.js`) muestra flechas y puntos de navegación (acción `show-variant`) para pasar de una edición a otra.
- Cada variante se añade al carrito, se cobra y se registra con su propio `id`.
- Variantes actuales: Ajedrez (edición caballeros templarios y edición premium) y Catan (Navegantes y Piratas y Exploradores).

### Imágenes de productos

Las fotos están en `img/products/`, en formato `.jpg`, con el mismo nombre que el `id` del producto (`ajedrez.jpg`, `rush-hour.jpg`...). Se recomienda que sean cuadradas o casi cuadradas, con fondo blanco, de unos 800×800 px y menos de 150 KB cada una.

Se muestran en tres sitios:

- **Catálogo:** la foto ocupa la parte superior de la tarjeta, centrada y entera sobre fondo blanco (`object-fit: contain`). Debajo, la franja con el color del juego contiene el título y el subtítulo. La etiqueta "Diseño · País" se sitúa sobre la foto.
- **Ficha de producto:** la foto llena el panel izquierdo y el título permanece abajo, en su recuadro de color.
- **Carrito:** cada línea lleva una miniatura de 56×56 px con la foto. Si falla, se ve el símbolo sobre fondo de color, como antes.

Si una imagen no carga, un atributo `onerror` la elimina y la tarjeta vuelve al diseño de color, de modo que no se ven imágenes rotas.

## Persistencia y modelo de datos

La persistencia de la web se implementa con `localStorage` del navegador, de modo que los pedidos, el carrito, las incidencias y los eventos no desaparecen al recargar en el mismo navegador. No existe todavía una base de datos compartida: lo único que sale del navegador son los correos de pedido e incidencia que envía el servidor (ver "Envío de correos y seguridad").

| Entidad | Campos principales | Relación |
| --- | --- | --- |
| Producto | id, title, subtitle, category, players, playerFilter, difficulty, duration, origin, author, price, tone, text, symbol, image, description, mechanics, language | catálogo maestro en `js/data/products.js` |
| Carrito | productId, quantity | referencia a Producto |
| Pedido | id, fecha, cliente de prueba, líneas, totales, código promocional, estado, historial de estados | agrupa líneas y pago |
| Línea de pedido | productId, título, precio unitario, cantidad | pertenece a Pedido |
| Pago simulado | método, estado, referencia | embebido en un Pedido |
| Evento | id, tipo, fecha, fuente, payload | evidencia trazable de negocio |
| Soporte | id, fecha, correo ficticio, mensaje, estado | solicitud postventa |

Claves de `localStorage`: `planetaFicha.cart.v1`, `planetaFicha.orders.v1`, `planetaFicha.events.v1` y `planetaFicha.tickets.v1`.

**Cookie del carrito:** además de en `localStorage`, el carrito se guarda en la cookie `planetaFicha_cart` (30 días, `Path=/`, `SameSite=Lax`, y `Secure` cuando la web se sirve por HTTPS). Solo contiene `productId` y `quantity`, nunca datos personales. Como una cookie no admite más de unos 4 KB, si el carrito no cabe (límite de 3800 caracteres) se usa solo `localStorage`; si el navegador bloquea las cookies, el carrito sigue funcionando con `localStorage`. Las funciones están en `js/utils.js`.

### Base de datos relacional (plantilla)

`juegos_y_puzles.sql` es una plantilla de base de datos pensada para conectar la web en el futuro. **Todavía no está conectada** y no coincide con el catálogo actual de la web (ver "Problemas pendientes", apartado D). Incluye las tablas `productos`, `categorias`, `producto_categoria`, `origenes`, `producto_origen`, `usuarios`, `pedidos`, `lineas_pedido`, `pagos`, `direcciones_pedido`, `eventos` e `incidencias`.

## Envío de correos y seguridad

Los pedidos y las incidencias se envían por correo desde dos endpoints PHP, que el navegador llama con `fetch` desde `js/checkout.js` y `js/support.js`:

| Archivo | Qué hace |
| --- | --- |
| `enviar-pedido.php` | Valida los datos del cliente y de las líneas, **recalcula subtotal, descuento, IVA y envío con los precios de su propio `$catalog`** (ignora los importes que envía el navegador) y envía el resumen del pedido. |
| `enviar-incidencia.php` | Valida el formulario de soporte y envía la incidencia. |
| `config.mail.php` | Devuelve un array con `host`, `port`, `username`, `password`, `from_email`, `from_name`, `to_email` y `timeout`. |

Medidas de seguridad aplicadas:

- **Credenciales fuera del alcance del navegador.** `.htaccess` contiene `<Files "config.mail.php"> Require all denied </Files>`, de modo que abrir `config.mail.php` en el navegador devuelve **403**. Esto solo bloquea el acceso por HTTP: los scripts PHP siguen pudiendo leerlo con `require`.
- **El `config.mail.php` real nunca debe subirse a GitHub**, ni estar en su historial. En el repositorio solo puede haber una versión con valores de ejemplo. Si alguna vez se subió con la contraseña real, hay que cambiar esa contraseña en el correo.
- **Conexión SMTP cifrada.** Con el puerto 465 se usa TLS directo; con cualquier otro puerto (por ejemplo, 587) se usa STARTTLS. Se verifica el certificado del servidor y el nombre del host, por lo que el `host` de `config.mail.php` debe coincidir con el del certificado del servidor de correo. Si el servidor no ofrece STARTTLS, el envío se aborta antes de enviar usuario o contraseña. Esto es independiente del HTTPS entre el navegador y la web.
- **Importes calculados en el servidor** (ver arriba), para que no se puedan manipular desde la consola del navegador.
- **Antiabuso:** campo señuelo `website` oculto (si viene relleno, se rechaza), comprobación de `Origin`, límite de tamaño de la solicitud y un intervalo mínimo de 8 segundos entre pedidos por sesión.

## Instrumentación de eventos

Los eventos se generan en `logEvent()` (`js/events.js`) y se conservan en `planetaFicha.events.v1`. Cada registro lleva un identificador, marca temporal ISO, origen y payload. El panel interno ofrece la consulta y una exportación JSON, de forma que en una segunda tarea podría consumirse desde un endpoint de integración, una cola, un ETL a un ERP/CRM o un sistema de analítica.

Eventos incluidos: `product.viewed`, `cart.item_added`, `checkout.started`, `order.created`, `payment.simulated` y `support.requested`.

## Arquitectura y decisiones

- **Interfaz:** `index.html` es un armazón que carga en tiempo de ejecución los fragmentos semánticos y accesibles de `components/`; `styles.css` contiene el diseño responsive.
- **Comportamiento:** `app.js` define el estado (`state`), las referencias al DOM (`refs`), los toasts, la ficha de producto y la delegación de eventos de clic (`data-action`).
- **Lógica de negocio:** repartida por módulos en `js/`: filtros y catálogo (`catalog.js`), cálculo comercial y carrito (`cart.js`), validación, creación del pedido y pago simulado (`checkout.js`), soporte (`support.js`), back-office (`admin.js`) e instrumentación (`events.js`).
- **Persistencia:** una capa mínima con `readStorage()` y `persist()` (`js/utils.js`) encapsula `localStorage`.
- **Seguridad de la salida:** todo dato mostrado en HTML pasa por `safeText()` para evitar inyección de código.
- **Alternativas consideradas:** un backend Node/Express con SQLite permitiría usuarios, persistencia compartida, autenticación y una API real. Para un prototipo desplegable sin infraestructura se ha priorizado HTML/CSS/JS y almacenamiento local.

## Limitaciones conocidas

- La persistencia es por navegador: no existe base de datos compartida ni autenticación. El "Panel de evidencias" se abre desde un botón del pie y lee el `localStorage` del propio navegador, por lo que no es un acceso protegido.
- Los datos de cliente se usan solo como demostración local y nunca deben ser reales.
- El pago, transporte y disponibilidad se simulan; no hay comunicación con pasarela, proveedor ni inventario.
- Es necesario ejecutar la web desde un servidor (local o de hosting); no funciona abriendo `index.html` directamente. Para enviar pedidos e incidencias el servidor debe ejecutar PHP y tener un `config.mail.php` válido.
- Los precios están duplicados (en `products.js` y en el `$catalog` de `enviar-pedido.php`) y hay que mantenerlos iguales a mano.
- La base de datos SQL es solo una plantilla y no está conectada a la web.
- Para el despliegue público solicitado por el enunciado debe publicarse esta carpeta en un proveedor de hosting elegido por el grupo y sustituir la URL en la entrega.

## Historial de cambios

### Versión inicial

Desarrollo en un único bloque: `index.html` con todas las vistas, `styles.css`, `app.js` con toda la lógica y el catálogo incluido, sin botón flotante del carrito.

### Evolución posterior

1. **Modularización / factorización del código.** La interfaz se separa en `components/*.html` (cargados desde `index.html`) y la lógica en `js/` (catálogo, carrito, checkout, eventos, soporte, administración y utilidades). El catálogo pasa a `js/data/products.js`.
2. **Botón flotante del carrito** (fase 1). Nuevo botón fijo en `components/header.html`, con contador sincronizado con el de la cabecera (`refs.floatingCartCount`). Se muestra cuando el botón de la cabecera sale de pantalla (`IntersectionObserver` en `initFloatingCart()` de `js/cart.js`), respeta el área segura de móviles y `prefers-reduced-motion`.
3. **Catálogo con productos reales.** Sustitución de los productos de ejemplo por juegos y puzzles reales.
4. **Revisión completa del código** (fase 3). Comprobación de sintaxis de todos los JS, cruce automático entre HTML, JS, CSS y datos, y revisión manual de la lógica. Los resultados están en la sección "Problemas pendientes".
5. **Imágenes en el catálogo y en la ficha de producto.** Nueva carpeta `img/products/` con una foto por juego y campo `image` en `products.js`. `renderCatalog()` (`js/catalog.js`) y `openProduct()` (`app.js`) insertan la foto con un `<img>`. En el catálogo se rediseña la tarjeta: foto sobre fondo blanco arriba y título y subtítulo dentro de la franja de color de debajo, con los botones alineados en todas las tarjetas de una fila. En la ficha, la foto ocupa el panel izquierdo con el título en su recuadro de color. Los estilos usan las clases `has-image`.
6. **Miniatura de imagen en el carrito.** Cada línea del carrito (`renderCart()` en `js/cart.js`) muestra la foto del producto en un recuadro de 56×56 px, con el símbolo de color como alternativa si la foto falla. La imagen es decorativa (`alt=""`), porque el título aparece al lado.
7. **Aviso de prototipo más visible.** La franja superior "Prototipo académico" (`.prototype-strip`) aumenta de tamaño: texto de 11 a 14 px, altura mínima de 32 a 44 px, más espacio interior y un punto indicador mayor. En móvil, el texto pasa de 9 a 11 px.
8. **Variantes de producto.** Nuevo campo `variants` en `products.js` y funciones `getVariants()` y `getProduct()` en `js/catalog.js`. La ficha muestra flechas y puntos para cambiar de variante (`show-variant`). Variantes iniciales: dos de Ajedrez y dos de Catan.
9. **Carrito en cookie.** El carrito se guarda también en la cookie `planetaFicha_cart` (30 días), con `localStorage` como respaldo (`js/utils.js`).
10. **Envío de pedidos e incidencias por correo (PHP).** Se incorporan `enviar-pedido.php`, `enviar-incidencia.php` y `config.mail.php`. `js/checkout.js` y `js/support.js` envían los datos con `fetch`; el servidor valida, recalcula los totales y manda el correo. Se añade un campo señuelo `website` en los formularios y un aviso con el destino del resumen.
11. **Protección de `config.mail.php`.** Se añade `.htaccess` y se comprueba que abrir el archivo desde el navegador devuelve 403.
12. **Cifrado SMTP.** Las conexiones al correo usan TLS directo (puerto 465) o STARTTLS (otros puertos), verifican el certificado y no envían credenciales sin cifrar.
13. **Control de caché al publicar.** `index.html` carga los scripts y el CSS con un parámetro de versión (`ASSET_VERSION` y `?v=`), que se cambia en cada subida de archivos.

## Declaración de punto de partida y uso de IA

Punto de partida: desarrollo nuevo, sin plantilla ni repositorio de terceros. La interfaz, datos ficticios y código se crearon como apoyo de IA generativa y requieren revisión, pruebas y comprensión del grupo antes de una entrega académica.

Para el anexo de IA de la memoria, el grupo debe completar con honestidad: herramienta utilizada, tareas asistidas, fragmentos relevantes, errores detectados, cambios introducidos por el equipo y método de validación. Una recomendación de validación: probar manualmente el flujo completo, comprobar las entradas invalidadas, recargar el navegador para verificar persistencia y contrastar los eventos con los pedidos creados.

### Registro de las sesiones de revisión con IA (Claude)

Este registro recoge únicamente lo tratado en las sesiones de revisión y corrección de las fases 1 a 3. El grupo debe completarlo con las tareas de la versión inicial y de la modularización, que no figuran aquí en detalle.

- **Tareas asistidas:** botón flotante del carrito (fase 1); diagnóstico y corrección del filtrado del catálogo (fase 2); revisión completa del código y elaboración de la lista de problemas; integración de las imágenes de producto (tarjeta del catálogo, ficha y miniatura del carrito); ampliación del aviso de prototipo; variantes de producto en la ficha; carrito en cookie; revisión e integración de los cambios del grupo en los archivos PHP y el envío de correo; protección de `config.mail.php` con `.htaccess`; cifrado TLS/STARTTLS de la conexión SMTP; control de caché con `ASSET_VERSION`; actualización de este README.
- **Errores detectados por la IA:** filtro "1 jugador" sin ningún producto; erratas en los datos; y los problemas listados en "Problemas pendientes".
- **Cambios introducidos por el equipo:** integración de los productos reales, decisiones sobre categorías, corrección de tildes, actualización del hero y descarga y preparación de las fotos de los productos (formato, nombre y carpeta); desarrollo de los endpoints PHP y de la cuenta de correo del proyecto; contratación y configuración del hosting; pruebas en la web publicada (incluido el 403 de `config.mail.php`).
- **Método de validación empleado:** comprobación automática de sintaxis de los JS, cruce entre archivos (IDs, selectores, acciones, clases CSS) y simulación de los filtros contra los datos de `products.js`. Las maquetas de la ficha y de la miniatura del carrito se comprobaron en un navegador (Chromium) con una foto de ejemplo, y después el equipo las verificó en la web real. El cifrado SMTP se probó en local contra un servidor de correo de prueba (STARTTLS y TLS directo, rechazo de conexiones sin cifrar y de certificados no válidos). **Pendiente:** validación manual en navegador y una prueba real de envío en el hosting (ver apartado E).

## Problemas pendientes

Resultado de la revisión de la fase 3. Marcar cada punto con `[x]` cuando se resuelva.

### A. Bugs reales (prioridad alta)

- [ ] **A1. El total mostrado no coincide con el cobrado (checkout)** — `js/checkout.js`, `app.js`.
  Al abrir el checkout, los totales se calculan sin código promocional (`calculateCart()`), pero el campo "Código promocional" conserva lo escrito anteriormente. Además, `createOrder()` no hace `form.reset()` al terminar, así que quedan rellenos los datos del pedido anterior. Si el campo mantiene `YUZU10`, se muestra el total sin descuento y al enviar se aplica.
  *Solución propuesta:* hacer `form.reset()` al abrir el checkout o tras crear el pedido, o calcular los totales con el valor actual del campo (`calculateCart(promoInput.value)`).

- [ ] **A2. Carrito con productos que ya no existen** — `js/cart.js`, `js/checkout.js`.
  Si en `localStorage` queda un producto eliminado del catálogo (por ejemplo, Hanamikoji), `cartLines()` lo oculta, pero `openCheckout()` comprueba `state.cart.length`. Se abre un checkout vacío y `createOrder()` puede crear un pedido sin líneas y con total 0 EUR.
  *Solución propuesta:* al arrancar, filtrar `state.cart` dejando solo productos existentes y guardarlo de nuevo; validar con `cartLines().length` en `openCheckout()` y `createOrder()`.

- [ ] **A3. El checkout se cierra al hacer clic en su margen** — `app.js`, `styles.css`.
  `.checkout-dialog` tiene `padding: 30px 34px 35px` y el manejador de cierre usa `event.target === dialog`, por lo que un clic en ese margen se interpreta como clic en el fondo, cierra el diálogo y se pierde lo escrito.
  *Solución propuesta:* cerrar solo si el clic queda fuera del rectángulo del diálogo (`getBoundingClientRect()`).

- [ ] **A4. `persist()` sin `try/catch` y eventos sin límite** — `js/utils.js`, `js/events.js`.
  `localStorage.setItem` puede lanzar una excepción si el almacenamiento está lleno o bloqueado (por ejemplo, en modo privado), interrumpiendo operaciones a medias (como `addToCart`). Además, `state.events` crece sin tope.
  *Solución propuesta:* envolver `persist()` en `try/catch` con aviso al usuario, limitar el registro (por ejemplo, a los 200 últimos eventos) y validar en `readStorage()` que el valor leído es un array.

### B. Accesibilidad

- [ ] **B1. Carrito lateral** — `components/cart.html`, `js/cart.js`, `styles.css`.
  Usa `aria-hidden="true"` cerrado, pero sus botones siguen siendo enfocables con el teclado (está desplazado fuera de pantalla). Tampoco se cierra con Escape ni gestiona el foco al abrir y cerrar.
  *Solución propuesta:* usar el atributo `inert` cuando está cerrado, cerrar con Escape y mover/devolver el foco.

- [ ] **B2. Botones del carrito** — `components/header.html`.
  Hay dos botones con la misma etiqueta "Abrir carrito" y el flotante no anuncia cuántos artículos hay.
  *Solución propuesta:* incluir el número en `aria-label` y actualizarlo en `renderCart()`.

### C. Detalles menores

- [ ] **C1. Datos del pedido** — `js/checkout.js`, `js/support.js`.
  `promoCode` guarda el texto escrito aunque no sea exacto (debería guardarse solo `YUZU10`). Los importes se guardan sin redondear a 2 decimales. El identificador de pedido (`PM-año-` + últimos 6 dígitos de `Date.now()`) puede repetirse pasados unos 16 minutos, y lo mismo ocurre con los tickets `SUP-xxxxxx`. Añadir un sufijo aleatorio.

- [ ] **C2. Contenido y textos.**
  Los valores "12 referencias" y "6 países" del hero están escritos a mano y podrían calcularse desde `products`. El contador del catálogo dice "1 referencia encontrada" con un resultado y "N referencias seleccionadas" con más: unificar criterio. En Let's Catch the Lion!, "iniciación" no es una mecánica de juego.

- [ ] **C3. Back-office** — `js/admin.js`.
  Las tarjetas de "Modelo de datos" no reflejan todos los campos reales: en Producto faltan `subtitle`, `duration`, `playerFilter`, `tone`, `text`, `symbol`, `description` y `language`; en Pedido faltan `payment` y `statusHistory`.

- [ ] **C4. Erratas en `products.js`.**
  El campo de duración de las variantes está escrito `duartion` (6 veces) en lugar de `duration`, por lo que no se usa. Falta la tilde en "expansión" en alguna descripción y los títulos de las variantes repiten el del producto base.

### D. Base de datos (`juegos_y_puzles.sql`) — para cuando se conecte

- [ ] Actualizar la base de datos para su posterior conexión a la web.

### E. Otras tareas pendientes

- [ ] Probar en navegador cada filtro (categoría, jugadores, dificultad y búsqueda), el flujo completo de compra, la persistencia tras recargar y la vista móvil.
- [ ] Comprobar que el `config.mail.php` con datos reales **no está** en GitHub ni en su historial (si lo estuvo, cambiar la contraseña del correo) y avisar al resto del grupo. Valorar subir solo una versión de ejemplo y añadir `config.mail.php` al `.gitignore`.
- [ ] Probar en la web publicada el envío real de un pedido y de una incidencia, y comprobar que llegan al correo configurado.
- [ ] Completar el anexo de IA de la memoria (ver sección "Declaración de punto de partida y uso de IA").
- [ ] Anotar en la memoria la procedencia y licencia de las fotos de `img/products/` (las portadas de juegos suelen tener derechos de autor; al ser un prototipo sin fines comerciales, basta con citar la fuente).
