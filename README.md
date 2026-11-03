# PlanetaFicha

Prototipo académico de comercio electrónico de juegos de mesa y puzles. La interfaz usa HTML, CSS y JavaScript; el servidor usa PHP y MySQL. El pago es simulado: no se deben introducir datos bancarios ni datos personales reales.

La Tarea 2 añade la integración con un back-office mediante n8n: los pedidos, los cambios de estado y las incidencias se envían como eventos a un workflow, y las incidencias las analizan dos agentes de IA bajo supervisión humana (ver [Tarea 2](#tarea-2)).

## Requisitos

- Hosting con PHP 8 o posterior, HTTPS y la extensión `pdo_mysql`.
- Una base de datos MySQL o MariaDB.
- Para ver la web, abrirla a través de un servidor web. `index.html` carga fragmentos con `fetch()` y no funciona al abrirlo con doble clic (`file://`).
- Para la Tarea 2: una instancia de n8n accesible por internet (n8n Cloud o equivalente) y, para el aviso interno, un bot de Telegram. n8n no puede ejecutarse en el hosting de PHP y MySQL.

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
3. Sube los archivos de la web y las carpetas `api/`, `components/`, `img/`, `js/` y `tarea2/`, conservando su estructura.
4. Comprueba `https://TU-DOMINIO/api/health.php`. Si responde con `"ok":true`, el servidor pudo conectar con la base de datos.
5. Prueba registro, inicio de sesión, catálogo, carrito, pedido e incidencias. El pago y los datos introducidos deben ser ficticios.
6. Para la integración con n8n, sigue los pasos de [tarea2/README.md](tarea2/README.md).

La guía paso a paso para el equipo está en [DEPLOYAR.md](DEPLOYAR.md). No es necesario subirla al hosting.

## Usuarios de prueba

- **Cliente:** el registro está habilitado. Cualquier persona puede crear una cuenta desde "Iniciar sesión" con datos ficticios (nombre y apellidos con mayúscula inicial, correo que termine en `.com` y contraseña que empiece por mayúscula, con al menos 6 caracteres y un número).
- **Administrador (cuadro operativo):** la cuenta de administración de pruebas se facilita al profesorado en la entrega del Campus Virtual, no en este archivo. Con ella se accede al cuadro operativo, se cambian estados de pedido y se aprueban o rechazan las propuestas del agente.

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
  admin/                     Consultas y acciones del panel de administración
  integration/               Endpoints que usa n8n (recibos, contexto de incidencia y propuestas)
  paypal/                    Pago de pruebas con PayPal Sandbox
  lib/                       Inicio, acceso a datos, correo e integración
  config/                    Plantilla y configuración privada
  products.php               Catálogo desde la base de datos
  support.php                Recepción de incidencias
  health.php                 Comprobación de base de datos
img/products/                Imágenes del catálogo y sus variantes
database/
  juegos_y_puzles.sql        Esquema y datos iniciales
  migrations/                Cambios de esquema de la Tarea 2
tarea2/                      Integración con n8n (workflows, payloads, cuadro operativo, evidencias)
tests/                       Prueba automatizada y base de datos simulada
DEPLOYAR.md                  Guía interna de despliegue
README.md                    Descripción del proyecto
.gitignore                   Reglas locales de Git
.htaccess                    Protección y cabeceras del hosting
```

## Archivos para el hosting

La página necesita `index.html`, `styles.css`, `app.js`, `components/`, `js/`, `img/`, `api/` y el `.htaccess` de la raíz. Para el cuadro operativo hace falta también `tarea2/` (`dashboard.html`, `operations.js`, `operations.css` y su `.htaccess`). También necesita `api/config/config.php`, creado de forma privada en el servidor a partir de la plantilla.

Conserva `database/juegos_y_puzles.sql`, `tests/`, `README.md`, `DEPLOYAR.md` y `.gitignore` en tu copia de trabajo. No son necesarios para servir las páginas: el SQL se importa en la base de datos, las pruebas se ejecutan aparte y los Markdown son documentación. Si el servidor ya tiene la base de datos inicializada, no hace falta subir la carpeta `database/`.

No borres los archivos `.htaccess` de la raíz, de `api/` ni de `tarea2/`: restringen el acceso web a archivos internos. Conserva también `api/config/config.example.php` como plantilla, aunque no es la configuración que usa la web.

## Funciones incluidas

- Catálogo servido desde la base de datos, con catálogo estático de respaldo.
- Registro e inicio de sesión con roles de cliente y administrador.
- Carrito separado por cuenta, cálculo de impuestos y envío de demostración.
- Pedidos y pagos simulados (también PayPal Sandbox), consulta de compras e incidencias.
- Registro de eventos en la interfaz y en la API.
- Notificaciones por correo mediante la configuración SMTP del servidor.
- Integración con n8n: webhook protegido por token, validación del contrato y reparto por escenario.
- Dos agentes de IA en jerarquía (Analista y Revisor) que proponen una acción para cada incidencia, con aprobación o rechazo humano y aviso por Telegram solo tras aprobar.
- Cuadro operativo con métricas calculadas desde MySQL.

## Tarea 2

Los workflows n8n, el cuadro operativo, los payloads, la matriz de decisión y los entregables están en [tarea2/README.md](tarea2/README.md). Las capturas y registros de las pruebas están en `tarea2/evidence/`.

Flujo resumido:

1. La web guarda el pedido o la incidencia en MySQL y publica un evento JSON al webhook de n8n (cabecera `X-Integration-Token`).
2. n8n valida el contrato y lo reparte: pedidos y cambios de estado se guardan como recibos idempotentes en el back-office (`api/integration/ingest.php`); las incidencias pasan por los dos agentes.
3. El agente Analista (solo lectura) propone y el agente Revisor audita y guarda la propuesta como `pendiente_revision`. Los agentes no contactan al cliente, no cambian pedidos ni cierran incidencias.
4. Una persona administradora aprueba o rechaza en el cuadro operativo. Solo al aprobar se avisa al grupo interno de Telegram.
5. Si un evento no cumple el contrato o un nodo falla, un workflow de errores lo registra como `workflow.error`.

Estado de lo implementado y probado con datos de prueba: pedido integrado, cambio de estado, incidencia con agentes, aprobación, rechazo y rama de error.

Para ponerlo en marcha: ejecuta `database/migrations/001_tarea2_integration.sql` una sola vez sobre la base existente, crea el bloque `integration` de `api/config/config.example.php` en la configuración privada del servidor (URL de producción del webhook y secreto compartido) e importa los workflows en n8n, con las variables y credenciales que indica `tarea2/README.md`. Conserva el bloque `paypal` ya configurado en este proyecto. No subas ni compartas el `config.php` real.

Las funciones del servidor requieren PHP, conexión a la base de datos y los valores correctos en `api/config/config.php`. El contenido de ese archivo es privado.

## Limitaciones conocidas

- Prototipo académico: el pago es simulado y todos los datos deben ser ficticios.
- La instancia de n8n de la entrega es una prueba de 14 días de n8n Cloud; los workflows exportados están en `tarea2/workflows/`.
- Los agentes usan el plan gratuito de Gemini (modelo Flash-Lite), con límites de peticiones por minuto y por día. Cada incidencia tarda unos 45 a 50 segundos en procesarse; es asumible porque la web responde enseguida y el agente trabaja en segundo plano.
- Un único secreto de integración compartido entre la web, el webhook y las herramientas de los agentes.
- Los textos de las incidencias salen hacia el proveedor de IA; deben ser ficticios.
- Estas medidas son propias de un prototipo y no sustituyen a una auditoría de seguridad real.
