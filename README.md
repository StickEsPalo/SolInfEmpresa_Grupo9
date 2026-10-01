# PlanetaFicha - prototipo de eCommerce de importación

PlanetaFicha es un prototipo académico de canal digital de venta para un comercio de juegos de mesa y puzzles de diseño europeo y asiático. No hay actividad comercial, pagos reales, cuentas reales ni credenciales en el proyecto.

## Puesta en marcha

La interfaz sigue siendo HTML/CSS/JavaScript, pero el checkout usa `enviar-pedido.php` para mandar el resumen por SMTP autenticado. No requiere `npm` ni base de datos; el hosting del dominio debe ejecutar PHP.

**Importante:** desde que la interfaz se divide en componentes (`components/*.html`), `index.html` los carga con `fetch()`. Por eso **ya no basta con abrir `index.html` haciendo doble clic** (con `file://` el navegador bloquea esas peticiones y aparece el mensaje "No se ha podido cargar la página completa"). Hay que servir la carpeta con un servidor local:

```powershell
cd SolInfEmpresa_Grupo9-JP
python -m http.server 8080
```

Después, abrir `http://localhost:8080`. Este comando solo sirve los archivos estáticos; para probar el envío PHP localmente se necesita un servidor PHP y el archivo de configuración SMTP. Para publicar el checkout con correo, usa un hosting que ejecute PHP, como el hosting del dominio.

## Estructura del proyecto

```
SolInfEmpresa_Grupo9-JP/
├── index.html              Carga los componentes y los scripts en orden
├── app.js                  Estado global, referencias al DOM, eventos y arranque
├── enviar-pedido.php       Valida el pedido y lo envía por SMTP (sin base de datos)
├── config.mail.example.php Plantilla de conexión SMTP
├── config.mail.php         Clave privada SMTP (se crea al configurar; no subir a Git)
├── styles.css              Diseño responsive
├── styles-backup.css       Copia de seguridad del CSS
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
    ├── data/products.js    Catálogo maestro de productos
    ├── utils.js            readStorage(), persist(), safeText(), formatPrice()
    ├── events.js           logEvent(), vista previa, exportación y borrado
    ├── catalog.js          getProduct(), filtrado y renderizado del catálogo
    ├── cart.js             Carrito, totales, miniaturas y botón flotante
    ├── checkout.js         Checkout, validación y creación del pedido
    ├── support.js          Solicitudes de soporte
    └── admin.js            Back-office (pedidos, eventos y modelo de datos)
```

**Orden de carga** (definido en `index.html`): `products.js` → `utils.js` → `events.js` → `catalog.js` → `cart.js` → `checkout.js` → `support.js` → `admin.js` → `app.js`. Los módulos usan funciones globales y `state`/`refs` (definidos en `app.js`) solo cuando se ejecutan, nunca al cargarse, por lo que el orden funciona.

## Usuarios y datos de prueba

No se requiere inicio de sesión. En el checkout deben introducirse datos ficticios. Por ejemplo:

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
3. Añadir productos al carrito: genera `cart.item_added`. Cada línea del carrito lleva una miniatura con la foto. El carrito se abre desde la cabecera o desde el **botón flotante**, que aparece cuando el botón de la cabecera sale de pantalla y muestra el mismo contador.
4. Abrir el checkout: genera `checkout.started`; se calcula IVA al 21%, transporte gratuito a partir de 70 EUR y el descuento de prueba.
5. Completar el formulario: el endpoint PHP valida productos y cantidades, calcula los importes con el catálogo y envía el resumen al correo corporativo. El pago es simulado; el pedido queda en el historial local del navegador.
6. Abrir "Panel de evidencias" para consultar pedidos y eventos o exportar estos últimos a JSON.
7. Usar el formulario de soporte para registrar `support.requested`.

### Envío de pedidos e incidencias por correo (DonDominio)

1. Crea o confirma que existe el buzón `correocorporativo@planetaficha.onl` en DonDominio.
2. Copia `config.mail.example.php` y renómbralo `config.mail.php`.
3. En `config.mail.php`, introduce la contraseña de ese buzón en `password`. La plantilla usa `smtp.planetaficha.onl`, puerto 587 y autenticación. Según la guía actual de DonDominio para envíos desde la web, deja el cifrado y TLS automático desactivados.
4. Sube `enviar-pedido.php`, `config.mail.php`, `.htaccess` y la web al hosting. La página y el endpoint deben estar bajo el mismo dominio y usarse con HTTPS.
5. Envía una incidencia de prueba y verifica la bandeja de entrada y spam. Los pedidos también usan esta configuración SMTP.

DonDominio requiere SMTP autenticado con un buzón del propio dominio; `mail()` de PHP no es el método admitido. Para envíos desde la web, la guía de DonDominio indica el servidor `smtp.midominio.com`, puerto 587, autenticación activa y cifrado/TLS automático desactivados. La clave solo se guarda en `config.mail.php`, que está excluido de Git y bloqueado por `.htaccess`. Si el correo no está alojado en DonDominio, pide a su proveedor los datos SMTP compatibles con el hosting.

