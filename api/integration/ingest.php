<?php
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/integration.php';
requestMethod('POST');
pfRequireIntegrationSecret($config);
$data = requestJson(40000);
$eventId = trim((string) ($data['eventId'] ?? ''));
$eventType = trim((string) ($data['eventType'] ?? ''));
$entityType = trim((string) ($data['entityType'] ?? ''));
$entityId = trim((string) ($data['entityId'] ?? ''));
$outcome = trim((string) ($data['outcome'] ?? 'synced'));
$summary = trim((string) ($data['summary'] ?? ''));
$executionId = trim((string) ($data['executionId'] ?? ''));
$occurredAt = trim((string) ($data['occurredAt'] ?? ''));
$payload = $data['payload'] ?? [];
$allowedTypes = ['order.created', 'payment.simulated', 'order.status_changed', 'stock.updated', 'support.requested', 'incident.created', 'agent.approved', 'workflow.error'];
$allowedOutcomes = ['synced', 'failed', 'pending_review', 'approved', 'rejected'];
if ($eventId === '' || strlen($eventId) > 120 || !in_array($eventType, $allowedTypes, true)
    || !in_array($entityType, ['order', 'incident', 'product', 'agent', 'workflow'], true)
    || $entityId === '' || strlen($entityId) > 120
    || !in_array($outcome, $allowedOutcomes, true) || !is_array($payload)) {
    apiRespond(['error' => 'El evento de integración no cumple el contrato.'], 422);
}
$timestamp = null;
if ($occurredAt !== '') {
    try { $timestamp = (new DateTimeImmutable($occurredAt))->format('Y-m-d H:i:s'); }
    catch (Throwable) { apiRespond(['error' => 'La fecha del evento no es válida.'], 422); }
}
$statement = db()->pdo()->prepare(
    'INSERT INTO integracion_ejecuciones
        (event_id, event_type, entity_type, entity_id, outcome, summary,
         n8n_execution_id, payload_json, occurred_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE outcome=VALUES(outcome), summary=VALUES(summary),
        n8n_execution_id=VALUES(n8n_execution_id), payload_json=VALUES(payload_json),
        processed_at=CURRENT_TIMESTAMP'
);
$statement->execute([
    $eventId, $eventType, $entityType, $entityId, $outcome, substr($summary, 0, 500),
    $executionId !== '' ? $executionId : null,
    json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $timestamp,
]);
apiRespond(['ok' => true, 'eventId' => $eventId, 'duplicateSafe' => true]);
