<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function readSmtpResponse($socket): array
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

function writeSmtp($socket, string $data): void
{
    while ($data !== '') {
        $written = fwrite($socket, $data);
        if ($written === false || $written === 0) {
            throw new RuntimeException('No se pudo escribir en la conexión SMTP.');
        }
        $data = substr($data, $written);
    }
}
function smtpCommand($socket, string $command, array $expectedCodes, string $step): string
{
    writeSmtp($socket, $command . "\r\n");
    [$code, $response] = readSmtpResponse($socket);
    if (!in_array($code, $expectedCodes, true)) {
        throw new RuntimeException($step . ' falló (SMTP ' . $code . ').');
    }
    return $response;
}

function sendSmtpEmail(array $config, string $subject, string $body, string $replyTo): void
{
    $host = (string)$config['host'];
    $port = (int)($config['port'] ?? 587);
    $timeout = max(5, min((int)($config['timeout'] ?? 15), 30));
    
    // 465 = TLS directo (SMTPS). Cualquier otro puerto (587) usa STARTTLS.
    $implicitTls = $port === 465;
    $tlsContext = stream_context_create([
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true,
            'peer_name' => $host,
            'SNI_enabled' => true,
        ],
    ]);
    $socket = @stream_socket_client(
        ($implicitTls ? 'tls://' : 'tcp://') . $host . ':' . $port,
        $errorNumber,
        $errorMessage,
        $timeout,
        STREAM_CLIENT_CONNECT,
        $tlsContext
    );
    
    /* VERSION CON TCP */
    /*$socket = @stream_socket_client(
        'tcp://' . $host . ':' . $port,
        $errorNumber,
        $errorMessage,
        $timeout,
        STREAM_CLIENT_CONNECT
    );*/


    if ($socket === false) {
        throw new RuntimeException('No se pudo conectar al servidor SMTP: ' . $errorMessage);
    }

    stream_set_timeout($socket, $timeout);
    try {
        [$code, $greeting] = readSmtpResponse($socket);
        if ($code !== 220) {
            throw new RuntimeException('El servidor SMTP no aceptó la conexión.');
        }

        /* VERSION ANTERIOR */
        /*smtpCommand($socket, 'EHLO planetaficha.onl', [250], 'EHLO');*/
        $ehlo = smtpCommand($socket, 'EHLO planetaficha.onl', [250], 'EHLO');
        if (!$implicitTls) {
            // Nunca se envían credenciales sin cifrar: si no hay STARTTLS, se aborta.
            if (stripos($ehlo, 'STARTTLS') === false) {
                throw new RuntimeException('El servidor SMTP no ofrece STARTTLS; no se envían credenciales sin cifrar.');
            }
            smtpCommand($socket, 'STARTTLS', [220], 'STARTTLS');
            if (@stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT) !== true) {
                throw new RuntimeException('No se pudo establecer la conexión cifrada (TLS) con el servidor SMTP.');
            }
            smtpCommand($socket, 'EHLO planetaficha.onl', [250], 'EHLO');
        }

        smtpCommand($socket, 'AUTH LOGIN', [334], 'Autenticación');
        smtpCommand($socket, base64_encode((string)$config['username']), [334], 'Usuario SMTP');
        smtpCommand($socket, base64_encode((string)$config['password']), [235], 'Contraseña SMTP');

        $from = (string)$config['from_email'];
        $to = (string)$config['to_email'];
        smtpCommand($socket, 'MAIL FROM:<' . $from . '>', [250], 'Remitente');
        smtpCommand($socket, 'RCPT TO:<' . $to . '>', [250, 251], 'Destinatario');
        smtpCommand($socket, 'DATA', [354], 'Inicio del mensaje');

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
        writeSmtp($socket, $message . "\r\n.\r\n");
        [$code, $response] = readSmtpResponse($socket);
        if ($code !== 250) {
            throw new RuntimeException('El servidor SMTP rechazó el mensaje (SMTP ' . $code . ').');
        }

        writeSmtp($socket, "QUIT\r\n");
        readSmtpResponse($socket);
    } finally {
        fclose($socket);
    }
}

