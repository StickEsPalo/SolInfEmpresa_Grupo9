<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/mail.php';
require_once __DIR__ . '/../lib/paypal.php';

requestMethod('POST');
requireCsrf();
$userId = requireAuth();
$data = requestJson(2000);
$paypalOrderId = trim((string)($data['orderID'] ?? ''));

$pending = $_SESSION['paypal_pending'][$paypalOrderId] ?? null;
if ($paypalOrderId === '' || !is_array($pending)) {
    apiRespond(['error' => 'No se encontró el pago de PayPal en tu sesión.'], 404);
}

try {
    $response = paypalApi($config['paypal'] ?? [], 'POST', '/v2/checkout/orders/' . rawurlencode($paypalOrderId) . '/capture');
} catch (Throwable $error) {
    error_log('[PlanetaFicha paypal-capture] ' . $error->getMessage());
    apiRespond(['error' => 'No se pudo confirmar el pago con PayPal.'], 502);
}

$capture = $response['data']['purchase_units'][0]['payments']['captures'][0] ?? [];
$capturedAmount = (float)($capture['amount']['value'] ?? 0);
if ($response['status'] !== 201
    || ($response['data']['status'] ?? '') !== 'COMPLETED'
    || abs($capturedAmount - (float)$pending['total']) > 0.001) {
    error_log('[PlanetaFicha paypal-capture] HTTP ' . $response['status'] . ' ' . json_encode($response['data']));
    apiRespond(['error' => 'PayPal no completó el pago.'], 402);
}

unset($_SESSION['paypal_pending'][$paypalOrderId]);

try {
    $order = db()->createOrder($userId, $pending['customer'], $pending['items'], 'PayPal', $pending['promoCode'],
        'PAYPAL-' . (string)($capture['id'] ?? $paypalOrderId));
} catch (Throwable $error) {
    error_log('[PlanetaFicha paypal-pedido] Pago ' . $paypalOrderId . ' capturado sin pedido: ' . $error->getMessage());
    apiRespond(['error' => 'El pago se completó, pero no se pudo guardar el pedido. Contacta con soporte indicando ' . $paypalOrderId . '.'], 500);
}

// Release the PHP session lock before contacting the SMTP server.
if (session_status() === PHP_SESSION_ACTIVE) {
    session_write_close();
}
$mailSent = false;
try {
    $mailSent = pfSendOrderNotice($config['mail'] ?? [], $order, $pending['customer']);
} catch (Throwable $error) {
    error_log('[PlanetaFicha pedido-mail] ' . $error->getMessage());
}

apiRespond([
    'ok' => true,
    'order' => $order,
    'mailSent' => $mailSent,
], 201);