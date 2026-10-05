<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/mail.php';

requestMethod('POST');
requireCsrf();
$userId = requireAuth();
$data = requestJson(10000);
$subject = trim((string)($data['subject'] ?? 'Solicitud de soporte'));
$message = trim((string)($data['message'] ?? ''));

if (strlen($subject) < 3 || strlen($subject) > 150
    || strlen($message) < 10 || strlen($message) > 5000) {
    apiRespond(['error' => 'Revisa el asunto y la descripción de la incidencia.'], 422);
}

try {
    // Persist first: a temporary SMTP outage must not lose the incident.
    $incident = db()->createIncident($userId, $subject, $message);
    $incidentCode = 'INC-' . date('Ymd') . '-' . str_pad((string)$incident['id'], 4, '0', STR_PAD_LEFT);
    db()->addEvent('support.requested', $userId, null, null, ['incidentId' => (int)$incident['id']]);

} catch (Throwable $error) {
    error_log('[PlanetaFicha incidencia] ' . $error->getMessage());
    apiRespond(['error' => 'No se pudo registrar la incidencia. Inténtalo de nuevo más tarde.'], 500);
}

if (session_status() === PHP_SESSION_ACTIVE) {
    session_write_close();
}

$body = implode("\n", [
    'Nueva incidencia de PlanetaFicha',
    '',
    'Referencia: ' . $incidentCode,
    'Fecha: ' . (string)($incident['fecha_creacion'] ?? date(DATE_ATOM)),
    'Usuario ID: ' . $userId,
    'Estado: ' . (string)($incident['estado'] ?? 'abierta'),
    'Asunto: ' . $subject,
    '',
    'DESCRIPCIÓN',
    $message,
]);
try {
    $mailSent = pfMailSend(
        $config['mail'] ?? [],
        'Nueva incidencia ' . $incidentCode . ' - PlanetaFicha',
        $body
    );
} catch (Throwable $error) {
    error_log('[PlanetaFicha incidencia-mail] ' . $error->getMessage());
    $mailSent = false;
}

apiRespond([
    'ok' => true,
    'incidentId' => $incidentCode,
    'mailSent' => $mailSent,
], 201);
