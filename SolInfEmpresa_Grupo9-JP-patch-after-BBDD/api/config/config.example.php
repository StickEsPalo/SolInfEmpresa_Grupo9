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
        'enabled' => true,
        'host' => 'smtp.TU-DOMINIO-AQUI',
        'port' => 587,
        'username' => 'correo@TU-DOMINIO-AQUI',
        'password' => 'TU_PASSWORD_SMTP',
        'from_email' => 'correo@TU-DOMINIO-AQUI',
        'from_name' => 'PlanetaFicha',
        'to_email' => 'correo@TU-DOMINIO-AQUI',
        'timeout' => 15,
    ],

    'security' => [
        'session_name' => 'planetaficha_session',
    ],
];
