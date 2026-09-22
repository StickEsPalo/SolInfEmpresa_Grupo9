# Pangea Meeple - prototipo de eCommerce de importación

Pangea Meeple es un prototipo académico de canal digital de venta para un comercio de juegos de mesa y puzzles de diseño europeo y asiático. No hay actividad comercial, pagos reales, cuentas reales ni credenciales en el proyecto.

## Puesta en marcha

Es una aplicación estática sin dependencias. Basta con abrir `index.html` en un navegador moderno. Para una experiencia idéntica a un despliegue:

```powershell
cd outputs\pangea-meeple-import
python -m http.server 8080
```

Después, abrir `http://localhost:8080`. Puede publicarse en GitHub Pages, Netlify o Cloudflare Pages sin configuración adicional.

## Usuarios y datos de prueba

No se requiere inicio de sesión. En el checkout deben introducirse datos ficticios. Por ejemplo:

- Nombre: `Ada Lovelace`
- Correo: `ada@ejemplo.es`
- Dirección: `C/ Ejemplo, 42`
- Código postal: `28001`
- Ciudad: `Madrid`
- Promoción opcional: `YUZU10` (aplica un 10% de descuento simulado)

## Flujo funcional demostrable

1. Navegar o filtrar el catálogo de 12 referencias por categoría, jugadores y dificultad.
2. Abrir una ficha: genera `product.viewed`.
3. Añadir productos al carrito: genera `cart.item_added`.
4. Abrir el checkout: genera `checkout.started`; se calcula IVA al 21%, transporte gratuito a partir de 70 EUR y el descuento de prueba.
5. Completar el formulario: se valida la entrada, se crea un pedido único, se simula un pago y se registra la secuencia de estados `Creado` → `Pago simulado` → `Pendiente de preparación`.
6. Abrir “Panel de evidencias” para consultar pedidos y eventos o exportar estos últimos a JSON.
7. Usar el formulario de soporte para registrar `support.requested`.

## Persistencia y modelo de datos

Como se trata de una entrega estática, la persistencia se implementa con `localStorage` del navegador. Esto asegura que los pedidos, carrito, incidencias y eventos no desaparezcan al recargar en el mismo navegador; no se envía información a ningún servidor.

| Entidad | Campos principales | Relación |
| --- | --- | --- |
| Producto | id, título, categoría, jugadores, dificultad, precio, origen | catálogo maestro en `app.js` |
| Carrito | productId, quantity | referencia a Producto |
| Pedido | id, fecha, cliente de prueba, líneas, totales, estado, historial de estados | agrupa líneas y pago |
| Línea de pedido | productId, título, precio unitario, cantidad | pertenece a Pedido |
| Pago simulado | método, estado, referencia | embebido en un Pedido |
| Evento | id, tipo, fecha, fuente, payload | evidencia trazable de negocio |
| Soporte | id, fecha, correo ficticio, mensaje, estado | solicitud postventa |

## Instrumentación de eventos

Los eventos se generan en `logEvent()` y se conservan en `pangeaMeeple.events.v1`. Cada registro lleva un identificador, marca temporal ISO, origen y payload. El panel interno ofrece la consulta y una exportación JSON, de forma que en una segunda tarea podría consumirse desde un endpoint de integración, una cola, un ETL a un ERP/CRM o un sistema de analítica.

Eventos incluidos: `product.viewed`, `cart.item_added`, `checkout.started`, `order.created`, `payment.simulated` y `support.requested`.

## Arquitectura y decisiones

- **Interfaz:** `index.html` contiene las vistas semánticas y accesibles; `styles.css` el diseño responsive; `app.js` el comportamiento.
- **Lógica de negocio:** funciones independientes para filtros, cálculo comercial, validación, creación del pedido, pago simulado e instrumentación.
- **Persistencia:** una capa mínima con `readStorage()` y `persist()` encapsula `localStorage`.
- **Alternativas consideradas:** un backend Node/Express con SQLite permitiría usuarios, persistencia compartida, autenticación y una API real. Para un prototipo desplegable sin infraestructura se ha priorizado HTML/CSS/JS y almacenamiento local.

## Limitaciones conocidas

- La persistencia es por navegador: no existe base de datos compartida ni autenticación.
- Los datos de cliente se usan solo como demostración local y nunca deben ser reales.
- El pago, transporte y disponibilidad se simulan; no hay comunicación con pasarela, proveedor ni inventario.
- Para el despliegue público solicitado por el enunciado debe publicarse esta carpeta en un proveedor de hosting elegido por el grupo y sustituir la URL en la entrega.

## Declaración de punto de partida y uso de IA

Punto de partida: desarrollo nuevo, sin plantilla ni repositorio de terceros. La interfaz, datos ficticios y código se crearon como apoyo de IA generativa y requieren revisión, pruebas y comprensión del grupo antes de una entrega académica.

Para el anexo de IA de la memoria, el grupo debe completar con honestidad: herramienta utilizada, tareas asistidas, fragmentos relevantes, errores detectados, cambios introducidos por el equipo y método de validación. Una recomendación de validación: probar manualmente el flujo completo, comprobar las entradas invalidadas, recargar el navegador para verificar persistencia y contrastar los eventos con los pedidos creados.
