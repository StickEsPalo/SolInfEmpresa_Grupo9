<?php
declare(strict_types=1);

/* API de Pangea Meeple para el hosting. Solo para la demostración académica. */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
date_default_timezone_set('UTC');

function respond(array $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function requestBody(): array
{
    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) {
        throw new InvalidArgumentException('El cuerpo de la petición debe ser JSON válido.');
    }
    return $body;
}

function connection(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $localConfigPath = __DIR__ . '/config.local.php';
    $localConfig = is_file($localConfigPath) ? require $localConfigPath : [];
    $host = getenv('JUEGOS_DB_HOST') ?: ($localConfig['host'] ?? '');
    $name = getenv('JUEGOS_DB_NAME') ?: ($localConfig['database'] ?? '');
    $user = getenv('JUEGOS_DB_USER') ?: ($localConfig['username'] ?? '');
    $password = getenv('JUEGOS_DB_PASSWORD') ?: ($localConfig['password'] ?? '');
    $charset = $localConfig['charset'] ?? 'utf8mb4';
    if ($host === '' || $name === '' || $user === '') {
        respond(['error' => 'Configura config.local.php con los datos de conexión que muestra el panel de DonDominio.'], 500);
    }
    $pdo = new PDO(
        "mysql:host={$host};dbname={$name};charset={$charset}",
        $user,
        $password,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
    $pdo->exec("SET time_zone = '+00:00'");
    return $pdo;
}

function eventType(string $type): string
{
    $map = [
        'product.viewed' => 'producto.visto',
        'cart.item_added' => 'carrito.producto_anadido',
        'checkout.started' => 'checkout.iniciado',
        'order.created' => 'pedido.creado',
        'payment.simulated' => 'pago.simulado',
        'support.requested' => 'incidencia.creada',
    ];
    if (!isset($map[$type])) {
        throw new InvalidArgumentException('Tipo de evento no reconocido.');
    }
    return $map[$type];
}

function recordEvent(PDO $pdo, string $type, ?int $userId = null, ?int $productId = null, ?int $orderId = null, ?int $incidentId = null, array $data = []): void
{
    $stmt = $pdo->prepare('INSERT INTO eventos (tipo_evento, usuario_id, producto_id, pedido_id, incidencia_id, datos) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$type, $userId, $productId, $orderId, $incidentId, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
}

function eventRows(PDO $pdo, int $limit = 200): array
{
    $limit = max(1, min($limit, 1000));
    $rows = $pdo->query("SELECT id, tipo_evento, datos, fecha_evento FROM eventos ORDER BY fecha_evento DESC, id DESC LIMIT {$limit}")->fetchAll();
    return array_map(static function (array $row): array {
        $payload = json_decode((string)($row['datos'] ?? ''), true);
        if (!is_array($payload)) {
            $payload = ['detalle' => $row['datos']];
        }
        return [
            'id' => (int)$row['id'],
            'type' => $row['tipo_evento'],
            'occurredAt' => str_replace(' ', 'T', (string)$row['fecha_evento']) . 'Z',
            'source' => 'Base de datos de DonDominio / eventos',
            'payload' => $payload,
        ];
    }, $rows);
}

function orderRows(PDO $pdo, int $limit = 100): array
{
    $limit = max(1, min($limit, 500));
    $orders = $pdo->query("SELECT p.id, p.codigo_pedido, p.estado, p.subtotal, p.impuestos, p.gastos_envio, p.descuento, p.total, p.fecha_pedido, u.nombre, u.email, pa.metodo_pago, pa.estado AS estado_pago, pa.referencia FROM pedidos p JOIN usuarios u ON u.id = p.usuario_id LEFT JOIN pagos pa ON pa.pedido_id = p.id ORDER BY p.fecha_pedido DESC, p.id DESC LIMIT {$limit}")->fetchAll();
    if (!$orders) {
        return [];
    }

    $ids = array_map(static fn(array $order): int => (int)$order['id'], $orders);
    $marks = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $pdo->prepare("SELECT lp.pedido_id, lp.producto_id, lp.cantidad, lp.precio_unitario, pr.nombre FROM lineas_pedido lp JOIN productos pr ON pr.id = lp.producto_id WHERE lp.pedido_id IN ({$marks}) ORDER BY lp.id");
    $stmt->execute($ids);
    $lines = [];
    foreach ($stmt->fetchAll() as $line) {
        $lines[(int)$line['pedido_id']][] = [
            'productId' => (int)$line['producto_id'], 'title' => $line['nombre'],
            'unitPrice' => (float)$line['precio_unitario'], 'quantity' => (int)$line['cantidad'],
        ];
    }

    $methods = ['tarjeta_simulada' => 'Tarjeta de prueba', 'paypal_simulado' => 'PayPal de prueba', 'transferencia_simulada' => 'Transferencia simulada'];
    return array_map(static function (array $row) use ($lines, $methods): array {
        return [
            'id' => $row['codigo_pedido'],
            'createdAt' => str_replace(' ', 'T', (string)$row['fecha_pedido']) . 'Z',
            'customer' => ['name' => $row['nombre'], 'email' => $row['email']],
            'items' => $lines[(int)$row['id']] ?? [],
            'totals' => [
                'subtotal' => (float)$row['subtotal'], 'discount' => (float)$row['descuento'],
                'shipping' => (float)$row['gastos_envio'], 'tax' => (float)$row['impuestos'], 'total' => (float)$row['total'],
            ],
            'payment' => [
                'method' => $methods[$row['metodo_pago'] ?? ''] ?? (string)($row['metodo_pago'] ?? 'Sin pago'),
                'status' => $row['estado_pago'] ?? 'pendiente', 'reference' => $row['referencia'] ?? '',
            ],
            'status' => $row['estado'] === 'pagado' ? 'Pagado · pendiente de preparación' : $row['estado'],
        ];
    }, $orders);
}

function findOrCreateUser(PDO $pdo, string $name, string $email, bool $updateName = true): int
{
    $stmt = $pdo->prepare('SELECT id FROM usuarios WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $id = $stmt->fetchColumn();
    if ($id !== false) {
        if (!$updateName) {
            return (int)$id;
        }
        $pdo->prepare('UPDATE usuarios SET nombre = ? WHERE id = ?')->execute([$name, (int)$id]);
        return (int)$id;
    }

    $password = password_hash(bin2hex(random_bytes(24)), PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, 'cliente')");
    $stmt->execute([$name, $email, $password]);
    return (int)$pdo->lastInsertId();
}

function money(int $cents): string
{
    return number_format($cents / 100, 2, '.', '');
}

try {
    $pdo = connection();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $action = (string)($_GET['action'] ?? '');

    if ($method === 'GET' && $action === 'products') {
        $rows = $pdo->query("SELECT p.id, p.nombre, p.descripcion, p.precio, p.stock, p.jugadores_min, p.jugadores_max, p.dificultad, p.tipo, p.imagen,
            (SELECT GROUP_CONCAT(DISTINCT TRIM(c.nombre) SEPARATOR '||') FROM producto_categoria pc JOIN categorias c ON c.id = pc.categoria_id WHERE pc.producto_id = p.id) AS categorias,
            (SELECT GROUP_CONCAT(DISTINCT o.pais SEPARATOR '||') FROM producto_origen po JOIN origenes o ON o.id = po.origen_id WHERE po.producto_id = p.id) AS origenes
            FROM productos p WHERE p.activo = 1 ORDER BY p.id")->fetchAll();
        $difficulty = ['facil' => 'Iniciación', 'media' => 'Media', 'dificil' => 'Experta'];
        $products = array_map(static function (array $row) use ($difficulty): array {
            $categories = array_values(array_filter(array_map('trim', explode('||', (string)$row['categorias']))));
            $min = (int)$row['jugadores_min'];
            $max = (int)$row['jugadores_max'];
            $filters = [];
            if ($min <= 1 && $max >= 1) $filters[] = 'solo';
            if ($max >= 2 && $min <= 3) $filters[] = 'small';
            if ($max >= 4) $filters[] = 'group';
            $origins = array_values(array_filter(explode('||', (string)$row['origenes'])));
            $category = $categories[0] ?? ($row['tipo'] === 'puzzle' ? 'Puzzle' : 'Juego de mesa');
            return [
                'id' => (int)$row['id'], 'title' => $row['nombre'], 'description' => $row['descripcion'],
                'price' => (float)$row['precio'], 'stock' => (int)$row['stock'],
                'players' => $min === $max ? (string)$min : "{$min}-{$max}", 'playerFilter' => $filters,
                'difficulty' => $difficulty[$row['dificultad']] ?? $row['dificultad'], 'category' => $category,
                'categories' => $categories, 'origin' => $origins[0] ?? 'Sin especificar',
                'image' => $row['imagen'], 'type' => $row['tipo'], 'subtitle' => $row['tipo'] === 'puzzle' ? 'Puzzle' : 'Juego de mesa',
                'duration' => 'Sin especificar', 'author' => '', 'mechanics' => '', 'language' => 'Consultar caja',
            ];
        }, $rows);
        respond(['products' => $products]);
    }

    if ($method === 'GET' && $action === 'events') {
        respond(['events' => eventRows($pdo, (int)($_GET['limit'] ?? 200))]);
    }

    if ($method === 'GET' && $action === 'orders') {
        respond(['orders' => orderRows($pdo, (int)($_GET['limit'] ?? 100))]);
    }

    if ($method === 'GET' && $action === 'summary') {
        $summary = $pdo->query("SELECT (SELECT COUNT(*) FROM pedidos) AS orders, (SELECT COALESCE(SUM(total), 0) FROM pedidos) AS revenue, (SELECT COUNT(*) FROM eventos) AS events, (SELECT COUNT(*) FROM incidencias) AS tickets")->fetch();
        respond(['summary' => ['orders' => (int)$summary['orders'], 'revenue' => (float)$summary['revenue'], 'events' => (int)$summary['events'], 'tickets' => (int)$summary['tickets']]]);
    }

    if ($method !== 'POST') {
        respond(['error' => 'Ruta no encontrada.'], 404);
    }

    $body = requestBody();
    if ($action === 'event') {
        $type = eventType((string)($body['type'] ?? ''));
        $payload = is_array($body['payload'] ?? null) ? $body['payload'] : [];
        $productId = isset($payload['productId']) ? (int)$payload['productId'] : null;
        recordEvent($pdo, $type, null, $productId, null, null, $payload);
        respond(['ok' => true]);
    }

    if ($action === 'order') {
        $name = trim((string)($body['customerName'] ?? ''));
        $email = trim((string)($body['email'] ?? ''));
        $items = $body['items'] ?? null;
        if (strlen($name) < 3 || !filter_var($email, FILTER_VALIDATE_EMAIL) || !is_array($items) || !$items) {
            throw new InvalidArgumentException('Revisa el nombre, el correo y el contenido del carrito.');
        }
        $address = trim((string)($body['address'] ?? ''));
        $postalCode = trim((string)($body['postalCode'] ?? ''));
        $city = trim((string)($body['city'] ?? ''));
        if (strlen($address) < 8 || !preg_match('/^\d{5}$/', $postalCode) || strlen($city) < 2) {
            throw new InvalidArgumentException('Revisa la dirección de entrega, el código postal y la ciudad.');
        }
        $methodMap = ['Tarjeta de prueba' => 'tarjeta_simulada', 'PayPal de prueba' => 'paypal_simulado', 'Transferencia simulada' => 'transferencia_simulada'];
        $payment = $methodMap[(string)($body['paymentMethod'] ?? '')] ?? null;
        if ($payment === null) {
            throw new InvalidArgumentException('Selecciona un método de pago de prueba válido.');
        }

        $quantities = [];
        foreach ($items as $item) {
            $productId = filter_var($item['productId'] ?? null, FILTER_VALIDATE_INT);
            $quantity = filter_var($item['quantity'] ?? null, FILTER_VALIDATE_INT);
            if (!$productId || !$quantity || $quantity < 1 || $quantity > 99) {
                throw new InvalidArgumentException('Hay una cantidad o referencia no válida en el carrito.');
            }
            $quantities[$productId] = ($quantities[$productId] ?? 0) + $quantity;
        }

        $pdo->beginTransaction();
        try {
            $ids = array_keys($quantities);
            $marks = implode(',', array_fill(0, count($ids), '?'));
            $stmt = $pdo->prepare("SELECT id, nombre, precio, stock FROM productos WHERE activo = 1 AND id IN ({$marks}) FOR UPDATE");
            $stmt->execute($ids);
            $products = [];
            foreach ($stmt->fetchAll() as $product) $products[(int)$product['id']] = $product;
            if (count($products) !== count($quantities)) {
                throw new InvalidArgumentException('Uno de los productos del carrito ya no está disponible.');
            }

            $subtotal = 0;
            foreach ($quantities as $productId => $quantity) {
                $product = $products[$productId];
                if ((int)$product['stock'] < $quantity) {
                    throw new InvalidArgumentException("No quedan unidades suficientes de {$product['nombre']}.");
                }
                $subtotal += (int)round((float)$product['precio'] * 100) * $quantity;
            }
            $discount = strtoupper(trim((string)($body['promo'] ?? ''))) === 'YUZU10' ? (int)round($subtotal * 0.10) : 0;
            $shipping = $subtotal === 0 || $subtotal >= 7000 ? 0 : 690;
            $tax = (int)round(($subtotal - $discount + $shipping) * 0.21);
            $total = $subtotal - $discount + $shipping + $tax;

            $userId = findOrCreateUser($pdo, $name, $email);
            $code = 'PED-' . gmdate('Ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
            $stmt = $pdo->prepare("INSERT INTO pedidos (codigo_pedido, usuario_id, estado, subtotal, impuestos, gastos_envio, descuento, total) VALUES (?, ?, 'pagado', ?, ?, ?, ?, ?)");
            $stmt->execute([$code, $userId, money($subtotal), money($tax), money($shipping), money($discount), money($total)]);
            $orderId = (int)$pdo->lastInsertId();

            $lineStmt = $pdo->prepare('INSERT INTO lineas_pedido (pedido_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)');
            $stockStmt = $pdo->prepare('UPDATE productos SET stock = stock - ? WHERE id = ? AND stock >= ?');
            $orderItems = [];
            foreach ($quantities as $productId => $quantity) {
                $product = $products[$productId];
                $unitCents = (int)round((float)$product['precio'] * 100);
                $lineCents = $unitCents * $quantity;
                $lineStmt->execute([$orderId, $productId, $quantity, money($unitCents), money($lineCents)]);
                $stockStmt->execute([$quantity, $productId, $quantity]);
                if ($stockStmt->rowCount() !== 1) throw new InvalidArgumentException("No quedan unidades suficientes de {$product['nombre']}.");
                $orderItems[] = ['productId' => (int)$productId, 'title' => $product['nombre'], 'unitPrice' => $unitCents / 100, 'quantity' => $quantity];
            }

            $addressStmt = $pdo->prepare('INSERT INTO direcciones_pedido (pedido_id, direccion, codigo_postal, ciudad) VALUES (?, ?, ?, ?)');
            $addressStmt->execute([$orderId, $address, $postalCode, $city]);
            $reference = 'PAGO-' . strtoupper(bin2hex(random_bytes(5)));
            $pdo->prepare("INSERT INTO pagos (pedido_id, metodo_pago, estado, importe, referencia) VALUES (?, ?, 'aprobado', ?, ?)")->execute([$orderId, $payment, money($total), $reference]);
            recordEvent($pdo, 'pedido.creado', $userId, null, $orderId, null, ['codigoPedido' => $code, 'total' => $total / 100]);
            recordEvent($pdo, 'pago.simulado', $userId, null, $orderId, null, ['metodo' => $payment, 'referencia' => $reference, 'importe' => $total / 100]);
            $pdo->commit();

            respond(['order' => [
                'id' => $code, 'createdAt' => gmdate('c'), 'customer' => ['name' => $name, 'email' => $email],
                'items' => $orderItems, 'totals' => ['subtotal' => $subtotal / 100, 'discount' => $discount / 100, 'shipping' => $shipping / 100, 'tax' => $tax / 100, 'total' => $total / 100],
                'payment' => ['method' => (string)($body['paymentMethod']), 'status' => 'Aprobado', 'reference' => $reference],
                'status' => 'Pagado · pendiente de preparación',
            ]], 201);
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $error;
        }
    }

    if ($action === 'support') {
        $email = trim((string)($body['email'] ?? ''));
        $message = trim((string)($body['message'] ?? ''));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $message === '') {
            throw new InvalidArgumentException('Introduce un correo válido y una descripción de la solicitud.');
        }
        $pdo->beginTransaction();
        try {
            $userId = findOrCreateUser($pdo, 'Cliente web', $email, false);
            $stmt = $pdo->prepare("INSERT INTO incidencias (usuario_id, asunto, descripcion, estado, prioridad) VALUES (?, 'Solicitud desde la web', ?, 'abierta', 'media')");
            $stmt->execute([$userId, $message]);
            $incidentId = (int)$pdo->lastInsertId();
            recordEvent($pdo, 'incidencia.creada', $userId, null, null, $incidentId, ['incidenciaId' => $incidentId, 'canal' => 'web-form']);
            $pdo->commit();
            respond(['ticket' => ['id' => $incidentId, 'status' => 'abierta'] ], 201);
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $error;
        }
    }

    respond(['error' => 'Ruta no encontrada.'], 404);
} catch (InvalidArgumentException $error) {
    respond(['error' => $error->getMessage()], 422);
} catch (Throwable $error) {
    error_log('[Pangea Meeple API] ' . $error->getMessage());
    respond(['error' => 'No se pudo completar la operación. Comprueba los datos de conexión de DonDominio, que PHP tenga PDO MySQL habilitado y que se haya importado la extensión web.', 'hint' => 'Consulta el registro de errores PHP del hosting para el detalle técnico.'], 500);
}