El endpoint de pedidos no guarda pedidos en servidor ni envía recibo al comprador. Conserva la orden en el navegador actual y envía un aviso al correo corporativo. El endpoint `enviar-incidencia.php` envía las incidencias al mismo buzón y solo las registra en el navegador después de que el servidor acepte el correo. El importe de los pedidos se recalcula con una lista de precios fija porque no se conecta a la base de datos.

## Catálogo

El catálogo maestro está en `js/data/products.js` y contiene 12 referencias reales de 6 países de diseño (India, Japón, España, Alemania, Estados Unidos y Francia). La distribución actual es:

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
- El campo `image` apunta a la foto del producto con una ruta **relativa a `index.html`** (no a `products.js`), por ejemplo `"img/products/ajedrez.jpg"`. Es opcional: sin él, o si el archivo no carga, el producto conserva el diseño de color con `tone`, `text` y `symbol`, por lo que estos tres campos no deben borrarse.

### Imágenes de productos

Las fotos están en `img/products/`, en formato `.jpg`, con el mismo nombre que el `id` del producto (`ajedrez.jpg`, `rush-hour.jpg`...). Se recomienda que sean cuadradas o casi cuadradas, con fondo blanco, de unos 800×800 px y menos de 150 KB cada una.

Se muestran en tres sitios:

- **Catálogo:** la foto ocupa la parte superior de la tarjeta, centrada y entera sobre fondo blanco (`object-fit: contain`). Debajo, la franja con el color del juego contiene el título y el subtítulo. La etiqueta "Diseño · País" se sitúa sobre la foto.
- **Ficha de producto:** la foto llena el panel izquierdo y el título permanece abajo, en su recuadro de color.
- **Carrito:** cada línea lleva una miniatura de 56×56 px con la foto. Si falla, se ve el símbolo sobre fondo de color, como antes.

Si una imagen no carga, un atributo `onerror` la elimina y la tarjeta vuelve al diseño de color, de modo que no se ven imágenes rotas.

## Persistencia y modelo de datos

El carrito se conserva en la cookie funcional propia `planetaFicha_cart` durante 30 días y también en `localStorage` como respaldo; al iniciar, la web migra a la cookie el carrito anterior que encuentre en `localStorage`. Esta cookie contiene solo los identificadores de producto y cantidades, con `Path=/` y `SameSite=Lax` (y `Secure` bajo HTTPS). Los pedidos visibles en el back-office, incidencias y eventos siguen en `localStorage` de ese navegador. Al confirmar un pedido, sus datos también se envían a `enviar-pedido.php`, que manda un correo al buzón corporativo; el servidor no guarda la orden ni requiere base de datos.

| Entidad | Campos principales | Relación |
| --- | --- | --- |
| Producto | id, title, subtitle, category, players, playerFilter, difficulty, duration, origin, author, price, tone, text, symbol, image, description, mechanics, language | catálogo maestro en `js/data/products.js` |
| Carrito | productId, quantity | referencia a Producto |
| Pedido | id, fecha, cliente de prueba, líneas, totales, código promocional, estado, historial de estados | agrupa líneas y pago |
| Línea de pedido | productId, título, precio unitario, cantidad | pertenece a Pedido |
| Pago simulado | método, estado, referencia | embebido en un Pedido |
| Evento | id, tipo, fecha, fuente, payload | evidencia trazable de negocio |
| Soporte | id, fecha, correo ficticio, mensaje, estado | solicitud postventa |

Claves de `localStorage`: `planetaFicha.cart.v1` (respaldo), `planetaFicha.orders.v1`, `planetaFicha.events.v1` y `planetaFicha.tickets.v1`.

### Base de datos relacional (plantilla)

`juegos_y_puzles.sql` es una plantilla de base de datos pensada para conectar la web en el futuro. **Todavía no está conectada** y no coincide con el catálogo actual de la web (ver "Problemas pendientes", apartado D). Incluye las tablas `productos`, `categorias`, `producto_categoria`, `origenes`, `producto_origen`, `usuarios`, `pedidos`, `lineas_pedido`, `pagos`, `direcciones_pedido`, `eventos` e `incidencias`.

## Instrumentación de eventos

Los eventos se generan en `logEvent()` (`js/events.js`) y se conservan en `planetaFicha.events.v1`. Cada registro lleva un identificador, marca temporal ISO, origen y payload en el navegador. El panel interno ofrece la consulta y una exportación JSON. El envío de pedido usa un endpoint PHP independiente y no conecta la base de datos SQL.

Eventos incluidos: `product.viewed`, `cart.item_added`, `checkout.started`, `order.created`, `payment.simulated` y `support.requested`.

