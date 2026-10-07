<?php
require_once __DIR__ . '/../lib/bootstrap.php';

requestMethod('GET');
$csrfToken = ensureCsrf();
$userId = filter_var(
    $_SESSION['user_id'] ?? null,
    FILTER_VALIDATE_INT,
);
$user = $userId ? db()->findUserById((int) $userId) : null;

if ($userId && !$user) {
    session_unset();
    session_destroy();
    $user = null;
}

apiRespond([
    'authenticated' => (bool) $user,
    'csrfToken' => $csrfToken,
    'user' => $user
        ? [
            'id' => (int) $user['id'],
            'firstName' => $user['nombre'],
            'lastName' => $user['apellidos'] ?? '',
            'email' => $user['email'],
            'role' => $user['rol'],
        ]
        : null,
]);
