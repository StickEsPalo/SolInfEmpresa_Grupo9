-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 22-09-2026 a las 18:40:59
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `juegos_y_puzles`
--
CREATE DATABASE IF NOT EXISTS `juegos_y_puzles` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `juegos_y_puzles`;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categorias`
--

CREATE TABLE `categorias` (
  `id` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `categorias`
--

INSERT INTO `categorias` (`id`, `nombre`, `descripcion`) VALUES
(1, 'Estrategia', 'Juegos en los que la planificación es importante.'),
(2, 'Familiar', 'Juegos sencillos para jugar en familia.'),
(3, 'Cooperativo', 'Juegos en los que los jugadores colaboran.'),
(4, 'Puzzle', 'Rompecabezas y puzzles de diferentes dificultades.'),
(5, 'Logicos\r\n', 'Juegos basados principalmente en lógica y patrones.');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `eventos`
--

CREATE TABLE `eventos` (
  `id` int(10) UNSIGNED NOT NULL,
  `tipo_evento` enum('producto.visto','carrito.producto_anadido','checkout.iniciado','pedido.creado','pago.simulado','incidencia.creada') NOT NULL,
  `usuario_id` int(10) UNSIGNED DEFAULT NULL,
  `producto_id` int(10) UNSIGNED DEFAULT NULL,
  `pedido_id` int(10) UNSIGNED DEFAULT NULL,
  `incidencia_id` int(10) UNSIGNED DEFAULT NULL,
  `datos` text DEFAULT NULL,
  `fecha_evento` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `eventos`
--

INSERT INTO `eventos` (`id`, `tipo_evento`, `usuario_id`, `producto_id`, `pedido_id`, `incidencia_id`, `datos`, `fecha_evento`) VALUES
(1, 'producto.visto', 1, 2, NULL, NULL, 'Producto consultado desde el catálogo', '2026-09-21 11:02:18'),
(2, 'carrito.producto_anadido', 1, 2, NULL, NULL, 'Cantidad: 1', '2026-09-21 11:02:18'),
(3, 'checkout.iniciado', 1, NULL, NULL, NULL, 'Inicio del proceso de compra', '2026-09-21 11:02:18'),
(4, 'pedido.creado', 1, NULL, 1, NULL, 'Pedido creado correctamente', '2026-09-21 11:02:18'),
(5, 'pago.simulado', 1, NULL, 1, NULL, 'Pago simulado aprobado', '2026-09-21 11:02:18'),
(6, 'incidencia.creada', 1, NULL, 1, 1, 'Incidencia relacionada con un pedido', '2026-09-21 11:02:18');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `incidencias`
--

CREATE TABLE `incidencias` (
  `id` int(10) UNSIGNED NOT NULL,
  `usuario_id` int(10) UNSIGNED NOT NULL,
  `pedido_id` int(10) UNSIGNED DEFAULT NULL,
  `asunto` varchar(150) NOT NULL,
  `descripcion` text NOT NULL,
  `estado` enum('abierta','en_revision','resuelta','cerrada') NOT NULL DEFAULT 'abierta',
  `prioridad` enum('baja','media','alta') NOT NULL DEFAULT 'media',
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_resolucion` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `incidencias`
--

