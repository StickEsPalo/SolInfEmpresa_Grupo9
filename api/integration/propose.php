<?php
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/integration.php';
requestMethod('POST');
pfRequireIntegrationSecret($config);
$data = requestJson(12000);
$eventId = trim((string) ($data['sourceEventId'] ?? ''));
$incidentId = filter_var($data['incidentId'] ?? null, FILTER_VALIDATE_INT);
$caseType = trim((string) ($data['caseType'] ?? ''));
$consultedData = $data['consultedData'] ?? null;
$action = trim((string) ($data['proposedAction'] ?? ''));
$rationale = trim((string) ($data['rationale'] ?? ''));
$confidence = filter_var($data['confidence'] ?? null, FILTER_VALIDATE_FLOAT);
$priority = trim((string) ($data['priority'] ?? 'media'));
$risks = trim((string) ($data['risks'] ?? ''));
if ($eventId === '' || strlen($eventId) > 120 || $incidentId === false || $incidentId < 1
    || $caseType === '' || strlen($caseType) > 80 || !is_array($consultedData)
    || $action === '' || strlen($action) > 120 || $rationale === '' || strlen($rationale) > 2000
    || $confidence === false || $confidence < 0 || $confidence > 1
    || !in_array($priority, ['baja', 'media', 'alta', 'urgente'], true)
    || $risks === '' || strlen($risks) > 2000) {
    apiRespond(['error' => 'La propuesta del agente está incompleta o no es válida.'], 422);
}
$pdo = db()->pdo();
$exists = $pdo->prepare('SELECT id FROM incidencias WHERE id = ?');
$exists->execute([$incidentId]);
if (!$exists->fetchColumn()) apiRespond(['error' => 'La incidencia indicada no existe.'], 404);
$insert = $pdo->prepare(
    'INSERT INTO propuestas_agente
        (source_event_id, incident_id, case_type, consulted_data_json,
         proposed_action, rationale, confidence, priority, risks)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE source_event_id=VALUES(source_event_id)'
);
$insert->execute([
    $eventId, $incidentId, $caseType,
    json_encode($consultedData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    $action, $rationale, $confidence, $priority, $risks,
]);
$proposalId = (int) $pdo->lastInsertId();
if ($proposalId === 0) {
    $lookup = $pdo->prepare('SELECT id FROM propuestas_agente WHERE source_event_id = ?');
    $lookup->execute([$eventId]);
    $proposalId = (int) $lookup->fetchColumn();
}
$log = $pdo->prepare(
    'INSERT INTO integracion_ejecuciones
        (event_id, event_type, entity_type, entity_id, outcome, summary, payload_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE outcome=VALUES(outcome), summary=VALUES(summary)'
);
$log->execute([
    $eventId . ':agent-proposal', 'support.requested', 'incident', (string) $incidentId,
    'pending_review', 'Propuesta del agente guardada para revisión humana.',
    json_encode(['proposalId' => $proposalId], JSON_UNESCAPED_UNICODE),
]);
apiRespond(['ok' => true, 'proposalId' => $proposalId, 'status' => 'pendiente_revision']);
