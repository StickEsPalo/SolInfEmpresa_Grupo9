<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function incidentRespond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function incidentReadSmtpResponse($socket): array
{
    $lines = [];
    do {
        $line = fgets($socket, 515);
        if ($line === false) {
            throw new RuntimeException('El servidor SMTP cerró la conexión.');
        }
        $lines[] = rtrim($line, "\r\n");
    } while (isset($line[3]) && $line[3] === '-');

    if (!preg_match('/^(\d{3})/', $lines[0], $match)) {
        throw new RuntimeException('Respuesta SMTP no reconocida.');
    }
    return [(int)$match[1], implode("\n", $lines)];
}

function incidentWriteSmtp($socket, string $data): void
{
    while ($data !== '') {
        $written = fwrite($socket, $data);
        if ($written === false || $written === 0) {
            throw new RuntimeException('No se pudo escribir en la conexión SMTP.');
        }
        $data = substr($data, $written);
    }
}

function incidentSmtpCommand($socket, string $command, array $expectedCodes, string $step): string
{
    incidentWriteSmtp($socket, $command . "\r\n");
    [$code, $response] = incidentReadSmtpResponse($socket);
    if (!in_array($code, $expectedCodes, true)) {
        throw new RuntimeException($step . ' falló (SMTP ' . $code . ').');
    }
    return $response;
}

function incidentSendEmail(array $config, string $subject, string $body, string $replyTo): void
{
    $host = (string)$config['host'];
    $port = (int)($config['port'] ?? 587);
    $timeout = max(5, min((int)($config['timeout'] ?? 15), 30));
    $socket = @stream_socket_client(
        'tcp://' . $host . ':' . $port,
        $errorNumber,
        $errorMessage,
        $timeout,
        STREAM_CLIENT_CONNECT
    );
    if ($socket === false) {
        throw new RuntimeException('No se pudo conectar al servidor SMTP: ' . $errorMessage);
    }

    stream_set_timeout($socket, $timeout);
    try {
        [$code] = incidentReadSmtpResponse($socket);
        if ($code !== 220) {
            throw new RuntimeException('El servidor SMTP no aceptó la conexión.');
        }

        incidentSmtpCommand($socket, 'EHLO planetaficha.onl', [250], 'EHLO');
        incidentSmtpCommand($socket, 'AUTH LOGIN', [334], 'Autenticación');
        incidentSmtpCommand($socket, base64_encode((string)$config['username']), [334], 'Usuario SMTP');
        incidentSmtpCommand($socket, base64_encode((string)$config['password']), [235], 'Contraseña SMTP');

        $from = (string)$config['from_email'];
        $to = (string)$config['to_email'];
        incidentSmtpCommand($socket, 'MAIL FROM:<' . $from . '>', [250], 'Remitente');
        incidentSmtpCommand($socket, 'RCPT TO:<' . $to . '>', [250, 251], 'Destinatario');
        incidentSmtpCommand($socket, 'DATA', [354], 'Inicio del mensaje');

        $fromName = '=?UTF-8?B?' . base64_encode((string)($config['from_name'] ?? 'PlanetaFicha')) . '?=';
        $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
        $headers = [
            'Date: ' . date(DATE_RFC2822),
            'From: ' . $fromName . ' <' . $from . '>',
            'To: <' . $to . '>',
            'Reply-To: <' . $replyTo . '>',
            'Subject: ' . $encodedSubject,
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
        ];
        $message = implode("\r\n", $headers) . "\r\n\r\n"
            . rtrim(chunk_split(base64_encode($body), 76, "\r\n"), "\r\n");
        incidentWriteSmtp($socket, $message . "\r\n.\r\n");
        [$code] = incidentReadSmtpResponse($socket);
        if ($code !== 250) {
            throw new RuntimeException('El servidor SMTP rechazó el mensaje (SMTP ' . $code . ').');
        }

        incidentWriteSmtp($socket, "QUIT\r\n");
        incidentReadSmtpResponse($socket);
    } finally {
        fclose($socket);
    }
}

try {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        incidentRespond(['error' => 'Método no permitido.'], 405);
    }

    $origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
    $requestHost = strtolower((string)($_SERVER['HTTP_HOST'] ?? ''));
    if ($origin !== '') {
        $originHost = strtolower((string)(parse_url($origin, PHP_URL_HOST) ?? ''));
        if ($originHost === '' || $originHost !== preg_replace('/:\d+$/', '', $requestHost)) {
            incidentRespond(['error' => 'Origen no permitido.'], 403);
        }
    }

    $raw = file_get_contents('php://input');
    if ($raw === false || strlen($raw) > 10000) {
        incidentRespond(['error' => 'La solicitud es demasiado grande.'], 413);
    }
    $input = json_decode($raw, true);
    if (!is_array($input)) {
        incidentRespond(['error' => 'No se recibieron datos válidos.'], 400);
    }
    if (trim((string)($input['website'] ?? '')) !== '') {
        incidentRespond(['ok' => true], 200);
    }

    $email = trim((string)($input['email'] ?? ''));
    $message = trim((string)($input['message'] ?? ''));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254
        || strlen($message) < 10 || strlen($message) > 5000) {
        incidentRespond(['error' => 'Revisa el correo y la descripción de la incidencia.'], 422);
    }

    $configPath = __DIR__ . '/config.mail.php';
    if (!is_file($configPath)) {
        error_log('[PlanetaFicha incidencias] Falta config.mail.php.');
        incidentRespond(['error' => 'El envío de incidencias aún no está configurado.'], 503);
    }
    $config = require $configPath;
    if (!is_array($config)
        || empty($config['host'])
        || empty($config['username'])
        || empty($config['password'])
        || empty($config['from_email'])
        || empty($config['to_email'])
        || (string)$config['password'] === 'REEMPLAZA_POR_LA_CLAVE_DEL_BUZON') {
        error_log('[PlanetaFicha incidencias] La configuración SMTP está incompleta.');
        incidentRespond(['error' => 'El envío de incidencias aún no está configurado.'], 503);
    }
    foreach (['username', 'from_email', 'to_email'] as $emailField) {
        if (!filter_var((string)$config[$emailField], FILTER_VALIDATE_EMAIL)) {
            error_log('[PlanetaFicha incidencias] Correo inválido en configuración: ' . $emailField);
            incidentRespond(['error' => 'La configuración SMTP no es válida.'], 503);
        }
    }

    $ticketId = 'INC-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
    $createdAt = date(DATE_ATOM);
    $body = implode("\n", [
        'Nueva incidencia de PlanetaFicha',
        '',
        'Referencia: ' . $ticketId,
        'Fecha: ' . $createdAt,
        'Correo para responder: ' . $email,
        '',
        'DESCRIPCIÓN',
        $message,
    ]);

    incidentSendEmail($config, 'Nueva incidencia ' . $ticketId . ' - PlanetaFicha', $body, $email);
    incidentRespond(['ok' => true, 'ticketId' => $ticketId, 'createdAt' => $createdAt], 200);
} catch (Throwable $error) {
    error_log('[PlanetaFicha incidencias] ' . $error->getMessage());
    incidentRespond(['error' => 'No se pudo enviar la incidencia ahora. Inténtalo de nuevo más tarde.'], 502);
}
