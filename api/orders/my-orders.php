<?php
require_once __DIR__ . '/../lib/bootstrap.php';

requestMethod('GET');
$userId = requireAuth();

apiRespond([
    'orders' => db()->myOrders($userId),
]);
