# Prueba virtual

Ejecuta desde la raíz del proyecto:

```bash
python tests/virtual_e2e.py
```

Requiere PHP 8.1 o posterior, Node.js, Python 3 y la dependencia `requests` (`python -m pip install requests`). La prueba no usa la configuración de producción: crea una copia temporal con el adaptador mock y SMTP apagado.

La prueba crea un entorno temporal, levanta el servidor PHP integrado y usa el adaptador `mock` con la misma API que se usa en producción. Verifica:

- sesión anónima y CSRF;
- protección del Back-office;
- login de cliente y administrador;
- registro y validaciones;
- separación de pedidos por usuario;
- creación de pedidos y cálculo server-side;
- descuento de stock;
- eventos e incidencias;
- estado explícito del aviso de correo en modo mock (SMTP desactivado), manteniendo los registros;
- exclusión del archivo local de configuración real del repositorio;
- carga HTTP del índice y componentes;
- integración estática entre frontend y API;
- sintaxis de PHP y JavaScript;
- estructura del SQL y contraseñas demo con hash.

No sustituye a una prueba contra un servidor MySQL real. El entorno donde se preparó este paquete no dispone de `pdo_mysql`/MySQL, por lo que esa última comprobación debe hacerse una vez creado el hosting y la base de datos.
