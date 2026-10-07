<?php
require_once __DIR__ . '/../lib/bootstrap.php';

requestMethod('GET');
requireAdmin();

$orders = db()->allOrders();
$totalRevenue = array_sum(
    array_map(
        fn ($order) => (float) $order['totals']['total'],
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