INSERT INTO `incidencias` (`id`, `usuario_id`, `pedido_id`, `asunto`, `descripcion`, `estado`, `prioridad`, `fecha_creacion`, `fecha_resolucion`) VALUES
(1, 1, 1, 'Caja dañada', 'El cliente informa de que la caja del producto ha llegado dañada.', 'abierta', 'media', '2026-09-21 11:02:18', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `lineas_pedido`
--

CREATE TABLE `lineas_pedido` (
  `id` int(10) UNSIGNED NOT NULL,
  `pedido_id` int(10) UNSIGNED NOT NULL,
  `producto_id` int(10) UNSIGNED NOT NULL,
  `cantidad` int(10) UNSIGNED NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `lineas_pedido`
--

INSERT INTO `lineas_pedido` (`id`, `pedido_id`, `producto_id`, `cantidad`, `precio_unitario`, `subtotal`) VALUES
(1, 1, 2, 1, 18.90, 18.90),
(2, 1, 6, 1, 36.00, 36.00);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `origenes`
--

CREATE TABLE `origenes` (
  `id` int(10) UNSIGNED NOT NULL,
  `pais` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `origenes`
--

INSERT INTO `origenes` (`id`, `pais`) VALUES
(1, 'Alemania'),
(7, 'China'),
(6, 'Corea del Sur'),
(3, 'España'),
(2, 'Francia'),
(4, 'Italia'),
(5, 'Japón'),
(8, 'Polonia');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pagos`
--

CREATE TABLE `pagos` (
  `id` int(10) UNSIGNED NOT NULL,
  `pedido_id` int(10) UNSIGNED NOT NULL,
  `metodo_pago` enum('tarjeta_simulada','paypal_simulado','transferencia_simulada') NOT NULL,
  `estado` enum('pendiente','aprobado','rechazado') NOT NULL DEFAULT 'pendiente',
  `importe` decimal(10,2) NOT NULL,
  `referencia` varchar(50) NOT NULL,
  `fecha_pago` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `pagos`
--

INSERT INTO `pagos` (`id`, `pedido_id`, `metodo_pago`, `estado`, `importe`, `referencia`, `fecha_pago`) VALUES
(1, 1, 'tarjeta_simulada', 'aprobado', 71.33, 'PAGO-DEMO-0001', '2026-09-21 11:02:18');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedidos`
--

CREATE TABLE `pedidos` (
  `id` int(10) UNSIGNED NOT NULL,
  `codigo_pedido` varchar(30) NOT NULL,
  `usuario_id` int(10) UNSIGNED NOT NULL,
  `estado` enum('pendiente','pagado','preparando','enviado','entregado','cancelado') NOT NULL DEFAULT 'pendiente',
  `subtotal` decimal(10,2) NOT NULL DEFAULT 0.00,
  `impuestos` decimal(10,2) NOT NULL DEFAULT 0.00,
  `gastos_envio` decimal(10,2) NOT NULL DEFAULT 0.00,
  `descuento` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `fecha_pedido` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `pedidos`
--

INSERT INTO `pedidos` (`id`, `codigo_pedido`, `usuario_id`, `estado`, `subtotal`, `impuestos`, `gastos_envio`, `descuento`, `total`, `fecha_pedido`) VALUES
(1, 'PED-2026-0001', 1, 'pagado', 54.90, 11.53, 4.90, 0.00, 71.33, '2026-09-21 11:02:18');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

CREATE TABLE `productos` (
  `id` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text NOT NULL,
  `precio` decimal(10,2) NOT NULL,
  `stock` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `jugadores_min` int(10) UNSIGNED NOT NULL,
  `jugadores_max` int(10) UNSIGNED NOT NULL,
  `dificultad` enum('facil','media','dificil') NOT NULL,
  `tipo` enum('juego_de_mesa','puzzle') NOT NULL,
  `imagen` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_alta` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id`, `nombre`, `descripcion`, `precio`, `stock`, `jugadores_min`, `jugadores_max`, `dificultad`, `tipo`, `imagen`, `activo`, `fecha_alta`) VALUES
(1, 'Tokyo Metro', 'Juego de estrategia ambientado en la construcción de una red de metro.', 42.90, 15, 2, 5, 'dificil', 'juego_de_mesa', 'tokyo-metro.jpg', 1, '2026-09-21 11:02:17'),
(2, 'Hanamikoji', 'Juego de cartas de estrategia ambientado en el Japón tradicional.', 18.90, 20, 2, 2, 'media', 'juego_de_mesa', 'hanamikoji.jpg', 1, '2026-09-21 11:02:17'),
(3, 'Parks', 'Juego de estrategia y exploración basado en parques nacionales.', 39.90, 12, 1, 5, 'media', 'juego_de_mesa', 'parks.jpg', 1, '2026-09-21 11:02:17'),
(4, 'The Crew', 'Juego cooperativo de cartas basado en misiones espaciales.', 14.90, 25, 2, 5, 'media', 'juego_de_mesa', 'the-crew.jpg', 1, '2026-09-21 11:02:17'),
(5, 'Cascadia', 'Juego de colocación de losetas y creación de ecosistemas.', 34.90, 18, 1, 4, 'media', 'juego_de_mesa', 'cascadia.jpg', 1, '2026-09-21 11:02:17'),
(6, 'Azul', 'Juego logico basado en la colocación de piezas y patrones.', 36.90, 10, 2, 4, 'facil', 'juego_de_mesa', 'azul.jpg', 1, '2026-09-21 11:02:17'),
(7, 'Panda Garden', 'Juego familiar de colocación de piezas con temática asiática.', 27.90, 14, 2, 4, 'facil', 'juego_de_mesa', 'panda-garden.jpg', 1, '2026-09-21 11:02:17'),
(8, 'Kyoto Puzzle 1000', 'Puzzle de 1000 piezas inspirado en paisajes japoneses.', 21.90, 30, 1, 1, 'media', 'puzzle', 'kyoto-puzzle.jpg', 1, '2026-09-21 11:02:17'),
(9, 'European Village 1500', 'Puzzle de 1500 piezas inspirado en una villa europea.', 26.90, 20, 1, 1, 'dificil', 'puzzle', 'european-village.jpg', 1, '2026-09-21 11:02:17'),
(10, 'Japanese Seasons 500', 'Puzzle de 500 piezas basado en las cuatro estaciones japonesas.', 15.90, 25, 1, 1, 'facil', 'puzzle', 'japanese-seasons.jpg', 1, '2026-09-21 11:02:17');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `producto_categoria`
--

CREATE TABLE `producto_categoria` (
  `producto_id` int(10) UNSIGNED NOT NULL,
  `categoria_id` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `producto_categoria`
--

INSERT INTO `producto_categoria` (`producto_id`, `categoria_id`) VALUES
(1, 1),
(2, 1),
(3, 1),
(3, 2),
(4, 3),
(5, 1),
(5, 2),
(6, 2),
(6, 5),
(7, 2),
(8, 4),
(9, 4),
(10, 4);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `producto_origen`
--

CREATE TABLE `producto_origen` (
  `producto_id` int(10) UNSIGNED NOT NULL,
  `origen_id` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `producto_origen`
--

INSERT INTO `producto_origen` (`producto_id`, `origen_id`) VALUES
(1, 5),
(2, 5),
(3, 1),
(4, 1),
(5, 1),
(6, 1),
(7, 6),
(8, 5),
(9, 2),
(10, 5);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `rol` enum('cliente','administrador') NOT NULL DEFAULT 'cliente',
  `fecha_registro` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password`, `rol`, `fecha_registro`) VALUES
(1, 'Ana Demo', 'ana.demo@example.com', 'demo123', 'cliente', '2026-09-21 11:02:17'),
(2, 'Carlos Demo', 'carlos.demo@example.com', 'demo123', 'cliente', '2026-09-21 11:02:17'),
(3, 'Administrador Demo', 'admin@example.com', 'admin123', 'administrador', '2026-09-21 11:02:17');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `categorias`
--
ALTER TABLE `categorias`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indices de la tabla `eventos`
--
ALTER TABLE `eventos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `usuario_id` (`usuario_id`),
  ADD KEY `producto_id` (`producto_id`),
  ADD KEY `pedido_id` (`pedido_id`),
  ADD KEY `incidencia_id` (`incidencia_id`);

--
-- Indices de la tabla `incidencias`
--
ALTER TABLE `incidencias`
  ADD PRIMARY KEY (`id`),
  ADD KEY `usuario_id` (`usuario_id`),
  ADD KEY `pedido_id` (`pedido_id`);

--
-- Indices de la tabla `lineas_pedido`
--
ALTER TABLE `lineas_pedido`
  ADD PRIMARY KEY (`id`),
  ADD KEY `pedido_id` (`pedido_id`),
  ADD KEY `producto_id` (`producto_id`);

--
-- Indices de la tabla `origenes`
--
ALTER TABLE `origenes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `pais` (`pais`);

--
-- Indices de la tabla `pagos`
--
ALTER TABLE `pagos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `referencia` (`referencia`),
  ADD KEY `pedido_id` (`pedido_id`);

--
-- Indices de la tabla `pedidos`
--
ALTER TABLE `pedidos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `codigo_pedido` (`codigo_pedido`),
  ADD KEY `usuario_id` (`usuario_id`);

--
-- Indices de la tabla `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `producto_categoria`
--
ALTER TABLE `producto_categoria`
  ADD PRIMARY KEY (`producto_id`,`categoria_id`),
  ADD KEY `categoria_id` (`categoria_id`);

--
-- Indices de la tabla `producto_origen`
--
ALTER TABLE `producto_origen`
  ADD PRIMARY KEY (`producto_id`,`origen_id`),
  ADD KEY `origen_id` (`origen_id`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `categorias`
--
ALTER TABLE `categorias`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `eventos`
--
ALTER TABLE `eventos`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `incidencias`
--
ALTER TABLE `incidencias`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `lineas_pedido`
--
ALTER TABLE `lineas_pedido`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `origenes`
--
ALTER TABLE `origenes`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `pagos`
--
ALTER TABLE `pagos`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `pedidos`
--
ALTER TABLE `pedidos`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `eventos`
--
ALTER TABLE `eventos`
  ADD CONSTRAINT `eventos_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `eventos_ibfk_2` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `eventos_ibfk_3` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `eventos_ibfk_4` FOREIGN KEY (`incidencia_id`) REFERENCES `incidencias` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `incidencias`
--
ALTER TABLE `incidencias`
  ADD CONSTRAINT `incidencias_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `incidencias_ibfk_2` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `lineas_pedido`
--
ALTER TABLE `lineas_pedido`
  ADD CONSTRAINT `lineas_pedido_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `lineas_pedido_ibfk_2` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `pagos`
--
ALTER TABLE `pagos`
  ADD CONSTRAINT `pagos_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `pedidos`
--
ALTER TABLE `pedidos`
  ADD CONSTRAINT `pedidos_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `producto_categoria`
--
ALTER TABLE `producto_categoria`
  ADD CONSTRAINT `producto_categoria_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `producto_categoria_ibfk_2` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `producto_origen`
--
ALTER TABLE `producto_origen`
  ADD CONSTRAINT `producto_origen_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `producto_origen_ibfk_2` FOREIGN KEY (`origen_id`) REFERENCES `origenes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
