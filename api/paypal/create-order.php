<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/paypal.php';

requestMethod('POST');
requireCsrf();
$userId = requireAuth();
$data = requestJson(16000);
$customerInput = $data['customer'] ?? null;
$itemsInput = $data['items'] ?? null;
$promoCode = strtoupper(trim((string)($data['promoCode'] ?? '')));

if (!is_array($customerInput) || !is_array($itemsInput)
    || count($itemsInput) < 1 || count($itemsInput) > 40) {
    apiRespond(['error' => 'Datos del pedido incompletos.'], 422);
}

$customer = [
    'name' => trim((string)($customerInput['name'] ?? '')),
    'email' => trim((string)($customerInput['email'] ?? '')),
    'address' => trim((string)($customerInput['address'] ?? '')),
    'postalCode' => trim((string)($customerInput['postalCode'] ?? '')),
    'city' => trim((string)($customerInput['city'] ?? '')),
];
if (strlen($customer['name']) < 3 || strlen($customer['name']) > 120
    || !filter_var($customer['email'], FILTER_VALIDATE_EMAIL)
    || strlen($customer['address']) < 8 || strlen($customer['address']) > 220
    || !preg_match('/^\d{5}$/', $customer['postalCode'])
    || strlen($customer['city']) < 2 || strlen($customer['city']) > 100) {
    apiRespond(['error' => 'Revisa los datos de entrega.'], 422);
}

$quantities = [];
foreach ($itemsInput as $item) {
    if (!is_array($item)) {
        apiRespond(['error' => 'El carrito contiene una línea no válida.'], 422);
    }
    $productId = filter_var($item['productId'] ?? null, FILTER_VALIDATE_INT);
    $quantity = filter_var($item['quantity'] ?? null, FILTER_VALIDATE_INT);
    if ($productId === false || $quantity === false || $quantity < 1 || $quantity > 99) {
        apiRespond(['error' => 'El carrito contiene una línea no válida.'], 422);
    }
    $key = (string)$productId;
    $quantities[$key] = ($quantities[$key] ?? 0) + $quantity;
    if ($quantities[$key] > 99) {
        apiRespond(['error' => 'La cantidad de un producto supera el máximo permitido.'], 422);
    }
}
$items = [];
foreach ($quantities as $productId => $quantity) {
    $items[] = ['productId' => (int)$productId, 'quantity' => $quantity];
}

$paypalConfig = $config['paypal'] ?? [];
if (empty($paypalConfig['enabled'])) {
    apiRespond(['error' => 'PayPal no está activado en el servidor.'], 503);
}

try {
    $quote = db()->quoteOrder($items, $promoCode);   // total calculado en el servidor
    $response = paypalApi($paypalConfig, 'POST', '/v2/checkout/orders', [
        'intent' => 'CAPTURE',
        'purchase_units' => [[
            'description' => 'Pedido PlanetaFicha',
            'amount' => [
                'currency_code' => (string)($paypalConfig['currency'] ?? 'EUR'),
                'value' => number_format($quote['total'], 2, '.', ''),
            ],
        ]],
    ]);
} catch (DomainException $error) {
    apiRespond(['error' => $error->getMessage()], 422);
} catch (Throwable $error) {
    error_log('[PlanetaFicha paypal-create] ' . $error->getMessage());
    apiRespond(['error' => 'No se pudo conectar con PayPal.'], 502);
}

$paypalOrderId = (string)($response['data']['id'] ?? '');
if ($response['status'] !== 201 || $paypalOrderId === '') {
    error_log('[PlanetaFicha paypal-create] HTTP ' . $response['status'] . ' ' . json_encode($response['data']));
    apiRespond(['error' => 'PayPal no aceptó el pedido.'], 502);
}

// Guardamos en la sesión lo que se va a pagar, para usarlo al capturar
$_SESSION['paypal_pending'][$paypalOrderId] = [
    'customer' => $customer,
    'items' => $items,
    'promoCode' => $promoCode,
    'total' => $quote['total'],
];

apiRespond(['id' => $paypalOrderId]);
