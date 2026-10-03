<?php require_once __DIR__.'/../lib/bootstrap.php'; requestMethod('GET'); $id=requireAuth(); apiRespond(['orders'=>db()->myOrders($id)]);
