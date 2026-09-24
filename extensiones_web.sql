-- Ejecutar una vez después de juegos_y_puzles.sql.
-- La estructura original no tiene campos de entrega; esta tabla los añade
-- vinculados al pedido sin modificar el volcado proporcionado.
CREATE TABLE IF NOT EXISTS direcciones_pedido (
  pedido_id int(10) UNSIGNED NOT NULL,
  direccion varchar(255) NOT NULL,
  codigo_postal char(5) NOT NULL,
  ciudad varchar(100) NOT NULL,
  PRIMARY KEY (pedido_id),
  CONSTRAINT direcciones_pedido_ibfk_1
    FOREIGN KEY (pedido_id) REFERENCES pedidos (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
