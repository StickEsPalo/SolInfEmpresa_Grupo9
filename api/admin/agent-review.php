<?php
declare(strict_types=1);
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/integration.php';
requestMethod('POST');
requireCsrf();
$reviewerId = requireAdmin();
$data = requestJson(4000);
$proposalId = filter_var($data['proposalId'] ?? null, FILTER_VALIDATE_INT);
$decision = trim((string) ($data['decision'] ?? ''));
$note = trim((string) ($data['note'] ?? ''));
if (!$proposalId || $proposalId < 1 || !in_array($decision, ['approved', 'rejected'], true) || strlen($note) > 500) {
    apiRespond(['error' => 'La revisión no es válida.'], 422);
}
$status = $decision === 'approved' ? 'aprobada' : 'rechazada';
$pdo = db()->pdo();
$update = $pdo->prepare(
    "UPDATE propuestas_agente SET status = ?, review_note = ?, reviewed_by = ?,
         reviewed_at = CURRENT_TIMESTAMP
     WHERE id = ? AND status = 'pendiente_revision'"
);
$update->execute([$status, $note !== '' ? $note : null, $reviewerId, $proposalId]);
if ($update->rowCount() !== 1) {
    apiRespond(['error' => 'La propuesta no existe o ya fue revisada.'], 409);
}
$lookup = $pdo->prepare('SELECT source_event_id, incident_id, proposed_action FROM propuestas_agente WHERE id = ?');
$lookup->execute([$proposalId]);
$proposal = $lookup->fetch();
$published = ['sent' => false];
if ($decision === 'approved') {
    $published = pfPublishWorkflowEvent($config, [
        'eventId' => 'agent-proposal:' . $proposalId . ':approved',
        'type' => 'agent.approved',
        'occurredAt' => date(DATE_ATOM),
        'entity' => ['type' => 'agent', 'id' => (string) $proposalId],
        'data' => [
            'proposalId' => $proposalId,
            'sourceEventId' => $proposal['source_event_id'],
            'incidentId' => (int) $proposal['incident_id'],
            'approvedAction' => $proposal['proposed_action'],
            'reviewerId' => $reviewerId,
        ],
    ]);
}
$log = $pdo->prepare(
    'INSERT INTO integracion_ejecuciones
        (event_id, event_type, entity_type, entity_id, outcome, summary, payload_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE outcome=VALUES(outcome), summary=VALUES(summary), processed_at=CURRENT_TIMESTAMP'
);
$log->execute([
    'agent-proposal:' . $proposalId . ':' . $decision,
    'agent.' . $decision,
    'agent',
    (string) $proposalId,
    $decision === 'approved' ? 'approved' : 'rejected',
    'Decisión humana registrada.',
    json_encode(['reviewerId' => $reviewerId, 'note' => $note], JSON_UNESCAPED_UNICODE),
]);
apiRespond([
    'ok' => true,
    'status' => $status,
    'approvalWorkflowAccepted' => (bool) $published['sent'],
]);
