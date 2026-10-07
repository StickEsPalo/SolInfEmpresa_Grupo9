<?php
/**
 * Configuración única de despliegue de PlanetaFicha.
 *
 * En el hosting solo tendrás que rellenar los datos de tu dominio, MySQL y SMTP.
 * Nunca pongas este contenido dentro de JavaScript.
 */
return [
    'app' => [
        // Ejemplo: https://planetaficha.onl
        'base_url' => 'https://TU-DOMINIO-AQUI',
        'timezone' => 'Europe/Madrid',
    ],

    'db' => [
        'driver' => 'mysql',
        'host' => 'localhost',
        'port' => 3306,
        'name' => 'juegos_y_puzles',
        'user' => 'TU_USUARIO_MYSQL',
        'password' => 'TU_PASSWORD_MYSQL',
        'charset' => 'utf8mb4',
    ],

    'mail' => [
        // El pedido/incidencia se guarda en BD aunque el SMTP esté desactivado.
        // Actívalo solo después de crear/configurar el buzón y poner su clave.
        'enabled' => false,
        'host' => 'smtp.dondominio.com',
        'port' => 587,
        'username' => 'correocorporativo@planetaficha.onl',
        'password' => '', // Introducir únicamente en api/config/config.php del servidor.
        'from_email' => 'correocorporativo@planetaficha.onl',
        'from_name' => 'PlanetaFicha',
        'to_email' => 'correocorporativo@planetaficha.onl',
        'ehlo' => 'planetaficha.onl',
        'timeout' => 15,
    ],

    'security' => [
        'session_name' => 'planetaficha_session',
    ],
];
