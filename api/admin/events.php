<?php
require_once __DIR__ . '/../lib/bootstrap.php';

requestMethod('GET');
requireAdmin();

apiRespond([
    'events' => db()->events(),
]);
