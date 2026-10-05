<?php
declare(strict_types=1);
function pfMailSend(array $cfg,string $subject,string $body,string $replyTo=''): bool {
    if(empty($cfg['enabled'])) return false;
    if(empty($cfg['host'])||empty($cfg['username'])||empty($cfg['password'])||empty($cfg['from_email'])||empty($cfg['to_email'])) return false;
    $host=(string)$cfg['host'];$port=(int)($cfg['port']??587);$timeout=max(5,min((int)($cfg['timeout']??15),30));$implicit=$port===465;
    $ctx=stream_context_create(['ssl'=>['verify_peer'=>true,'verify_peer_name'=>true,'peer_name'=>$host,'SNI_enabled'=>true]]);
    $socket=@stream_socket_client(($implicit?'tls://':'tcp://').$host.':'.$port,$eno,$emsg,$timeout,STREAM_CLIENT_CONNECT,$ctx); if($socket===false)return false;
    $read=function()use($socket){$lines=[];do{$line=fgets($socket,515);if($line===false)throw new RuntimeException('SMTP cerrado');$lines[]=rtrim($line,"\r\n");}while(isset($line[3])&&$line[3]==='-');if(!preg_match('/^(\d{3})/',$lines[0],$m))throw new RuntimeException('SMTP inválido');return[(int)$m[1],implode("\n",$lines)];};
    $write=function(string $s)use($socket){while($s!==''){ $w=fwrite($socket,$s);if($w===false||$w===0)throw new RuntimeException('SMTP escritura');$s=substr($s,$w);}};
    $cmd=function(string $c,array $expected,string $step)use($write,$read){$write($c."\r\n");[$code,$resp]=$read();if(!in_array($code,$expected,true))throw new RuntimeException($step.' SMTP '.$code);return $resp;};
    try{stream_set_timeout($socket,$timeout);[$code]=$read();if($code!==220)throw new RuntimeException('SMTP greeting');$ehlo=$cmd('EHLO '.((string)parse_url((string)($cfg['ehlo']??'planetaficha.local'),PHP_URL_HOST)?:'planetaficha.local'),[250],'EHLO');if(!$implicit){if(stripos($ehlo,'STARTTLS')===false)throw new RuntimeException('SMTP sin STARTTLS');$cmd('STARTTLS',[220],'STARTTLS');if(@stream_socket_enable_crypto($socket,true,STREAM_CRYPTO_METHOD_TLS_CLIENT)!==true)throw new RuntimeException('TLS');$cmd('EHLO planetaficha.local',[250],'EHLO');}$cmd('AUTH LOGIN',[334],'AUTH');$cmd(base64_encode((string)$cfg['username']),[334],'usuario');$cmd(base64_encode((string)$cfg['password']),[235],'clave');$from=(string)$cfg['from_email'];$to=(string)$cfg['to_email'];$cmd('MAIL FROM:<'.$from.'>',[250],'MAIL');$cmd('RCPT TO:<'.$to.'>',[250,251],'RCPT');$cmd('DATA',[354],'DATA');$sub='=?UTF-8?B?'.base64_encode($subject).'?=';$headers=['Date: '.date(DATE_RFC2822),'From: '.($cfg['from_name']??'PlanetaFicha').' <'.$from.'>','To: <'.$to.'>','Subject: '.$sub,'MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64'];if($replyTo!=='')$headers[]='Reply-To: <'.$replyTo.'>';$message=implode("\r\n",$headers)."\r\n\r\n".rtrim(chunk_split(base64_encode($body),76,"\r\n"),"\r\n");$write($message."\r\n.\r\n");[$code]=$read();if($code!==250)throw new RuntimeException('SMTP DATA');$write("QUIT\r\n");return true;}catch(Throwable $e){error_log('[PlanetaFicha mail] '.$e->getMessage());return false;}finally{fclose($socket);}
}

/**
 * Envía el resumen de un pedido ya guardado al correo configurado y termina la petición.
 * Primero responde al navegador (el pedido ya está en la base de datos) y después envía el correo,
 * de modo que un fallo o una lentitud del SMTP nunca afecta al cliente.
 */
function pfNotifyOrder(array $mailCfg, array $order, array $customer): never {
    $payload = json_encode(['ok' => true, 'order' => $order], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    http_response_code(201);
    header('Content-Length: ' . strlen((string)$payload));
    header('Connection: close');
    echo $payload;
    if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
    if (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request();
    } else {
        while (ob_get_level() > 0) ob_end_flush();
        flush();
    }
    try {
        $eur = fn($v): string => number_format((float)$v, 2, ',', '.') . ' €';
        $t = $order['totals'] ?? [];
        $lines = [];
        foreach (($order['items'] ?? []) as $i) {
            $lines[] = ' - ' . (int)($i['quantity'] ?? 0) . '× ' . (string)($i['title'] ?? '?')
                . ' · ' . $eur($i['unitPrice'] ?? 0) . ' c/u · ' . $eur($i['lineTotal'] ?? 0);
        }
        $pay = $order['payment'] ?? [];
        $body = "Nuevo pedido en PlanetaFicha (prototipo académico, pago simulado)\n\n"
            . 'Pedido: ' . ($order['id'] ?? '?') . "\n"
            . 'Fecha: ' . ($order['createdAt'] ?? date(DATE_ATOM)) . "\n"
            . 'Cliente: ' . ($order['userName'] ?? $customer['name'] ?? '') . ' <' . ($order['userEmail'] ?? $customer['email'] ?? '') . '> (usuario #' . ($order['userId'] ?? '?') . ")\n\n"
            . "Entrega:\n " . ($customer['address'] ?? '') . "\n " . ($customer['postalCode'] ?? '') . ' ' . ($customer['city'] ?? '') . "\n\n"
            . "Productos:\n" . ($lines ? implode("\n", $lines) : ' (sin detalle)') . "\n\n"
            . 'Subtotal: ' . $eur($t['subtotal'] ?? 0) . "\n"
            . 'Descuento: ' . $eur($t['discount'] ?? 0) . "\n"
            . 'Envío: ' . $eur($t['shipping'] ?? 0) . "\n"
            . 'IVA: ' . $eur($t['tax'] ?? 0) . "\n"
            . 'TOTAL: ' . $eur($t['total'] ?? 0) . "\n\n"
            . 'Pago: ' . ($pay['method'] ?? '') . ' · ' . ($pay['reference'] ?? '') . " (simulado, sin cobro real)\n";
        $replyTo = (string)($customer['email'] ?? '');
        pfMailSend($mailCfg, 'Nuevo pedido ' . ($order['id'] ?? '') . ' - PlanetaFicha', $body, filter_var($replyTo, FILTER_VALIDATE_EMAIL) ? $replyTo : '');
    } catch (Throwable $e) {
        error_log('[PlanetaFicha pedido-mail] ' . $e->getMessage());
    }
    exit; 
}