try {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        respond(['error' => 'Método no permitido.'], 405);
    }

    $origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
    $requestHost = strtolower((string)($_SERVER['HTTP_HOST'] ?? ''));
    if ($origin !== '') {
        $originHost = strtolower((string)(parse_url($origin, PHP_URL_HOST) ?? ''));
        if ($originHost === '' || $originHost !== preg_replace('/:\d+$/', '', $requestHost)) {
            respond(['error' => 'Origen no permitido.'], 403);
        }
    }

    $raw = file_get_contents('php://input');
    if ($raw === false || strlen($raw) > 16384) {
        respond(['error' => 'La solicitud es demasiado grande.'], 413);
    }
    $input = json_decode($raw, true);
    if (!is_array($input)) {
        respond(['error' => 'No se recibieron datos válidos.'], 400);
    }
    if (trim((string)($input['website'] ?? '')) !== '') {
        respond(['error' => 'Solicitud no válida.'], 400);
    }

    $configPath = __DIR__ . '/config.mail.php';
    if (!is_file($configPath)) {
        error_log('[PlanetaFicha pedidos] Falta config.mail.php.');
        respond(['error' => 'El envío de pedidos aún no está configurado.'], 503);
    }
    $config = require $configPath;
    if (!is_array($config)
        || empty($config['host'])
        || empty($config['username'])
        || empty($config['password'])
        || empty($config['from_email'])
        || empty($config['to_email'])
        || (string)$config['password'] === 'REEMPLAZA_POR_LA_CLAVE_DEL_BUZON') {
        error_log('[PlanetaFicha pedidos] La configuración SMTP está incompleta.');
        respond(['error' => 'El envío de pedidos aún no está configurado.'], 503);
    }
    foreach (['username', 'from_email', 'to_email'] as $emailField) {
        if (!filter_var((string)$config[$emailField], FILTER_VALIDATE_EMAIL)) {
            error_log('[PlanetaFicha pedidos] Correo inválido en configuración: ' . $emailField);
            respond(['error' => 'La configuración SMTP no es válida.'], 503);
        }
    }

    $customerInput = $input['customer'] ?? null;
    if (!is_array($customerInput)) {
        respond(['error' => 'Faltan los datos del cliente.'], 422);
    }
    $customer = [
        'name' => trim((string)($customerInput['name'] ?? '')),
        'email' => trim((string)($customerInput['email'] ?? '')),
        'address' => trim((string)($customerInput['address'] ?? '')),
        'postalCode' => trim((string)($customerInput['postalCode'] ?? '')),
        'city' => trim((string)($customerInput['city'] ?? '')),
    ];
    if (strlen($customer['name']) < 3 || strlen($customer['name']) > 120
        || !filter_var($customer['email'], FILTER_VALIDATE_EMAIL)
        || strlen($customer['address']) < 8 || strlen($customer['address']) > 220
        || !preg_match('/^\d{5}$/', $customer['postalCode'])
        || strlen($customer['city']) < 2 || strlen($customer['city']) > 100) {
        respond(['error' => 'Revisa el nombre, correo y dirección de entrega.'], 422);
    }

    $orderId = (string)($input['orderId'] ?? '');
    if (!preg_match('/^PM-\d{4}-\d{6,12}$/', $orderId)) {
        respond(['error' => 'El identificador del pedido no es válido.'], 422);
    }

    $paymentMethod = trim((string)($input['paymentMethod'] ?? ''));
    if (!in_array($paymentMethod, ['Tarjeta de prueba', 'Bizum de prueba', 'Transferencia simulada'], true)) {
        respond(['error' => 'El método de pago de prueba no es válido.'], 422);
    }

    $catalog = [
        'ajedrez' => ['Ajedrez', 1999],
        'shogi' => ['Shogi', 3499],
        'virus' => ['Virus', 1495],
        'catan' => ['Catan', 4500],
        'carcassonne' => ['Carcassonne', 2995],
        'pandemic' => ['Pandemic', 3999],
        'dixit' => ['Dixit', 3290],
        'dobutsu-shogi' => ["Let's Catch the Lion!", 1800],
        'oshi' => ['Oshi', 2500],
        'tragedy-looper' => ['Tragedy Looper', 4200],
        'kabuto-sumo' => ['Kabuto Sumo', 3400],
        'rush-hour' => ['Rush Hour', 2495],
        'ajedrez-430' => ['Ajedrez · Edición caballeros templarios', 43000],
        'ajedrez-17500' => ['Ajedrez · Edición premium', 1750000],
        'catan-navegantes' => ['Catan: Navegantes', 4600],
        'catan-piratas-y-exploradores' => ['Catan: Piratas y Exploradores', 4600],
    ];
    $submittedItems = $input['items'] ?? null;
    if (!is_array($submittedItems) || count($submittedItems) < 1 || count($submittedItems) > 30) {
        respond(['error' => 'El carrito está vacío o no es válido.'], 422);
    }

    $itemsById = [];
    foreach ($submittedItems as $item) {
        if (!is_array($item)) {
            respond(['error' => 'Una línea del pedido no es válida.'], 422);
        }
        $productId = (string)($item['productId'] ?? '');
        $quantity = filter_var($item['quantity'] ?? null, FILTER_VALIDATE_INT);
        if (!isset($catalog[$productId]) || $quantity === false || $quantity < 1 || $quantity > 99) {
            respond(['error' => 'Un producto o cantidad del carrito no es válido.'], 422);
        }
        $itemsById[$productId] = ($itemsById[$productId] ?? 0) + $quantity;
        if ($itemsById[$productId] > 99) {
            respond(['error' => 'La cantidad solicitada supera el máximo permitido.'], 422);
        }
    }

    $items = [];
    $subtotalCents = 0;
    foreach ($itemsById as $productId => $quantity) {
        [$title, $unitPriceCents] = $catalog[$productId];
        $lineCents = $unitPriceCents * $quantity;
        $subtotalCents += $lineCents;
        $items[] = [
            'productId' => $productId,
            'title' => $title,
            'unitPrice' => $unitPriceCents / 100,
            'quantity' => $quantity,
            'lineTotal' => $lineCents / 100,
        ];
    }

    $promoCode = strtoupper(trim((string)($input['promoCode'] ?? '')));
    $discountCents = $promoCode === 'YUZU10' ? (int)round($subtotalCents * 0.10, 0, PHP_ROUND_HALF_UP) : 0;
    $shippingCents = $subtotalCents === 0 || $subtotalCents >= 7000 ? 0 : 690;
    $taxCents = (int)round(($subtotalCents - $discountCents + $shippingCents) * 0.21, 0, PHP_ROUND_HALF_UP);
    $totals = [
        'subtotal' => $subtotalCents / 100,
        'discount' => $discountCents / 100,
        'shipping' => $shippingCents / 100,
        'tax' => $taxCents / 100,
        'total' => ($subtotalCents - $discountCents + $shippingCents + $taxCents) / 100,
    ];

    $createdAt = date(DATE_ATOM);
    $lines = array_map(
        static fn(array $item): string => sprintf(
            '- %d × %s (%s c/u): %s',
            $item['quantity'],
            $item['title'],
            number_format($item['unitPrice'], 2, ',', '.') . ' EUR',
            number_format($item['lineTotal'], 2, ',', '.') . ' EUR'
        ),
        $items
    );
    $body = implode("\n", [
        'Nuevo pedido de PlanetaFicha',
        '',
        'Pedido: ' . $orderId,
        'Fecha: ' . $createdAt,
        'Estado: pendiente de preparación (pago simulado; no se ha procesado ningún cobro)',
        '',
        'CLIENTE',
        'Nombre: ' . $customer['name'],
        'Correo: ' . $customer['email'],
        'Dirección: ' . $customer['address'],
        'Código postal: ' . $customer['postalCode'],
        'Ciudad: ' . $customer['city'],
        '',
        'PRODUCTOS',
        ...$lines,
        '',
        'Subtotal: ' . number_format($totals['subtotal'], 2, ',', '.') . ' EUR',
        'Descuento' . ($discountCents ? ' (YUZU10)' : '') . ': ' . number_format($totals['discount'], 2, ',', '.') . ' EUR',
        'Envío simulado: ' . number_format($totals['shipping'], 2, ',', '.') . ' EUR',
        'IVA (21%): ' . number_format($totals['tax'], 2, ',', '.') . ' EUR',
        'TOTAL: ' . number_format($totals['total'], 2, ',', '.') . ' EUR',
        '',
        'Método de pago: ' . $paymentMethod,
        'Promoción indicada: ' . ($promoCode !== '' ? $promoCode : 'ninguna'),
    ]);

    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start([
            'cookie_httponly' => true,
            'cookie_samesite' => 'Strict',
            'cookie_secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        ]);
    }
    $now = time();
    if (isset($_SESSION['last_order_email_at']) && ($now - (int)$_SESSION['last_order_email_at']) < 8) {
        respond(['error' => 'Espera unos segundos antes de volver a enviar un pedido.'], 429);
    }

    $subject = 'Nuevo pedido ' . $orderId . ' - PlanetaFicha';
    sendSmtpEmail($config, $subject, $body, $customer['email']);
    $_SESSION['last_order_email_at'] = $now;

    respond([
        'ok' => true,
        'order' => [
            'id' => $orderId,
            'createdAt' => $createdAt,
            'items' => $items,
            'totals' => $totals,
        ],
    ], 200);
} catch (Throwable $error) {
    error_log('[PlanetaFicha pedidos] ' . $error->getMessage());
    respond(['error' => 'No se pudo enviar el pedido ahora. No se ha vaciado el carrito; inténtalo de nuevo más tarde.'], 502);
}
?>
