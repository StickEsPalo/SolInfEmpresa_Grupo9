<?php
declare(strict_types=1);

/** Publica un evento ya persistido en PlanetaFicha al Webhook configurado de n8n. */
function pfPublishWorkflowEvent(array $config, array $event): array
{
    $settings = $config['integration'] ?? [];
    $url = trim((string) ($settings['event_webhook_url'] ?? ''));
    $secret = (string) ($settings['shared_secret'] ?? '');

    if ($url === '' || $secret === '') {
        return ['sent' => false, 'reason' => 'integration_not_configured'];
    }

    $body = json_encode(
        $event,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR,
    );
    $timeout = max(1, min(10, (int) ($settings['timeout_seconds'] ?? 4)));

    if (function_exists('curl_init')) {
        $handle = curl_init($url);
        curl_setopt_array($handle, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'X-Integration-Token: ' . $secret,
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => $timeout,
            CURLOPT_TIMEOUT => $timeout,
        ]);
        $response = curl_exec($handle);
        $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        $error = curl_error($handle);
        curl_close($handle);

        if ($response === false || $status < 200 || $status >= 300) {
            error_log('[PlanetaFicha n8n] Falló el envío HTTP ' . $status . ': ' . $error);
            return ['sent' => false, 'reason' => 'webhook_delivery_failed'];
        }

        return ['sent' => true];
    }

    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => implode("\r\n", [
                'Content-Type: application/json',
                'X-Integration-Token: ' . $secret,
            ]),
            'content' => $body,
            'timeout' => $timeout,
            'ignore_errors' => true,
        ],
    ]);
    $response = @file_get_contents($url, false, $context);
    $statusLine = $http_response_header[0] ?? '';

    if ($response === false || !preg_match('/\s2\d\d\s/', $statusLine)) {
        error_log('[PlanetaFicha n8n] No se pudo entregar el evento al webhook.');
        return ['sent' => false, 'reason' => 'webhook_delivery_failed'];
    }

    return ['sent' => true];
}

function pfRequireIntegrationSecret(array $config): void
{
    $expected = (string) ($config['integration']['shared_secret'] ?? '');
    $received = (string) ($_SERVER['HTTP_X_INTEGRATION_TOKEN'] ?? '');

    if ($expected === '' || $received === '' || !hash_equals($expected, $received)) {
        apiRespond(['error' => 'Credencial de integración no válida.'], 401);
    }
}
