<?php
require_once __DIR__ . '/../lib/bootstrap.php';

requestMethod('POST');
requireCsrf();

$data = requestJson(8000);
$email = strtolower(trim((string) ($data['email'] ?? '')));
$password = (string) ($data['password'] ?? '');

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
    apiRespond(['error' => 'Introduce un correo válido y tu contraseña.'], 422);
}

$user = db()->findUserByEmail($email);
if (!$user || !password_verify($password, (string) $user['password'])) {
    apiRespond(['error' => 'El correo o la contraseña no son correctos.'], 401);
}

session_regenerate_id(true);
$_SESSION['user_id'] = (int) $user['id'];
$_SESSION['role'] = $user['rol'];
$_SESSION['csrf_token'] = bin2hex(random_bytes(32));
$csrfToken = (string) $_SESSION['csrf_token'];

db()->addEvent(
    'user.logged_in',
    (int) $user['id'],
    null,
    null,
    ['role' => $user['rol']],
);

apiRespond([
    'ok' => true,
    'csrfToken' => $csrfToken,
    'user' => [
        'id' => (int) $user['id'],
        'firstName' => $user['nombre'],
        'lastName' => $user['apellidos'] ?? '',
        'email' => $user['email'],
        'role' => $user['rol'],
    ],
]);
