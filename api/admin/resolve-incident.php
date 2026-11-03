<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/bootstrap.php';

requestMethod('POST');
requireCsrf();
requireAdmin();

$data = requestJson(4000);
$incidentId = filter_var($data['incidentId'] ?? null, FILTER_VALIDATE_INT);

if ($incidentId === false || $incidentId === null || $incidentId < 1) {
    apiRespond(['error' => 'El identificador de la incidencia no es válido.'], 422);
}

$pdo = db()->pdo();
$find = $pdo->prepare(
    'SELECT id, estado, fecha_resolucion
     FROM incidencias
     WHERE id = ?
     LIMIT 1'
);
$find->execute([$incidentId]);
$incident = $find->fetch();

if (!$incident) {
    apiRespond(['error' => 'No se encontró la incidencia.'], 404);
}

if ($incident['estado'] === 'resuelta') {
    apiRespond([
        'ok' => true,
        'changed' => false,
        'incidentId' => (int) $incidentId,
        'status' => 'resuelta',
        'resolvedAt' => $incident['fecha_resolucion'],
    ]);
}

if (!in_array($incident['estado'], ['abierta', 'en_revision'], true)) {
    apiRespond(['error' => 'Solo se pueden resolver incidencias abiertas o en revisión.'], 409);
}

$update = $pdo->prepare(
    "UPDATE incidencias
     SET estado = 'resuelta', fecha_resolucion = CURRENT_TIMESTAMP
     WHERE id = ? AND estado IN ('abierta', 'en_revision')"
);
$update->execute([$incidentId]);

// Si otro administrador la ha resuelto al mismo tiempo, recuperamos el estado final.
$find->execute([$incidentId]);
$updatedIncident = $find->fetch();

if (!$updatedIncident || $updatedIncident['estado'] !== 'resuelta') {
    apiRespond(['error' => 'No se pudo actualizar la incidencia. Actualiza el cuadro e inténtalo de nuevo.'], 409);
}

apiRespond([
    'ok' => true,
    'changed' => $update->rowCount() === 1,
    'incidentId' => (int) $incidentId,
    'status' => $updatedIncident['estado'],
    'resolvedAt' => $updatedIncident['fecha_resolucion'],
]);
