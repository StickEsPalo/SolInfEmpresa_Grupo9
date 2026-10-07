<?php
declare(strict_types=1);

function paypalHttp(string $method, string $url, array $headers, string $body = '', ?string $basicAuth = null): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
    ]);
    if ($basicAuth !== null) curl_setopt($ch, CURLOPT_USERPWD, $basicAuth);
    $raw = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    if ($raw === false) throw new RuntimeException('PayPal no responde: ' . $curlError);
    return ['status' => $status, 'data' => json_decode((string)$raw, true) ?? []];
}

function paypalApi(array $cfg, string $method, string $path, ?array $body = null): array {
    $base = rtrim((string)($cfg['api_base'] ?? ''), '/');
    $token = paypalHttp('POST', $base . '/v1/oauth2/token',
        ['Accept: application/json', 'Content-Type: application/x-www-form-urlencoded'],
        'grant_type=client_credentials',
        $cfg['client_id'] . ':' . $cfg['secret']);
    $accessToken = $token['data']['access_token'] ?? '';
    if ($token['status'] !== 200 || $accessToken === '') {
        throw new RuntimeException('PayPal rechazó las credenciales (HTTP ' . $token['status'] . ').');
    }
    return paypalHttp($method, $base . $path,
        ['Authorization: Bearer ' . $accessToken, 'Content-Type: application/json'],
        $body === null ? '' : json_encode($body));
}