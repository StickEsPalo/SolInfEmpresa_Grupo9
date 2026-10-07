-- ================================================================
-- PlanetaFicha - base de datos actualizada al catálogo de la web
-- Generada a partir de juegos_y_puzles(4).sql
--
-- Se conserva la estructura transaccional existente (usuarios,
-- pedidos, líneas, pagos, direcciones, incidencias y eventos).
-- Se actualizan únicamente los datos que habían quedado obsoletos
-- respecto de la web y los campos necesarios para representar el
-- catálogo actual y sus variantes.
--
-- Nota: el stock no existe en products.js; los valores de stock
-- incluidos aquí son datos de prueba para mantener la tabla operativa.
-- La web actual sigue usando localStorage y todavía NO está conectada
-- a esta base de datos.
-- ================================================================

-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 24-09-2026 a las 11:18:36
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
(1, 'Estrategia', 'Juegos en los que la planificación y la toma de decisiones son importantes.'),
(2, 'Familiar', 'Juegos accesibles para jugar en familia o en grupos variados.'),
(3, 'Cooperativo', 'Juegos en los que los jugadores colaboran para alcanzar un objetivo común.'),
(4, 'Puzzle', 'Rompecabezas y juegos de resolución de problemas.');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `direcciones_pedido`
--

CREATE TABLE `direcciones_pedido` (
  `pedido_id` int(10) UNSIGNED NOT NULL,
  `direccion` varchar(255) NOT NULL,
  `codigo_postal` char(5) NOT NULL,
  `ciudad` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `eventos`
--

CREATE TABLE `eventos` (
  `id` int(10) UNSIGNED NOT NULL,
  `tipo_evento` enum('product.viewed','cart.item_added','checkout.started','order.created','payment.simulated','support.requested','user.registered','user.logged_in','user.logged_out') NOT NULL,
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
(1, 'product.viewed', 1, 1, NULL, NULL, 'Producto consultado desde el catálogo', '2026-09-21 11:02:18'),
(2, 'cart.item_added', 1, 1, NULL, NULL, 'Cantidad: 1', '2026-09-21 11:02:18'),
(3, 'checkout.started', 1, NULL, NULL, NULL, 'Inicio del proceso de compra', '2026-09-21 11:02:18'),
(4, 'order.created', 1, NULL, 1, NULL, 'Pedido creado correctamente', '2026-09-21 11:02:18'),
(5, 'payment.simulated', 1, NULL, 1, NULL, 'Pago simulado aprobado', '2026-09-21 11:02:18'),
(6, 'support.requested', 1, NULL, 1, 1, 'Solicitud de soporte relacionada con un pedido', '2026-09-21 11:02:18');

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
(1, 1, 1, 1, 19.99, 19.99),
(2, 1, 3, 1, 14.95, 14.95);

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
(2, 'España'),
(3, 'Francia'),
(4, 'India'),
(5, 'Japón'),
(6, 'Estados Unidos');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pagos`
--

CREATE TABLE `pagos` (
  `id` int(10) UNSIGNED NOT NULL,
  `pedido_id` int(10) UNSIGNED NOT NULL,
  `metodo_pago` enum('tarjeta_simulada','bizum_simulado','transferencia_simulada','paypal_simulado') NOT NULL,
  `estado` enum('pendiente','aprobado','rechazado') NOT NULL DEFAULT 'pendiente',
  `importe` decimal(10,2) NOT NULL,
  `referencia` varchar(50) NOT NULL,
  `fecha_pago` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `pagos`
--

INSERT INTO `pagos` (`id`, `pedido_id`, `metodo_pago`, `estado`, `importe`, `referencia`, `fecha_pago`) VALUES
(1, 1, 'tarjeta_simulada', 'aprobado', 50.63, 'PAGO-DEMO-0001', '2026-09-21 11:02:18');

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
(1, 'PED-2026-0001', 1, 'pagado', 34.94, 8.79, 6.90, 0.00, 50.63, '2026-09-21 11:02:18');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

CREATE TABLE `productos` (
  `id` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `subtitulo` varchar(150) NOT NULL,
  `descripcion` text NOT NULL,
  `precio` decimal(10,2) NOT NULL,
  `stock` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `jugadores_min` int(10) UNSIGNED NOT NULL,
  `jugadores_max` int(10) UNSIGNED NOT NULL,
  `dificultad` enum('facil','media','dificil') NOT NULL,
  `tipo` enum('juego_de_mesa','puzzle') NOT NULL,
  `imagen` varchar(255) DEFAULT NULL,
  `autor` varchar(150) NOT NULL,
  `duracion` varchar(50) NOT NULL,
  `mecanicas` varchar(255) NOT NULL,
  `idioma` varchar(150) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `producto_padre_id` int(10) UNSIGNED DEFAULT NULL,
  `fecha_alta` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id`, `nombre`, `subtitulo`, `descripcion`, `precio`, `stock`, `jugadores_min`, `jugadores_max`, `dificultad`, `tipo`, `imagen`, `autor`, `duracion`, `mecanicas`, `idioma`, `activo`, `producto_padre_id`, `fecha_alta`) VALUES
(1, 'Ajedrez', 'El clásico juego de reyes', 'Un verdadero duelo mental. Controla tus piezas, domina el tablero y atrapa al rey enemigo.', 19.99, 20, 2, 2, 'media', 'juego_de_mesa', 'img/products/ajedrez.jpg', 'Tradicional', '5-1200 min', 'movimiento de cuadrícula · abstracción', 'Sin dependencia', 1, NULL, '2026-09-21 11:02:17'),
(2, 'Shogi', 'El ajedrez japonés', 'El ajedrez japonés. Captura las fichas enemigas y úsalas a tu favor para capturar al rey enemigo.', 34.99, 20, 2, 2, 'dificil', 'juego_de_mesa', 'img/products/shogi.jpg', 'Tradicional', '10-720 min', 'reintroducción de piezas · movimiento de cuadrícula', 'Japonés / reglamento ES', 1, NULL, '2026-09-21 11:02:17'),
(3, 'Virus', '¡Contagia a tus amigos!', 'Enfréntate a una pandemia erradicando virus mientras boicoteas los órganos de tus rivales para ganar', 14.95, 20, 2, 6, 'facil', 'juego_de_mesa', 'img/products/virus.jpg', 'D. Cabrero, C. López, S. Santamaría', '20 min', 'gestión de mano · obstaculizar oponente', 'Español', 1, NULL, '2026-09-21 11:02:17'),
(4, 'Catan', 'Los colonos de Catan', 'Coloniza una isla desierta construyendo pueblos y carreteras mediante la gestión y el comercio de recursos.', 45.00, 20, 3, 4, 'media', 'juego_de_mesa', 'img/products/catan.jpg', 'Klaus Teuber', '60-90 min', 'comercio · dados · control de áreas', 'Español', 1, NULL, '2026-09-21 11:02:17'),
(5, 'Carcassonne', 'Construye tu propio reino', 'Coloca losetas para dar forma a la región medieval de Carcassonne y puntúa mediante tus seguidores (meeples).', 29.95, 20, 2, 5, 'facil', 'juego_de_mesa', 'img/products/carcassonne.jpg', 'Klaus-Jürgen Wrede', '35-45 min', 'colocación de losetas · control de área', 'Español', 1, NULL, '2026-09-21 11:02:17'),
(6, 'Pandemic', '¿Podrás salvar a la humanidad?', 'Trabajad en equipo como médicos especialistas para contener brotes globales y descubrir la cura a cuatro enfermedades.', 39.99, 20, 2, 4, 'media', 'juego_de_mesa', 'img/products/pandemic.jpg', 'Matt Leacock', '45 min', 'cooperativo · puntos de acción · gestión de mano', 'Español', 1, NULL, '2026-09-21 11:02:17'),
(7, 'Dixit', 'Una imagen vale más que mil palabras', 'Usa la imaginación y la sutileza para dar pistas sobre tus cartas y evita que todos las adivinen.', 32.90, 20, 3, 6, 'facil', 'juego_de_mesa', 'img/products/dixit.jpg', 'Jean-Louis Roubira', '30 min', 'voto secreto · narración', 'Español', 1, NULL, '2026-09-21 11:02:17'),
(8, 'Let''s Catch the Lion!', 'Dobutsu Shogi', 'Una versión más simplificada del shogi. Con animales como piezas de juego.', 18.00, 20, 2, 2, 'facil', 'juego_de_mesa', 'img/products/dobutsu-shogi.jpg', 'Madoka Kitao', '10-15 min', 'movimiento de cuadrícula · iniciación', 'Reglamento multilenguaje', 1, NULL, '2026-09-21 11:02:17'),
(9, 'Oshi', 'El juego de la influencia', 'Inspirado en la corte japonesa imperial, empuja las valiosas torres de tu oponente fuera del tablero para ganar', 25.00, 20, 2, 2, 'facil', 'juego_de_mesa', 'img/products/oshi.jpg', 'Tyler Bielman', '17-20 min', 'empuje de piezas · movimiento de cuadrícula', 'Sin dependencia', 1, NULL, '2026-09-21 11:02:17'),
(10, 'Tragedy Looper', 'Viajes en el tiempo y misterio', 'Un jugador, la Mente Maestra, crea trágicos bucles temporales, mientras que los demás deducen cómo evitarlos.', 42.00, 20, 2, 4, 'dificil', 'juego_de_mesa', 'img/products/tragedy-looper.jpg', 'BakaFire', '120 min', 'deducción · bucles temporales', 'Inglés / Traducción ES', 1, NULL, '2026-09-21 11:02:17'),
(11, 'Kabuto Sumo', 'Kabuto Sumo', 'Una ardua lucha de escarabajos rinoceronte cuyo objetivo es empujar al oponente fuera del ring.', 34.00, 20, 2, 4, 'facil', 'juego_de_mesa', 'img/products/kabuto-sumo.jpg', 'Tony Miller', '15 min', 'empuje de piezas · habilidad', 'Inglés', 1, NULL, '2026-09-21 11:02:17'),
(12, 'Rush Hour', 'El atasco más adictivo', 'Desliza los coches del atasco para abrir camino a tu vehículo hasta la salida. 40 desafíos de dificultad creciente.', 24.95, 20, 1, 1, 'media', 'puzzle', 'img/products/rush-hour.jpg', 'Nob Yoshigahara', '5-30 min', 'deslizamiento de piezas · resolución de problemas', 'Sin dependencia', 1, NULL, '2026-09-21 11:02:17'),
(13, 'Ajedrez', 'Edición caballeros templarios', 'Juega al ajedrez al más estilo medieval. Guia a tus caballeros templarios y álzate victorioso en esta cruzada.', 430.00, 10, 2, 2, 'media', 'juego_de_mesa', 'img/products/ajedrez-430.jpg', 'Tradicional', '5-1200 min', 'movimiento de cuadrícula · abstracción', 'Sin dependencia', 1, 1, '2026-09-21 11:02:17'),
(14, 'Ajedrez', 'Edición premium', 'Juega al ajedrez y disfruta de un tablero y piezas de la más alta gama. Tan solo prepara tu riñón para comprarlo...', 17500.00, 10, 2, 2, 'media', 'juego_de_mesa', 'img/products/ajedrez-17500.jpg', 'Tradicional', '5-1200 min', 'movimiento de cuadrícula · abstracción', 'Sin dependencia', 1, 1, '2026-09-21 11:02:17'),
(15, 'Catan', 'Expansión Navegantes', 'Juega y disfruta de esta expansion navegantes de catan.', 46.00, 10, 3, 4, 'media', 'juego_de_mesa', 'img/products/catan-navegantes.jpg', 'Klaus Teuber', '60-90 min', 'comercio · dados · control de áreas', 'Español', 1, 4, '2026-09-21 11:02:17'),
(16, 'Catan', 'Expansión Piratas y Exploradores', 'Juega y disfruta de esta expansion piratas y exploradores de catan.', 46.00, 10, 3, 4, 'media', 'juego_de_mesa', 'img/products/catan-piratas-y-exploradores.jpg', 'Klaus Teuber', '60-90 min', 'comercio · dados · control de áreas', 'Español', 1, 4, '2026-09-21 11:02:17');

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
(3, 2),
(4, 1),
(5, 2),
(6, 3),
(7, 2),
(8, 1),
(9, 1),
(10, 3),
(11, 2),
(12, 4),
(13, 1),
(14, 1),
(15, 1),
(16, 1);

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
(1, 4),
(2, 5),
(3, 2),
(4, 1),
(5, 1),
(6, 6),
(7, 3),
(8, 5),
(9, 5),
(9, 6),
(10, 5),
(11, 5),
(11, 6),
(12, 5),
(12, 6),
(13, 4),
(14, 4),
(15, 1),
(16, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `apellidos` varchar(150) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `rol` enum('cliente','administrador') NOT NULL DEFAULT 'cliente',
  `fecha_registro` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `nombre`, `apellidos`, `email`, `password`, `rol`, `fecha_registro`) VALUES
(1, 'Ana', 'Demo', 'ana.demo@example.com', '$2y$12$tUK5ZR8m0ywviD4yy5C.iO46jcbxtPzmTDd9d3X.nH9p8TYA/Bp8.', 'cliente', '2026-09-21 11:02:17'),
(2, 'Carlos', 'Demo', 'carlos.demo@example.com', '$2y$12$tUK5ZR8m0ywviD4yy5C.iO46jcbxtPzmTDd9d3X.nH9p8TYA/Bp8.', 'cliente', '2026-09-21 11:02:17'),
(3, 'Administrador', 'Demo', 'admin@example.com', '$2y$12$Wn/8i1dNQdh7upzDZDF7yO3xOFG0j5d1ShVMdMlkprKzUMTdcEPX6', 'administrador', '2026-09-21 11:02:17');

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
-- Indices de la tabla `direcciones_pedido`
--
ALTER TABLE `direcciones_pedido`
  ADD PRIMARY KEY (`pedido_id`);

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
  ADD PRIMARY KEY (`id`),
  ADD KEY `producto_padre_id` (`producto_padre_id`);

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
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

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
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

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
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `direcciones_pedido`
--
ALTER TABLE `direcciones_pedido`
  ADD CONSTRAINT `direcciones_pedido_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

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

-- Relación de variantes con su producto base.
ALTER TABLE `productos`
  ADD CONSTRAINT `productos_ibfk_padre` FOREIGN KEY (`producto_padre_id`) REFERENCES `productos` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
