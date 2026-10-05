<?php
declare(strict_types=1);

/**
 * SMTP helper shared by order and incident notifications.
 * Port 587 uses STARTTLS; port 465 uses implicit TLS. Certificate verification
 * stays enabled in both modes. SMTP failures never roll back stored records.
 */
function pfMailSend(array $cfg, string $subject, string $body, string $replyTo = ''): bool
{
    if (empty($cfg['enabled'])) {
        return false;
    }

    $required = ['host', 'username', 'password', 'from_email', 'to_email'];
    foreach ($required as $key) {
        if (!isset($cfg[$key]) || trim((string)$cfg[$key]) === '') {
            error_log('[PlanetaFicha mail] Configuración SMTP incompleta (' . $key . ').');
            return false;
        }
    }

    $host = trim((string)$cfg['host']);
    $port = (int)($cfg['port'] ?? 587);
    $from = trim((string)$cfg['from_email']);
    $to = trim((string)$cfg['to_email']);
    if (!preg_match('/^[A-Za-z0-9.-]+$/', $host)
        || $port < 1 || $port > 65535
        || !filter_var($from, FILTER_VALIDATE_EMAIL)
        || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
        error_log('[PlanetaFicha mail] Host, puerto o dirección SMTP no válidos.');
        return false;
    }
    if ($replyTo !== '' && !filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
        $replyTo = '';
    }

    $timeout = max(5, min((int)($cfg['timeout'] ?? 15), 30));
    $implicitTls = $port === 465;
    $sslContext = stream_context_create([
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
        $sslContext
    );
    if ($socket === false) {
        error_log('[PlanetaFicha mail] No se pudo abrir conexión SMTP (código ' . (int)$errorNumber . ').');
        return false;
    }

    $readResponse = static function () use ($socket): array {
        $lines = [];
        do {
            $line = fgets($socket, 515);
            if ($line === false) {
                $metadata = stream_get_meta_data($socket);
                throw new RuntimeException(!empty($metadata['timed_out']) ? 'Timeout SMTP.' : 'Conexión SMTP cerrada.');
            }
            $lines[] = rtrim($line, "\r\n");
        } while (isset($line[3]) && $line[3] === '-');

        if (!preg_match('/^(\d{3})/', $lines[0], $match)) {
            throw new RuntimeException('Respuesta SMTP no reconocida.');
        }
        return [(int)$match[1], implode("\n", $lines)];
    };

    $writeAll = static function (string $data) use ($socket): void {
        while ($data !== '') {
            $written = fwrite($socket, $data);
            if ($written === false || $written === 0) {
                throw new RuntimeException('No se pudo escribir en SMTP.');
            }
            $data = substr($data, $written);
        }
    };

    $command = static function (string $value, array $expected, string $step) use ($writeAll, $readResponse): string {
        $writeAll($value . "\r\n");
        [$code, $response] = $readResponse();
        if (!in_array($code, $expected, true)) {
            throw new RuntimeException($step . ' rechazado por SMTP (' . $code . ').');
        }
        return $response;
    };

    try {
        stream_set_timeout($socket, $timeout);
        [$code] = $readResponse();
        if ($code !== 220) {
            throw new RuntimeException('Saludo SMTP rechazado.');
        }

        $ehlo = trim((string)($cfg['ehlo'] ?? 'planetaficha.onl'));
        if (!preg_match('/^[A-Za-z0-9.-]+$/', $ehlo)) {
            $ehlo = 'planetaficha.onl';
        }
        $capabilities = $command('EHLO ' . $ehlo, [250], 'EHLO');
        if (!$implicitTls) {
            if (stripos($capabilities, 'STARTTLS') === false) {
                throw new RuntimeException('El servidor SMTP no ofrece STARTTLS.');
            }
            $command('STARTTLS', [220], 'STARTTLS');
            if (@stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT) !== true) {
                throw new RuntimeException('No se pudo activar TLS.');
            }
            $command('EHLO ' . $ehlo, [250], 'EHLO tras TLS');
        }

        $command('AUTH LOGIN', [334], 'AUTH');
        $command(base64_encode((string)$cfg['username']), [334], 'Usuario');
        $command(base64_encode((string)$cfg['password']), [235], 'Autenticación');
        $command('MAIL FROM:<' . $from . '>', [250], 'Remitente');
        $command('RCPT TO:<' . $to . '>', [250, 251], 'Destinatario');
        $command('DATA', [354], 'DATA');

        $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
        $fromName = '=?UTF-8?B?' . base64_encode((string)($cfg['from_name'] ?? 'PlanetaFicha')) . '?=';
        $headers = [
            'Date: ' . date(DATE_RFC2822),
            'From: ' . $fromName . ' <' . $from . '>',
            'To: <' . $to . '>',
            'Subject: ' . $encodedSubject,
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
        ];
        if ($replyTo !== '') {
            $headers[] = 'Reply-To: <' . $replyTo . '>';
        }
        $encodedBody = rtrim(chunk_split(base64_encode($body), 76, "\r\n"), "\r\n");
        $writeAll(implode("\r\n", $headers) . "\r\n\r\n" . $encodedBody . "\r\n.\r\n");
        [$code] = $readResponse();
        if ($code !== 250) {
            throw new RuntimeException('SMTP no aceptó el mensaje (' . $code . ').');
        }
        $writeAll("QUIT\r\n");
        return true;
    } catch (Throwable $error) {
        error_log('[PlanetaFicha mail] ' . $error->getMessage());
        return false;
    } finally {
        fclose($socket);
    }
}

