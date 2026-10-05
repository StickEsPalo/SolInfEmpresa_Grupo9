# Prueba virtual

Ejecuta desde la raíz del proyecto:

```bash
python tests/virtual_e2e.py
```

La prueba crea un entorno temporal, levanta el servidor PHP integrado y usa el adaptador `mock` con la misma API que se usa en producción. Verifica:

- sesión anónima y CSRF;
- protección del Back-office;
- login de cliente y administrador;
- registro y validaciones;
- separación de pedidos por usuario;
- creación de pedidos y cálculo server-side;
- descuento de stock;
- eventos e incidencias;
- carga HTTP del índice y componentes;
- integración estática entre frontend y API;
- sintaxis de PHP y JavaScript;
- estructura del SQL y contraseñas demo con hash.

No sustituye a una prueba contra un servidor MySQL real. El entorno donde se preparó este paquete no dispone de `pdo_mysql`/MySQL, por lo que esa última comprobación debe hacerse una vez creado el hosting y la base de datos.
