<?php
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
requestMethod('GET');
requireAdmin();
$pdo = db()->pdo();

$orderMetrics = $pdo->query(
    "SELECT COUNT(*) AS orders, COALESCE(SUM(total), 0) AS revenue
     FROM pedidos"
)->fetch();
$openIncidents = (int) $pdo->query(
    "SELECT COUNT(*) FROM incidencias WHERE estado IN ('abierta', 'en_revision')"
)->fetchColumn();
$averageResolutionHours = $pdo->query(
    "SELECT AVG(TIMESTAMPDIFF(MINUTE, fecha_creacion, fecha_resolucion)) / 60
     FROM incidencias WHERE fecha_resolucion IS NOT NULL"
)->fetchColumn();
$checkouts = (int) $pdo->query(
    "SELECT COUNT(*) FROM eventos WHERE tipo_evento = 'checkout.started'"
)->fetchColumn();
$createdOrders = (int) $pdo->query(
    "SELECT COUNT(*) FROM eventos WHERE tipo_evento = 'order.created'"
)->fetchColumn();
$integrationCounts = $pdo->query(
    "SELECT outcome, COUNT(*) AS total FROM integracion_ejecuciones GROUP BY outcome"
)->fetchAll();
$ordersByStatus = $pdo->query(
    'SELECT estado AS status, COUNT(*) AS total
     FROM pedidos GROUP BY estado ORDER BY total DESC, estado'
)->fetchAll();
$topProducts = $pdo->query(
    'SELECT pr.nombre AS name, SUM(li.cantidad) AS quantity
     FROM lineas_pedido li JOIN productos pr ON pr.id = li.producto_id
     GROUP BY pr.id, pr.nombre ORDER BY quantity DESC, pr.nombre LIMIT 5'
)->fetchAll();
$dailyOrders = $pdo->query(
    'SELECT DATE(fecha_pedido) AS day, COUNT(*) AS total
     FROM pedidos WHERE fecha_pedido >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
     GROUP BY DATE(fecha_pedido) ORDER BY day'
)->fetchAll();
$dailyRevenue = $pdo->query(
    "SELECT DATE(fecha_pedido) AS day, COALESCE(SUM(total), 0) AS total
     FROM pedidos
     WHERE fecha_pedido >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       AND estado = 'pagado'
     GROUP BY DATE(fecha_pedido) ORDER BY day"
)->fetchAll();
$incidentHours = $pdo->query(
    "SELECT DATE_FORMAT(fecha_creacion, '%Y-%m-%d %H:00:00') AS hour, COUNT(*) AS total
     FROM incidencias
     WHERE fecha_creacion >= DATE_SUB(NOW(), INTERVAL 23 HOUR)
     GROUP BY DATE_FORMAT(fecha_creacion, '%Y-%m-%d %H:00:00')
     ORDER BY hour"
)->fetchAll();
$incidentDays = $pdo->query(
    "SELECT DATE(fecha_creacion) AS day, COUNT(*) AS total
     FROM incidencias
     WHERE fecha_creacion >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
     GROUP BY DATE(fecha_creacion)
     ORDER BY day"
)->fetchAll();
$recentIncidents = $pdo->query(
    'SELECT i.id, i.usuario_id, i.pedido_id, i.asunto, i.descripcion,
            i.estado, i.prioridad, i.fecha_creacion, i.fecha_resolucion,
            u.nombre, u.apellidos, u.email
     FROM incidencias i
     JOIN usuarios u ON u.id = i.usuario_id
     ORDER BY i.fecha_creacion DESC, i.id DESC
     LIMIT 50'
)->fetchAll();
$serverNow = $pdo->query('SELECT NOW()')->fetchColumn();
$recentOrders = $pdo->query(
    'SELECT id, codigo_pedido, estado, total, fecha_pedido
     FROM pedidos ORDER BY fecha_pedido DESC LIMIT 25'
)->fetchAll();
$proposalCounts = $pdo->query(
    'SELECT status, COUNT(*) AS total FROM propuestas_agente GROUP BY status'
)->fetchAll();
$proposals = $pdo->query(
    'SELECT id, source_event_id, incident_id, case_type, consulted_data_json,
            proposed_action, rationale, confidence, priority, risks, status,
            review_note, created_at, reviewed_at
     FROM propuestas_agente ORDER BY created_at DESC LIMIT 30'
)->fetchAll();
foreach ($proposals as &$proposal) {
    $proposal['consultedData'] = json_decode($proposal['consulted_data_json'], true) ?: [];
    unset($proposal['consulted_data_json']);
    $proposal['confidence'] = (float) $proposal['confidence'];
}
unset($proposal);
$runs = $pdo->query(
    'SELECT event_id, event_type, entity_type, entity_id, outcome, summary,
            n8n_execution_id, occurred_at, processed_at
     FROM integracion_ejecuciones ORDER BY processed_at DESC LIMIT 40'
)->fetchAll();
$integrationSummary = ['synced' => 0, 'failed' => 0, 'pending_review' => 0, 'approved' => 0, 'rejected' => 0];
foreach ($integrationCounts as $row) {
    $integrationSummary[$row['outcome']] = (int) $row['total'];
}
$agentSummary = ['pendiente_revision' => 0, 'aprobada' => 0, 'rechazada' => 0, 'ejecutada_simulada' => 0];
foreach ($proposalCounts as $row) {
    $agentSummary[$row['status']] = (int) $row['total'];
}
apiRespond([
    'metrics' => [
        'orders' => (int) $orderMetrics['orders'],
        'simulatedRevenue' => (float) $orderMetrics['revenue'],
        'openIncidents' => $openIncidents,
        'averageResolutionHours' => $averageResolutionHours !== null ? round((float) $averageResolutionHours, 2) : null,
        'successfulIntegrations' => $integrationSummary['synced'],
        'failedIntegrations' => $integrationSummary['failed'],
        'conversionRate' => $checkouts > 0 ? round($createdOrders / $checkouts * 100, 1) : null,
        'pendingAgentReviews' => $agentSummary['pendiente_revision'],
        'approvedAgentActions' => $agentSummary['aprobada'] + $agentSummary['ejecutada_simulada'],
    ],
    'integrationOutcomes' => $integrationSummary,
    'agentOutcomes' => $agentSummary,
    'ordersByStatus' => $ordersByStatus,
    'topProducts' => $topProducts,
    'dailyOrders' => $dailyOrders,
    'dailyRevenue' => $dailyRevenue,
    'incidentHours' => $incidentHours,
    'incidentDays' => $incidentDays,
    'recentIncidents' => $recentIncidents,
    'serverNow' => $serverNow,
    'recentOrders' => $recentOrders,
    'proposals' => $proposals,
    'integrationRuns' => $runs,
]);
