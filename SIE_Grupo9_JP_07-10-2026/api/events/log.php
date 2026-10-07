<?php
require_once __DIR__ . '/../lib/bootstrap.php';

requestMethod('POST');
requireCsrf();

$userId = filter_var(
    $_SESSION['user_id'] ?? null,
    FILTER_VALIDATE_INT,
);
$data = requestJson(8000);
$type = trim((string) ($data['type'] ?? ''));
$payload = is_array($data['payload'] ?? null)
    ? $data['payload']
    : [];
$productId = filter_var(
    $data['productId'] ?? null,
    FILTER_VALIDATE_INT,
);
$orderId = filter_var(
    $data['orderId'] ?? null,
    FILTER_VALIDATE_INT,
);
$allowedTypes = [
    'product.viewed',
    'cart.item_added',
    'checkout.started',
    'support.requested',
];

if (!in_array($type, $allowedTypes, true)) {
    apiRespond(['error' => 'Evento no permitido.'], 422);
}

db()->addEvent(
    $type,
    $userId !== false ? (int) $userId : null,
    $productId !== false ? (int) $productId : null,
    $orderId !== false ? (int) $orderId : null,
    $payload,
);

apiRespond(['ok' => true]);
