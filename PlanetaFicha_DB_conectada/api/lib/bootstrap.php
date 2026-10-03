<?php
declare(strict_types=1);

$configPath = __DIR__ . '/../config/config.php';
if (!is_file($configPath)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Falta api/config/config.php.'], JSON_UNESCAPED_UNICODE);
    exit;
}
$config = require $configPath;
date_default_timezone_set((string)($config['app']['timezone'] ?? 'Europe/Madrid'));

$sessionName = (string)($config['security']['session_name'] ?? 'planetaficha_session');
$secureCookie = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
session_name($sessionName);
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => $secureCookie,
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function apiRespond(array $payload, int $status = 200): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function requestMethod(string $expected): void {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== $expected) apiRespond(['error' => 'Método no permitido.'], 405);
}

function requestJson(int $maxBytes = 20000): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || strlen($raw) > $maxBytes) apiRespond(['error' => 'Solicitud demasiado grande.'], 413);
    $data = json_decode($raw, true);
    if (!is_array($data)) apiRespond(['error' => 'No se recibieron datos JSON válidos.'], 400);
    return $data;
}

function sameOrigin(): void {
    $origin = trim((string)($_SERVER['HTTP_ORIGIN'] ?? ''));
    if ($origin === '') return;
    $originHost = strtolower((string)(parse_url($origin, PHP_URL_HOST) ?? ''));
    $requestHost = strtolower((string)($_SERVER['HTTP_HOST'] ?? ''));
    $requestHost = preg_replace('/:\d+$/', '', $requestHost);
    if ($originHost === '' || $originHost !== $requestHost) apiRespond(['error' => 'Origen no permitido.'], 403);
}

function ensureCsrf(): string {
    if (empty($_SESSION['csrf_token'])) $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    return (string)$_SESSION['csrf_token'];
}

function requireCsrf(): void {
    $token = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if ($token === '' || empty($_SESSION['csrf_token']) || !hash_equals((string)$_SESSION['csrf_token'], $token)) {
        apiRespond(['error' => 'Token de seguridad inválido. Recarga la página e inténtalo de nuevo.'], 419);
    }
}

function requireAuth(): int {
    $id = filter_var($_SESSION['user_id'] ?? null, FILTER_VALIDATE_INT);
    if ($id === false || $id === null) apiRespond(['error' => 'Necesitas iniciar sesión.'], 401);
    return (int)$id;
}

function requireAdmin(): int {
    $id = requireAuth();
    if (($_SESSION['role'] ?? '') !== 'administrador') apiRespond(['error' => 'No tienes permisos para acceder a esta zona.'], 403);
    return $id;
}

sameOrigin();

require_once __DIR__ . '/repository.php';
