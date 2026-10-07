<?php
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
requestMethod('GET');
$paypal = $config['paypal'] ?? [];
apiRespond([
    'enabled'  => !empty($paypal['enabled']) && !empty($paypal['client_id']),
    'clientId' => (string)($paypal['client_id'] ?? ''),
    'currency' => (string)($paypal['currency'] ?? 'EUR'),
]);