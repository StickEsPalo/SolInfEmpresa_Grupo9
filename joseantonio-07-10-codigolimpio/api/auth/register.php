<?php
require_once __DIR__ . '/../lib/bootstrap.php';

requestMethod('POST');
requireCsrf();

$data = requestJson(8000);
$firstName = trim((string) ($data['firstName'] ?? ''));
$lastName = trim((string) ($data['lastName'] ?? ''));
$email = strtolower(trim((string) ($data['email'] ?? '')));
$password = (string) ($data['password'] ?? '');
$namePattern = "/^[A-ZÁÉÍÓÚÜÑ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]*$/u";
$passwordPattern = '/^[A-ZÁÉÍÓÚÜÑ](?=.*\d).{5,}$/u';

if (!preg_match($namePattern, $firstName) || !preg_match($namePattern, $lastName)) {
    apiRespond(
        ['error' => 'El nombre y los apellidos deben empezar por mayúscula.'],
        422,
    );
}

if (!preg_match('/^[^\s@]+@[^\s@]+\.com$/i', $email)) {
    apiRespond(
        ['error' => 'El correo debe contener @ y terminar en .com.'],
        422,
    );
}

if (!preg_match($passwordPattern, $password)) {
    apiRespond(
        [
            'error' => 'La contraseña debe empezar por mayúscula, tener al menos 6 caracteres y contener un número.',
        ],
        422,
    );
}

if (db()->findUserByEmail($email)) {
    apiRespond(['error' => 'Ya existe una cuenta con ese correo.'], 409);
}

$user = db()->createUser(
    $firstName,
    $lastName,
    $email,
    password_hash($password, PASSWORD_DEFAULT),
);
session_regenerate_id(true);
$_SESSION['user_id'] = (int) $user['id'];
$_SESSION['role'] = 'cliente';
$_SESSION['csrf_token'] = bin2hex(random_bytes(32));
$csrfToken = (string) $_SESSION['csrf_token'];

foreach (['user.registered', 'user.logged_in'] as $eventType) {
    db()->addEvent(
        $eventType,
        (int) $user['id'],
        null,
        null,
        ['role' => 'cliente'],
    );
}

apiRespond([
    'ok' => true,
    'csrfToken' => $csrfToken,
    'user' => [
        'id' => (int) $user['id'],
        'firstName' => $user['nombre'],
        'lastName' => $user['apellidos'],
        'email' => $user['email'],
        'role' => $user['rol'],
    ],
], 201);
