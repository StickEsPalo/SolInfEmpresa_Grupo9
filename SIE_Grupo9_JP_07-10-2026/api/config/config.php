<?php
declare(strict_types=1);

return [
    'app' => [
        'base_url' => 'https://planetaficha.onl',
        'timezone' => 'Europe/Madrid',
    ],

    'db' => [
        'driver' => 'mysql',
        'host' => 'bbddsrv57.dd.scip.local',
        'port' => 3306,
        'name' => 'ddb279292',
        'user' => 'ddb279292',
        'password' => 'PASSWORD_AQUI',
        'charset' => 'utf8mb4',
    ],

    'mail' => [
        'enabled' => true,     // habilitar cuando se quiera conectar web-correo
        'host' => 'smtp.dondominio.com',
        'port' => 587,
        'username' => 'correocorporativo@planetaficha.onl',
        'password' => 'PASSWORD_AQUI',
        'from_email' => 'correocorporativo@planetaficha.onl',
        'from_name' => 'PlanetaFicha',
        'to_email' => 'correocorporativo@planetaficha.onl',
        'timeout' => 15,
    ],

    'paypal' => [
        'enabled' => true,
        'client_id'=> 'CLIENT_ID_AQUI',
        'secret'=> 'SECRET_KEY_AQUI',
        'api_base'=> 'https://api-m.sandbox.paypal.com',
        'currency'=> 'EUR',
    ],

    'security' => [
        'session_name' => 'planetaficha_session',
    ],
];