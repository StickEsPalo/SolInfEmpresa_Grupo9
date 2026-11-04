<?php
require_once __DIR__ . '/../lib/bootstrap.php';

requestMethod('GET');
requireAdmin();

$orders = db()->allOrders();
// Los pedidos pendientes o cancelados no cuentan como ingreso.
$totalRevenue = array_sum(
    array_map(
        fn ($order) => in_array($order['status'], ['pendiente', 'cancelado'], true)
            ? 0.0
            : (float) $order['totals']['total'],
        $orders,
    ),
);

apiRespond([
    'orders' => $orders,
    'stats' => [
        'orders' => count($orders),
        'revenue' => round($totalRevenue, 2),
    ],
]);
