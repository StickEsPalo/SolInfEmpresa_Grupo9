<?php
declare(strict_types=1);

/**
 * Configuración de despliegue de PlanetaFicha.
 * Solo hay que sustituir los valores marcados con TU_... al publicar.
 */
return [
    'app' => [
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
        'enabled' => false,
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
