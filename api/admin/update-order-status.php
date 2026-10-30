<?php
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/integration.php';
requestMethod('POST');
requireCsrf();
$adminId = requireAdmin();
$data = requestJson(4000);
$orderId = filter_var($data['orderId'] ?? null, FILTER_VALIDATE_INT);
$newStatus = trim((string) ($data['status'] ?? ''));
$allowedStatuses = ['pendiente', 'pagado', 'preparando', 'enviado', 'entregado', 'cancelado'];
if (!$orderId || $orderId < 1 || !in_array($newStatus, $allowedStatuses, true)) {
    apiRespond(['error' => 'Pedido o estado no válido.'], 422);
}
$pdo = db()->pdo();
$find = $pdo->prepare('SELECT codigo_pedido, estado FROM pedidos WHERE id = ? LIMIT 1');
$find->execute([$orderId]);
$order = $find->fetch();
if (!$order) apiRespond(['error' => 'No se encontró el pedido.'], 404);
$oldStatus = (string) $order['estado'];
if ($oldStatus === $newStatus) apiRespond(['ok' => true, 'changed' => false, 'status' => $newStatus]);
$update = $pdo->prepare('UPDATE pedidos SET estado = ? WHERE id = ?');
$update->execute([$newStatus, $orderId]);
$userLookup = $pdo->prepare('SELECT usuario_id FROM pedidos WHERE id = ?');
$userLookup->execute([$orderId]);
$customerUserId = (int) $userLookup->fetchColumn();
db()->addEvent('order.status_changed', $customerUserId, null, $orderId, [
    'from' => $oldStatus,
    'to' => $newStatus,
    'changedBy' => $adminId,
]);
$eventId = 'order:' . $orderId . ':status:' . gmdate('YmdHis') . '-' . bin2hex(random_bytes(3));
$integration = pfPublishWorkflowEvent($config, [
    'eventId' => $eventId,
    'type' => 'order.status_changed',
    'occurredAt' => date(DATE_ATOM),
    'entity' => ['type' => 'order', 'id' => $order['codigo_pedido']],
    'data' => ['orderId' => $orderId, 'orderCode' => $order['codigo_pedido'], 'from' => $oldStatus, 'to' => $newStatus, 'changedBy' => $adminId],
]);
apiRespond(['ok' => true, 'changed' => true, 'status' => $newStatus, 'workflowAccepted' => $integration['sent']]);
