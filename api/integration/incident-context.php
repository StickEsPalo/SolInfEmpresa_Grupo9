<?php
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/integration.php';
requestMethod('GET');
pfRequireIntegrationSecret($config);
$incidentId = filter_input(INPUT_GET, 'incidentId', FILTER_VALIDATE_INT);
if (!$incidentId || $incidentId < 1) apiRespond(['error' => 'incidentId debe ser un entero positivo.'], 422);
$pdo = db()->pdo();
$statement = $pdo->prepare(
    'SELECT id, usuario_id, pedido_id, asunto, descripcion, estado, prioridad,
            fecha_creacion, fecha_resolucion
     FROM incidencias WHERE id = ? LIMIT 1'
);
$statement->execute([$incidentId]);
$incident = $statement->fetch();
if (!$incident) apiRespond(['error' => 'No se encontró la incidencia.'], 404);
$ordersStatement = $pdo->prepare(
    'SELECT codigo_pedido, estado, total, fecha_pedido FROM pedidos
     WHERE usuario_id = ? ORDER BY fecha_pedido DESC LIMIT 5'
);
$ordersStatement->execute([(int) $incident['usuario_id']]);
apiRespond(['incident' => $incident, 'recentOrders' => $ordersStatement->fetchAll()]);
