<?php
require_once __DIR__ . '/../lib/bootstrap.php';

requestMethod('POST');
requireCsrf();

$userId = filter_var(
    $_SESSION['user_id'] ?? null,
    FILTER_VALIDATE_INT,
);

if ($userId) {
    db()->addEvent(
        'user.logged_out',
        (int) $userId,
        null,
        null,
        [],
    );
}

$_SESSION = [];
session_regenerate_id(true);
$_SESSION['csrf_token'] = bin2hex(random_bytes(32));

apiRespond([
    'ok' => true,
    'csrfToken' => $_SESSION['csrf_token'],
]);
