# Despliegue en hosting

La versión incluida ya está preparada para trabajar con PHP + MySQL/MariaDB y con sesiones reales. El carrito puede seguir siendo local por usuario, pero el catálogo, usuarios, pedidos, pagos simulados, incidencias y eventos se gestionan a través de la API PHP.

## 1. Crear la base de datos

En el panel del hosting crea una base de datos MySQL/MariaDB y un usuario con permisos sobre esa base de datos.

Después importa:

```text
database/juegos_y_puzles.sql
```

## 2. Completar una sola configuración

Edita en el servidor:

```text
api/config/config.php
```

y rellena:

```text
DOMINIO
HOST MYSQL
NOMBRE BD
USUARIO MYSQL
CONTRASEÑA MYSQL
```

No pongas estas credenciales en ningún `.js`.

## 3. Subir los archivos

Sube todo el contenido manteniendo exactamente las carpetas `api/`, `components/`, `js/`, `img/` y `database/`.

La página principal es:

```text
index.html
```

La web necesita un servidor HTTP y PHP; no debe abrirse con `file://`.

## 4. Primera comprobación

Abre:

```text
https://TU-DOMINIO/api/health.php
```

Con MySQL correctamente conectado debe responder con JSON y `"ok":true`.

## 5. Comprobación funcional

### Cliente

```text
ana.demo@example.com
Contraseña: demo123
```

Debe poder iniciar sesión, añadir productos, abrir el carrito, hacer un checkout simulado y ver únicamente sus pedidos en Mi cuenta.

### Segundo cliente

```text
carlos.demo@example.com
Contraseña: demo123
```

No debe poder ver pedidos de Ana ni acceder al Back-office.

### Administrador

```text
admin@example.com
Contraseña: admin123
```

Debe poder abrir el Back-office y consultar todos los pedidos, incluyendo el usuario al que pertenece cada pedido y los eventos registrados.

## 6. Correo

El correo requiere una cuenta SMTP real del dominio. En `api/config/config.php`, dentro de `mail`, configura:

```php
'enabled' => true,
'host' => 'smtp.dondominio.com',
'port' => 587,
'username' => 'correocorporativo@planetaficha.onl',
'password' => 'CONTRASEÑA_DEL_BUZON',
'from_email' => 'correocorporativo@planetaficha.onl',
'from_name' => 'PlanetaFicha',
'to_email' => 'correocorporativo@planetaficha.onl',
'ehlo' => 'planetaficha.onl',
'timeout' => 15,
```

Introduce la contraseña solo en el archivo de configuración privado del servidor. El código usa STARTTLS con puerto 587 (o TLS implícito en el 465), con verificación del certificado. Si el correo está alojado en otro proveedor, utiliza el servidor y puerto que ese proveedor indique. Aunque SMTP esté apagado o falle, pedido e incidencia se conservan en la base de datos; la interfaz informa de que faltó el aviso.

## 7. Prueba virtual incluida

Antes de entregar esta versión se ejecuta:

```bash
python tests/virtual_e2e.py
```

La prueba levanta la misma API PHP con el adaptador `mock`, reproduce las sesiones, roles, ACL, registro, login, pedidos, stock, eventos, soporte y carga HTTP de componentes, y verifica la sintaxis PHP/JS. El entorno de desarrollo usado para preparar el paquete no dispone de un servidor MySQL ni del driver `pdo_mysql`, por lo que la conexión a un MySQL real se debe validar en el hosting con `/api/health.php`.


### Prueba local
Live Server sirve HTML/CSS/JS, pero no ejecuta PHP. Para comprobar autenticación, sesiones y pedidos con la API hay que usar PHP (por ejemplo `php -S localhost:8080`) o subir la carpeta al hosting. Con Live Server la interfaz carga y usa el catálogo visual incluido como respaldo; la autenticación y los pedidos requieren PHP/MySQL.
