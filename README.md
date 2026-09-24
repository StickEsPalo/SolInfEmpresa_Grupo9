# Pangea Meeple — web preparada para DonDominio

Prototipo académico de tienda. La página usa PHP en el hosting para leer productos, categorías, orígenes y stock, y para guardar pedidos, pagos simulados, direcciones, incidencias y eventos en la base de datos asociada al plan de DonDominio. No hace falta instalar ni arrancar una base de datos en el ordenador.

## Requisitos

- Dominio vinculado a un plan de hosting web con PHP y base de datos.
- PHP con PDO y el controlador PDO MySQL habilitado.
- Una base de datos creada desde el panel de DonDominio.

La aplicación se conecta al servicio de base de datos del hosting usando los datos que aparecen en el panel. El proyecto no configura ni administra el motor del proveedor.

## Crear e importar la base de datos

1. Entra en el área de cliente de DonDominio. Abre Hosting y Correo, selecciona el dominio y entra en Bases de datos.
2. Crea una base y guarda el servidor/host, el nombre, el usuario y la contraseña que muestra el panel. Copia el nombre completo, incluido cualquier prefijo.
3. Abre phpMyAdmin desde la gestión de la base recién creada.
4. Selecciona esa base e importa juegos_y_puzles_dondominio.sql. Está preparado para importarse dentro de una base existente y no intenta crear una base por su cuenta.
5. Importa extensiones_web.sql en la misma base. Añade direcciones_pedido, que no existe en el esquema original.

No habilites el acceso externo para esta web: api.php corre dentro del hosting y se conecta desde allí.

## Configurar las credenciales

1. Copia config.example.php con el nombre config.local.php.
2. En config.local.php sustituye HOST_DE_LA_BASE_DE_DATOS, NOMBRE_DE_LA_BASE, USUARIO_DE_LA_BASE y CONTRASENA_DE_LA_BASE por los valores del panel.
3. Sube config.local.php al mismo directorio que api.php. El archivo está excluido de Git y .htaccess bloquea su descarga directa. No publiques la contraseña en GitHub ni la envíes por chat.

## Subir la web

1. Consulta los datos FTP en el panel de DonDominio o usa WebFTP.
2. Sube index.html, app.js, styles.css, api.php, config.local.php y .htaccess al directorio public del hosting.
3. No subas los archivos SQL al directorio público.
4. Confirma que el dominio apunta a ese hosting y abre la web mediante HTTPS.

La página necesita que el servidor ejecute PHP; no funcionará como sitio estático. Si no carga el catálogo, revisa config.local.php, confirma que los dos SQL se importaron en la misma base y consulta el registro de errores PHP del hosting. La configuración no se puede completar hasta tener los valores de conexión que muestra el panel.

## Qué guarda la aplicación

- El catálogo activo, las categorías, los países de origen, precios, dificultad, jugadores y existencias se leen de la base.
- El carrito conserva sus cantidades en el navegador; al confirmar, el servidor vuelve a validar stock y precios.
- El checkout calcula en PHP el IVA del 21 %, el envío simulado de 6,90 EUR para pedidos inferiores a 70 EUR y el descuento YUZU10 del 10 %.
- El pedido, las líneas, la dirección, el pago de prueba, la reducción de stock y los eventos se guardan en una transacción. Si ocurre un error, no queda un pedido incompleto.
- El formulario de soporte crea una incidencia y guarda un evento.
- El back-office consulta pedidos, incidencias y eventos de la base, y permite exportar los eventos a JSON.
- Las fichas de producto, el carrito y el checkout generan eventos de negocio.

## Límites de esta demostración

- Introduce solo datos ficticios. No se realizan ventas, pagos ni envíos reales.
- El back-office no tiene autenticación. No guardes datos reales ni expongas información real de clientes.
- No incluye inicio de sesión de clientes ni gestión de pedidos enviados, cancelados o devueltos.
- El volcado original incluye usuarios y operaciones de ejemplo. Mantén los SQL fuera del directorio público; .htaccess bloquea el acceso directo si alguno se sube por error.
- El grupo debe revisar y comprender el código, registrar los cambios, comprobar el flujo completo y completar la declaración de uso de IA que pide el enunciado.

## Archivos

- index.html y styles.css: interfaz.
- app.js: catálogo, filtros, carrito, checkout y panel.
- api.php: API PHP, validaciones, reglas de negocio y transacciones de base de datos.
- juegos_y_puzles.sql: volcado original proporcionado.
- juegos_y_puzles_dondominio.sql: copia preparada para importar en una base existente del hosting.
- extensiones_web.sql: tabla adicional para direcciones de entrega.
- config.example.php: plantilla de conexión.
- config.local.php: credenciales del hosting; no se incluye en Git.