## Arquitectura y decisiones

- **Interfaz:** `index.html` es un armazón que carga en tiempo de ejecución los fragmentos semánticos y accesibles de `components/`; `styles.css` contiene el diseño responsive.
- **Comportamiento:** `app.js` define el estado (`state`), las referencias al DOM (`refs`), los toasts, la ficha de producto y la delegación de eventos de clic (`data-action`).
- **Lógica de negocio:** repartida por módulos en `js/`: filtros y catálogo (`catalog.js`), cálculo comercial y carrito (`cart.js`), validación, creación del pedido y pago simulado (`checkout.js`), soporte (`support.js`), back-office (`admin.js`) e instrumentación (`events.js`).
- **Persistencia:** una capa mínima con `readStorage()` y `persist()` (`js/utils.js`) encapsula `localStorage`.
- **Seguridad de la salida:** todo dato mostrado en HTML pasa por `safeText()` para evitar inyección de código.
- **Correo de pedidos:** `enviar-pedido.php` envía por SMTP autenticado y reconstruye precios y totales desde su catálogo permitido. Si se actualizan nombres o precios en `js/data/products.js`, actualiza también el catálogo PHP.

## Limitaciones conocidas

- La persistencia del back-office es por navegador: no existe base de datos compartida ni autenticación. El correo enviado funciona como aviso y no como almacenamiento consultable.
- Los datos del checkout se envían al buzón corporativo como aviso; usa únicamente datos ficticios y nunca datos reales de clientes.
- El pago, transporte y disponibilidad se simulan; no hay comunicación con pasarela, proveedor ni inventario.
- Es necesario servir la web desde un hosting con PHP y usar HTTPS para publicar pedidos; no funciona abriendo `index.html` directamente ni en hosting estático.
- La base de datos SQL es solo una plantilla y no está conectada a la web.
- Antes de publicar, crea o confirma el buzón SMTP corporativo. Copia `config.mail.example.php` como `config.mail.php`, introduce la contraseña SMTP y sube ambos scripts PHP más los archivos web al hosting. Sube `.htaccess` y no publiques SQL ni la clave SMTP.

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

## Declaración de punto de partida y uso de IA

Punto de partida: desarrollo nuevo, sin plantilla ni repositorio de terceros. La interfaz, datos ficticios y código se crearon como apoyo de IA generativa y requieren revisión, pruebas y comprensión del grupo antes de una entrega académica.

Para el anexo de IA de la memoria, el grupo debe completar con honestidad: herramienta utilizada, tareas asistidas, fragmentos relevantes, errores detectados, cambios introducidos por el equipo y método de validación. Una recomendación de validación: probar manualmente el flujo completo, comprobar las entradas invalidadas, recargar el navegador para verificar persistencia y contrastar los eventos con los pedidos creados.

### Registro de las sesiones de revisión con IA (Claude)

Este registro recoge únicamente lo tratado en las sesiones de revisión y corrección de las fases 1 a 3. El grupo debe completarlo con las tareas de la versión inicial y de la modularización, que no figuran aquí en detalle.

- **Tareas asistidas:** botón flotante del carrito (fase 1); diagnóstico y corrección del filtrado del catálogo (fase 2); revisión completa del código y elaboración de la lista de problemas; integración de las imágenes de producto (tarjeta del catálogo, ficha y miniatura del carrito); ampliación del aviso de prototipo; actualización de este README.
- **Errores detectados por la IA:** filtro "1 jugador" sin ningún producto; erratas en los datos; y los problemas listados en "Problemas pendientes".
- **Cambios introducidos por el equipo:** integración de los productos reales, decisiones sobre categorías, corrección de tildes, actualización del hero y descarga y preparación de las fotos de los productos (formato, nombre y carpeta).
- **Método de validación empleado:** comprobación automática de sintaxis de los JS, cruce entre archivos (IDs, selectores, acciones, clases CSS) y simulación de los filtros contra los datos de `products.js`. Las maquetas de la ficha y de la miniatura del carrito se comprobaron en un navegador (Chromium) con una foto de ejemplo, y después el equipo las verificó en la web real. **Pendiente:** validación manual en navegador (ver apartado E).

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


### D. Base de datos (`juegos_y_puzles.sql`) — para cuando se conecte

- [ ] Actualizar la base de datos para su posterior conexión a la web.

### E. Otras tareas pendientes

- [ ] Probar en navegador cada filtro (categoría, jugadores, dificultad y búsqueda), el flujo completo de compra, la persistencia tras recargar y la vista móvil.
- [ ] Completar el anexo de IA de la memoria (ver sección "Declaración de punto de partida y uso de IA").
- [ ] Anotar en la memoria la procedencia y licencia de las fotos de `img/products/` (las portadas de juegos suelen tener derechos de autor; al ser un prototipo sin fines comerciales, basta con citar la fuente).