/** Send the notification after the order is committed to the database. */
function pfSendOrderNotice(array $mailCfg, array $order, array $customer): bool
{
    $currency = static fn($value): string => number_format((float)$value, 2, ',', '.') . ' EUR';
    $totals = $order['totals'] ?? [];
    $lines = [];
    foreach (($order['items'] ?? []) as $item) {
        $lines[] = sprintf(
            '- %d × %s · %s c/u · %s',
            (int)($item['quantity'] ?? 0),
            (string)($item['title'] ?? 'Producto'),
            $currency($item['unitPrice'] ?? 0),
            $currency($item['lineTotal'] ?? 0)
        );
    }
    $payment = $order['payment'] ?? [];
    $body = implode("\n", [
        'Nuevo pedido en PlanetaFicha (prototipo académico, pago simulado)',
        '',
        'Pedido: ' . (string)($order['id'] ?? '?'),
        'Fecha: ' . (string)($order['createdAt'] ?? date(DATE_ATOM)),
        'Estado: ' . (string)($order['status'] ?? 'pagado'),
        'Cliente: ' . (string)($order['userName'] ?? $customer['name'] ?? '')
            . ' <' . (string)($order['userEmail'] ?? $customer['email'] ?? '') . '>',
        'Usuario ID: ' . (string)($order['userId'] ?? '?'),
        '',
        'ENTREGA',
        (string)($customer['address'] ?? ''),
        (string)($customer['postalCode'] ?? '') . ' ' . (string)($customer['city'] ?? ''),
        '',
        'PRODUCTOS',
        $lines ? implode("\n", $lines) : '(sin detalle)',
        '',
        'Subtotal: ' . $currency($totals['subtotal'] ?? 0),
        'Descuento: ' . $currency($totals['discount'] ?? 0),
        'Envío: ' . $currency($totals['shipping'] ?? 0),
        'IVA: ' . $currency($totals['tax'] ?? 0),
        'TOTAL: ' . $currency($totals['total'] ?? 0),
        '',
        'Pago: ' . (string)($payment['method'] ?? '') . ' · ' . (string)($payment['reference'] ?? '')
            . ' (simulado; no se ha realizado ningún cobro)',
    ]);

    $customerEmail = (string)($customer['email'] ?? '');
    return pfMailSend(
        $mailCfg,
        'Nuevo pedido ' . (string)($order['id'] ?? '') . ' - PlanetaFicha',
        $body,
        filter_var($customerEmail, FILTER_VALIDATE_EMAIL) ? $customerEmail : ''
    );
}
