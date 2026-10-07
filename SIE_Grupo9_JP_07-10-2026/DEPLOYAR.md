# Despliegue de PlanetaFicha

La aplicación necesita un servidor web con PHP y MySQL/MariaDB. Mantén la estructura de carpetas al subirla.

## 1. Preparar la base de datos

Crea una base de datos y un usuario con permisos sobre ella en el panel del hosting. Importa `database/juegos_y_puzles.sql` una sola vez para crear las tablas y cargar el catálogo inicial.

## 2. Configurar el servidor

En el hosting, crea `api/config/config.php` a partir de `api/config/config.example.php`. Introduce los datos privados de MySQL y, si vas a usar avisos por correo, los del buzón SMTP.

No publiques ni compartas `api/config/config.php`. No pongas contraseñas en archivos JavaScript.

## 3. Subir los archivos necesarios

Sube a la carpeta pública del sitio:

- `index.html`, `styles.css` y `app.js`
- Las carpetas `components/`, `js/`, `img/` y `api/`
- El archivo `.htaccess` de la raíz
- `api/config/config.php`, creado de forma privada en el servidor

No es necesario subir `database/` después de importar el SQL, ni la carpeta `tests/`, ni los archivos Markdown. Conserva esos archivos en tu copia local.

La página debe servirse por HTTP o HTTPS. No funcionará al abrir `index.html` directamente desde el disco.

## 4. Comprobar la conexión

Abre `https://TU-DOMINIO/api/health.php`. Cuando el servidor se conecte a la base de datos, responderá con JSON y `"ok":true`.

Después, prueba el registro, el inicio de sesión, el catálogo, el carrito, un pedido simulado y el formulario de incidencias. Usa siempre datos ficticios.

## 5. Configurar el correo

Los avisos se envían desde la API usando `api/lib/mail.php`. En la sección `mail` de `api/config/config.php`, configura los datos que proporciona el proveedor del buzón: servidor SMTP, puerto, usuario y contraseña.

Para DonDominio, confirma los valores exactos en el panel de correo. Si el buzón usa STARTTLS, normalmente se emplea el puerto 587; si usa TLS implícito, el puerto suele ser 465. El correo solo queda configurado cuando se activa `enabled` y se introducen credenciales válidas.

Los pedidos y las incidencias se guardan en la base de datos. Si SMTP falla, el registro puede conservarse aunque el aviso por correo no llegue.

## Prueba automatizada local

El proyecto incluye `tests/virtual_e2e.py` y `tests/mock-db.json` para una prueba del backend con una base de datos simulada. Ejecútala desde la carpeta del proyecto con:

```bash
python tests/virtual_e2e.py
```

Esta prueba no sustituye la comprobación de la conexión real al hosting, que se hace con `/api/health.php`.
