<?php
require_once __DIR__ . '/lib/bootstrap.php';

requestMethod('GET');

try {
    $products = db()->products();

    apiRespond([
        'ok' => true,
        'database' => 'connected',
        'driver' => $config['db']['driver'] ?? 'unknown',
        'products' => count($products),
    ]);
} catch (Throwable $error) {
    error_log('[PlanetaFicha health] ' . $error->getMessage());

    apiRespond([
        'ok' => false,
        'database' => 'error',
    ], 500);
}
