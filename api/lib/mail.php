<?php
declare(strict_types=1);

/**
 * SMTP helper shared by order and incident notifications.
 * Port 587 uses STARTTLS; port 465 uses implicit TLS. Certificate verification
 * stays enabled in both modes. SMTP failures never roll back stored records.
 */
function pfMailSend(array $cfg, string $subject, string $body, string $replyTo = '', string $recipient = '', bool $html = false): bool
{
    if (empty($cfg['enabled'])) {
        return false;
    }

    $required = ['host', 'username', 'password', 'from_email'];
    foreach ($required as $key) {
        if (!isset($cfg[$key]) || trim((string)$cfg[$key]) === '') {
            error_log('[PlanetaFicha mail] Configuración SMTP incompleta (' . $key . ').');
            return false;
        }
    }

    $host = trim((string)$cfg['host']);
    $port = (int)($cfg['port'] ?? 587);
    $from = trim((string)$cfg['from_email']);
    $to = trim($recipient !== '' ? $recipient : (string)($cfg['to_email'] ?? ''));
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
            'Content-Type: ' . ($html ? 'text/html' : 'text/plain') . '; charset=UTF-8',
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
    $corporateSent = pfMailSend(
        $mailCfg,
        'Nuevo pedido ' . (string)($order['id'] ?? '') . ' - PlanetaFicha',
        $body,
        filter_var($customerEmail, FILTER_VALIDATE_EMAIL) ? $customerEmail : ''
    );

    // Send the customer a separate, branded order receipt/invoice by email.
    if (!filter_var($customerEmail, FILTER_VALIDATE_EMAIL)) {
        return $corporateSent;
    }
    $escape = static fn($value): string => htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $rows = '';
    foreach (($order['items'] ?? []) as $item) {
        $rows .= '<tr><td style="padding:14px 10px;border-bottom:1px solid #eee8dc">'
            . $escape($item['title'] ?? 'Producto') . '</td><td style="padding:14px 10px;text-align:center;border-bottom:1px solid #eee8dc">'
            . (int)($item['quantity'] ?? 0) . '</td><td style="padding:14px 10px;text-align:right;border-bottom:1px solid #eee8dc">'
            . $currency($item['lineTotal'] ?? 0) . '</td></tr>';
    }
    $totalsHtml = '';
    foreach ([['Subtotal','subtotal'],['Descuento','discount'],['Envío','shipping'],['IVA','tax']] as [$label,$key]) {
        $totalsHtml .= '<tr><td style="padding:5px 0;color:#66716b">' . $label . '</td><td style="padding:5px 0;text-align:right">'
            . $currency($totals[$key] ?? 0) . '</td></tr>';
    }
    $orderId = $escape($order['id'] ?? '');
    $date = $escape($order['createdAt'] ?? date(DATE_ATOM));
    $name = $escape($customer['name'] ?? '');
    $address = $escape($customer['address'] ?? '') . '<br>' . $escape($customer['postalCode'] ?? '') . ' ' . $escape($customer['city'] ?? '');
    $invoice = '<!doctype html><html><body style="margin:0;background:#f3efe5;font-family:Arial,sans-serif;color:#19211e">'
        . '<div style="max-width:680px;margin:24px auto;background:#fffdf8;border:1px solid #e5ddcd">'
        . '<div style="padding:30px 36px;background:#19211e;color:#fffdf8"><div style="font-size:12px;letter-spacing:3px;color:#f0785b">PLANETAFICHA</div>'
        . '<h1 style="font-family:Georgia,serif;font-size:32px;margin:18px 0 4px">Gracias por tu compra</h1><div style="color:#d9d7cc">Tu pedido ya está registrado</div></div>'
        . '<div style="padding:30px 36px"><div style="display:flex;justify-content:space-between"><div><b>FACTURA / RECIBO</b><br><span style="color:#69716c">Pedido ' . $orderId . '<br>' . $date . '</span></div>'
        . '<div style="text-align:right">' . $name . '<br>' . $address . '</div></div>'
        . '<table style="width:100%;border-collapse:collapse;margin-top:26px"><thead><tr style="text-align:left;color:#66716b"><th style="padding:10px">Artículo</th><th style="padding:10px;text-align:center">Cant.</th><th style="padding:10px;text-align:right">Importe</th></tr></thead><tbody>' . $rows . '</tbody></table>'
        . '<table style="width:260px;margin:18px 0 0 auto;border-collapse:collapse">' . $totalsHtml
        . '<tr><td style="padding:12px 0;border-top:2px solid #19211e;font-size:18px"><b>Total</b></td><td style="padding:12px 0;border-top:2px solid #19211e;text-align:right;font-size:18px"><b>' . $currency($totals['total'] ?? 0) . '</b></td></tr></table>'
        . '<div style="margin-top:28px;padding:15px;background:#f3efe5;color:#59635d;font-size:13px">Pago de demostración. Este proyecto es un prototipo académico y este mensaje no constituye una factura fiscal.</div>'
        . '<p style="margin-top:28px;color:#69716c">¿Tienes alguna duda? Responde a este correo y estaremos encantados de ayudarte.</p></div></div></body></html>';
    $customerSent = pfMailSend($mailCfg, 'Tu pedido ' . (string)($order['id'] ?? '') . ' - PlanetaFicha', $invoice, '', $customerEmail, true);
    return $corporateSent && $customerSent;
}
