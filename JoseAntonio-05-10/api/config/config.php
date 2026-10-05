<?php
declare(strict_types=1);

return [
    'app' => [
        'base_url' => 'https://TU-DOMINIO.COM',
        'timezone' => 'Europe/Madrid',
    ],

    'db' => [
        'driver' => 'mysql',
        'host' => 'bbddsrv57.dd.scip.local',
        'port' => 3306,
        'name' => 'ddb279292',
        'user' => 'ddb279292',
        'password' => 'j{V/dJ{NsB?4LT',
        'charset' => 'utf8mb4',
    ],

    'mail' => [
        'enabled' => true,     // habilitar cuando se quiera conectar web-correo
        'host' => 'smtp.dondominio.com',
        'port' => 587,
        'username' => 'correocorporativo@planetaficha.onl',
        'password' => '',
        'from_email' => 'correocorporativo@planetaficha.onl',
        'from_name' => 'PlanetaFicha',
        'to_email' => 'correocorporativo@planetaficha.onl',
        'timeout' => 15,
    ],

    'security' => [
        'session_name' => 'planetaficha_session',
    ],
];