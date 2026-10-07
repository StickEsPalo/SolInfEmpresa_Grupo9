<?php
declare(strict_types=1);

final class PFDatabase {
    private static ?PFDatabase $instance = null;
    private array $config;
    private ?PDO $pdo = null;
    private string $driver;
    private ?string $mockFile = null;
    private array $mock = [];

    private function __construct(array $config) {
        $this->config = $config;
        $this->driver = (string)($config['db']['driver'] ?? 'mysql');
        if ($this->driver === 'mysql') {
            $db = $config['db'];
            $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s',
                $db['host'] ?? 'localhost',
                (int)($db['port'] ?? 3306),
                $db['name'] ?? '',
                $db['charset'] ?? 'utf8mb4'
            );
            $this->pdo = new PDO($dsn, (string)($db['user'] ?? ''), (string)($db['password'] ?? ''), [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } elseif ($this->driver === 'mock') {
            $this->mockFile = (string)($config['db']['file'] ?? (__DIR__ . '/../../tests/mock-db.json'));
            $dir = dirname($this->mockFile);
            if (!is_dir($dir)) mkdir($dir, 0775, true);
            if (is_file($this->mockFile)) {
                $decoded = json_decode((string)file_get_contents($this->mockFile), true);
                $this->mock = is_array($decoded) ? $decoded : [];
            }
            $this->mock += ['users'=>[], 'products'=>[], 'orders'=>[], 'events'=>[], 'incidents'=>[], 'next'=>['user'=>1,'order'=>1,'event'=>1,'incident'=>1]];
        } else {
            throw new RuntimeException('DB driver no soportado.');
        }
    }

    public static function fromConfig(array $config): self {
        if (!self::$instance) self::$instance = new self($config);
        return self::$instance;
    }

    public function isMock(): bool { return $this->driver === 'mock'; }

    private function saveMock(): void {
        if ($this->mockFile === null) return;
        file_put_contents($this->mockFile, json_encode($this->mock, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE), LOCK_EX);
    }

    public function findUserByEmail(string $email): ?array {
        $email = strtolower(trim($email));
        if ($this->isMock()) {
            foreach ($this->mock['users'] as $u) if (strtolower((string)$u['email']) === $email) return $u;
            return null;
        }
        $st = $this->pdo->prepare('SELECT id, nombre, apellidos, email, password, rol, fecha_registro FROM usuarios WHERE email = ? LIMIT 1');
        $st->execute([$email]);
        return $st->fetch() ?: null;
    }

    public function findUserById(int $id): ?array {
        if ($this->isMock()) foreach ($this->mock['users'] as $u) if ((int)$u['id'] === $id) return $u;
        if ($this->isMock()) return null;
        $st = $this->pdo->prepare('SELECT id, nombre, apellidos, email, rol, fecha_registro FROM usuarios WHERE id = ? LIMIT 1');
        $st->execute([$id]);
        return $st->fetch() ?: null;
    }

    public function createUser(string $nombre, string $apellidos, string $email, string $hash): array {
        if ($this->isMock()) {
            $id = (int)$this->mock['next']['user']++;
            $row = ['id'=>$id,'nombre'=>$nombre,'apellidos'=>$apellidos,'email'=>$email,'password'=>$hash,'rol'=>'cliente','fecha_registro'=>date('c')];
            $this->mock['users'][] = $row; $this->saveMock(); return $row;
        }
        $st = $this->pdo->prepare("INSERT INTO usuarios (nombre, apellidos, email, password, rol) VALUES (?, ?, ?, ?, 'cliente')");
        $st->execute([$nombre,$apellidos,$email,$hash]);
        return $this->findUserById((int)$this->pdo->lastInsertId());
    }

    public function products(): array {
        if ($this->isMock()) return array_values(array_filter($this->mock['products'], fn($p)=>(int)($p['activo'] ?? 1) === 1));
        $sql = "SELECT p.id,p.nombre,p.subtitulo,p.descripcion,p.precio,p.stock,p.jugadores_min,p.jugadores_max,p.dificultad,p.tipo,p.imagen,p.autor,p.duracion,p.mecanicas,p.idioma,p.producto_padre_id,
                COALESCE(GROUP_CONCAT(DISTINCT c.nombre ORDER BY c.nombre SEPARATOR ' · '),'') AS categorias,
                COALESCE(GROUP_CONCAT(DISTINCT o.pais ORDER BY o.pais SEPARATOR ' / '),'') AS origenes
                FROM productos p
                LEFT JOIN producto_categoria pc ON pc.producto_id=p.id
                LEFT JOIN categorias c ON c.id=pc.categoria_id
                LEFT JOIN producto_origen po ON po.producto_id=p.id
                LEFT JOIN origenes o ON o.id=po.origen_id
                WHERE p.activo=1
                GROUP BY p.id
                ORDER BY p.id";
        return $this->pdo->query($sql)->fetchAll();
    }

    public function productsByIds(array $ids, bool $forUpdate=false): array {
        $ids = array_values(array_unique(array_map('intval',$ids)));
        if (!$ids) return [];
        if ($this->isMock()) return array_values(array_filter($this->mock['products'], fn($p)=>in_array((int)$p['id'],$ids,true) && (int)($p['activo'] ?? 1)===1));
        $placeholders = implode(',', array_fill(0,count($ids),'?'));
        $sql = "SELECT id,nombre,subtitulo,precio,stock,activo FROM productos WHERE id IN ($placeholders)" . ($forUpdate ? ' FOR UPDATE':'');
        $st=$this->pdo->prepare($sql); $st->execute($ids); return $st->fetchAll();
    }

    public function transaction(callable $fn) {
        if ($this->isMock()) {
            $before = $this->mock;
            try { $result=$fn(); $this->saveMock(); return $result; }
            catch (Throwable $e) { $this->mock=$before; throw $e; }
        }
        $this->pdo->beginTransaction();
        try { $result=$fn(); $this->pdo->commit(); return $result; }
        catch (Throwable $e) { if($this->pdo->inTransaction())$this->pdo->rollBack(); throw $e; }
    }

    public function execute(string $sql,array $params=[]): int {
        $st=$this->pdo->prepare($sql); $st->execute($params); return $st->rowCount();
    }
    public function pdo(): PDO { if(!$this->pdo) throw new RuntimeException('PDO no disponible para driver mock.'); return $this->pdo; }

    public function createOrder(int $userId,array $customer,array $items,string $paymentUi,string $promoCode): array {
        $productIds=array_column($items,'productId');
        $products=$this->productsByIds($productIds,true);
        $index=[]; foreach($products as $p)$index[(int)$p['id']]=$p;
        $lines=[]; $subtotal=0.0;
        foreach($items as $item){
            $pid=(int)($item['productId']??0); $qty=(int)($item['quantity']??0);
            if($qty<1||$qty>99||!isset($index[$pid])) throw new DomainException('Uno de los productos del carrito ya no está disponible.');
            $p=$index[$pid]; if((int)$p['activo']!==1 || (int)$p['stock']<$qty) throw new DomainException('No hay stock suficiente para uno de los productos.');
            $unit=(float)$p['precio']; $lineTotal=round($unit*$qty,2); $subtotal+= $lineTotal;
            $lines[]=['productId'=>$pid,'title'=>$p['nombre'].(($p['subtitulo']??'')!==''?' · '.$p['subtitulo']:''),'unitPrice'=>$unit,'quantity'=>$qty,'lineTotal'=>$lineTotal];
        }
        $subtotal=round($subtotal,2);
        $discount = strtoupper(trim($promoCode))==='YUZU10' ? round($subtotal*0.10,2) : 0.0;
        $shipping=($subtotal<=0||$subtotal>=70)?0.0:6.90;
        $tax=round(($subtotal-$discount+$shipping)*0.21,2);
        $total=round($subtotal-$discount+$shipping+$tax,2);
        $paymentDb=['Tarjeta de prueba'=>'tarjeta_simulada','Bizum de prueba'=>'bizum_simulado','Transferencia simulada'=>'transferencia_simulada'][$paymentUi]??null;
        if(!$paymentDb) throw new DomainException('Método de pago no válido.');
        $code='PF-'.date('Y').'-'.strtoupper(bin2hex(random_bytes(4)));
        $now=date(DATE_ATOM); $paymentRef='SIM-'.strtoupper(bin2hex(random_bytes(3)));
        $orderId=0;
        $result=$this->transaction(function() use (&$orderId,&$code,&$now,$userId,$customer,$lines,$subtotal,$discount,$shipping,$tax,$total,$paymentDb,$paymentRef){
            if($this->isMock()){
                $orderId=(int)$this->mock['next']['order']++;
                foreach($lines as $l) foreach($this->mock['products'] as &$p) if((int)$p['id']===$l['productId']) $p['stock']-=$l['quantity'];
                unset($p);
                $order=['id'=>$orderId,'codigo_pedido'=>$code,'usuario_id'=>$userId,'estado'=>'pagado','subtotal'=>$subtotal,'impuestos'=>$tax,'gastos_envio'=>$shipping,'descuento'=>$discount,'total'=>$total,'fecha_pedido'=>$now,'customer'=>$customer,'items'=>$lines,'payment'=>['method'=>$paymentDb,'status'=>'aprobado','importe'=>$total,'referencia'=>$paymentRef,'fecha_pago'=>$now]];
                $this->mock['orders'][]=$order;
                $this->mock['events'][]=['id'=>(int)$this->mock['next']['event']++,'tipo_evento'=>'order.created','usuario_id'=>$userId,'pedido_id'=>$orderId,'producto_id'=>null,'datos'=>'Pedido creado correctamente','fecha_evento'=>$now];
                $this->mock['events'][]=['id'=>(int)$this->mock['next']['event']++,'tipo_evento'=>'payment.simulated','usuario_id'=>$userId,'pedido_id'=>$orderId,'producto_id'=>null,'datos'=>'Pago simulado aprobado','fecha_evento'=>$now];
                return $order;
            }
            $pdo=$this->pdo;
            $st=$pdo->prepare('INSERT INTO pedidos (codigo_pedido,usuario_id,estado,subtotal,impuestos,gastos_envio,descuento,total) VALUES (?,?,?,?,?,?,?,?)');
            $st->execute([$code,$userId,'pagado',$subtotal,$tax,$shipping,$discount,$total]);
            $orderId=(int)$pdo->lastInsertId();
            $addr=$pdo->prepare('INSERT INTO direcciones_pedido (pedido_id,direccion,codigo_postal,ciudad) VALUES (?,?,?,?)');
            $addr->execute([$orderId,$customer['address'],$customer['postalCode'],$customer['city']]);
            $li=$pdo->prepare('INSERT INTO lineas_pedido (pedido_id,producto_id,cantidad,precio_unitario,subtotal) VALUES (?,?,?,?,?)');
            $stock=$pdo->prepare('UPDATE productos SET stock=stock-? WHERE id=? AND stock>=?');
            foreach($lines as $l){$stock->execute([$l['quantity'],$l['productId'],$l['quantity']]); if($stock->rowCount()!==1) throw new DomainException('Stock insuficiente.'); $li->execute([$orderId,$l['productId'],$l['quantity'],$l['unitPrice'],$l['lineTotal']]);}
            $pay=$pdo->prepare('INSERT INTO pagos (pedido_id,metodo_pago,estado,importe,referencia) VALUES (?,?,?,?,?)'); $pay->execute([$orderId,$paymentDb,'aprobado',$total,$paymentRef]);
            $ev=$pdo->prepare('INSERT INTO eventos (tipo_evento,usuario_id,pedido_id,datos) VALUES (?,?,?,?)');
            $ev->execute(['order.created',$userId,$orderId,json_encode(['total'=>$total],JSON_UNESCAPED_UNICODE)]);
            $ev->execute(['payment.simulated',$userId,$orderId,json_encode(['method'=>$paymentDb,'reference'=>$paymentRef],JSON_UNESCAPED_UNICODE)]);
            return $this->getOrderForUser($orderId,$userId);
        });
        if ($this->isMock()) return $this->normalizeOrder($result);
        return is_array($result)?$result:$this->getOrderForUser($orderId,$userId);
    }

    private function hydrateMockOrder(array $order): array { return $order; }

    public function getOrderForUser(int $orderId, int $userId): ?array {
        if ($this->isMock()) {
            foreach ($this->mock['orders'] as $order) {
                if (
                    (int) $order['id'] === $orderId
                    && (int) $order['usuario_id'] === $userId
                ) {
                    return $this->normalizeOrder($order);
                }
            }
            return null;
        }

        $statement = $this->pdo->prepare(
            'SELECT p.id, p.codigo_pedido, p.usuario_id, p.estado,
                    p.subtotal, p.impuestos, p.gastos_envio, p.descuento,
                    p.total, p.fecha_pedido, u.nombre, u.apellidos, u.email,
                    d.direccion, d.codigo_postal, d.ciudad,
                    pg.metodo_pago, pg.estado AS pago_estado,
                    pg.importe AS pago_importe,
                    pg.referencia AS pago_referencia
             FROM pedidos p
             JOIN usuarios u ON u.id = p.usuario_id
             LEFT JOIN direcciones_pedido d ON d.pedido_id = p.id
             LEFT JOIN pagos pg ON pg.pedido_id = p.id
             WHERE p.id = ? AND p.usuario_id = ?
             LIMIT 1',
        );
        $statement->execute([$orderId, $userId]);
        $order = $statement->fetch();

        if (!$order) {
            return null;
        }

        $order['items'] = $this->getOrderItems($orderId);
        return $this->normalizeOrder($order);
    }
    private function getOrderItems(int $orderId): array {
        if ($this->isMock()) {
            return [];
        }

        $statement = $this->pdo->prepare(
            'SELECT lp.producto_id AS productId, p.nombre, p.subtitulo,
                    lp.cantidad AS quantity,
                    lp.precio_unitario AS unitPrice,
                    lp.subtotal AS lineTotal
             FROM lineas_pedido lp
             JOIN productos p ON p.id = lp.producto_id
             WHERE lp.pedido_id = ?
             ORDER BY lp.id',
        );
        $statement->execute([$orderId]);
        $rows = $statement->fetchAll();

        foreach ($rows as &$row) {
            $row['title'] = $row['nombre']
                . ($row['subtitulo'] ? ' · ' . $row['subtitulo'] : '');
            unset($row['nombre'], $row['subtitulo']);
        }

        return $rows;
    }
    private function normalizeOrder(array $o): array {
        if (isset($o['userId'], $o['totals'], $o['customer'])) return $o;
        $customer = $o['customer'] ?? [];
        $name = trim(($o['nombre'] ?? '') . ' ' . ($o['apellidos'] ?? ''));
        if ($name === '') $name = trim((string)($customer['name'] ?? ''));
        $email = (string)($o['email'] ?? ($customer['email'] ?? ''));
        return [
            'id' => (string) $o['codigo_pedido'],
            'dbId' => (int) $o['id'],
            'userId' => (int) $o['usuario_id'],
            'userName' => $name,
            'userEmail' => $email,
            'createdAt' => $o['fecha_pedido'],
            'status' => $o['estado'],
            'customer' => [
                'name' => $name,
                'email' => $email,
                'address' => $o['direccion'] ?? ($customer['address'] ?? ''),
                'postalCode' => $o['codigo_postal'] ?? ($customer['postalCode'] ?? ''),
                'city' => $o['ciudad'] ?? ($customer['city'] ?? ''),
            ],
            'items' => $o['items'] ?? [],
            'payment' => [
                'method' => $o['metodo_pago'] ?? ($o['payment']['method'] ?? ''),
                'status' => $o['pago_estado'] ?? ($o['payment']['status'] ?? ''),
                'reference' => $o['pago_referencia'] ?? ($o['payment']['reference'] ?? ''),
                'amount' => (float) ($o['pago_importe'] ?? ($o['payment']['importe'] ?? 0)),
            ],
            'totals' => [
                'subtotal' => (float) $o['subtotal'],
                'tax' => (float) $o['impuestos'],
                'shipping' => (float) $o['gastos_envio'],
                'discount' => (float) $o['descuento'],
                'total' => (float) $o['total'],
            ],
        ];
    }
    public function myOrders(int $userId): array {
        if ($this->isMock()) {
            $orders = [];
            foreach (array_reverse($this->mock['orders']) as $order) {
                if ((int) $order['usuario_id'] === $userId) {
                    $orders[] = $this->normalizeOrder($order);
                }
            }
            return $orders;
        }

        $statement = $this->pdo->prepare(
            'SELECT p.*, u.nombre, u.apellidos, u.email,
                    d.direccion, d.codigo_postal, d.ciudad,
                    pg.metodo_pago, pg.estado AS pago_estado,
                    pg.importe AS pago_importe,
                    pg.referencia AS pago_referencia
             FROM pedidos p
             JOIN usuarios u ON u.id = p.usuario_id
             LEFT JOIN direcciones_pedido d ON d.pedido_id = p.id
             LEFT JOIN pagos pg ON pg.pedido_id = p.id
             WHERE p.usuario_id = ?
             ORDER BY p.fecha_pedido DESC',
        );
        $statement->execute([$userId]);
        $orders = $statement->fetchAll();

        foreach ($orders as &$order) {
            $order['items'] = $this->getOrderItems((int) $order['id']);
        }

        return array_map(
            fn ($order) => $this->normalizeOrder($order),
            $orders,
        );
    }
    public function allOrders(): array {
        if ($this->isMock()) {
            $orders = [];
            foreach (array_reverse($this->mock['orders']) as $order) {
                $orders[] = $this->normalizeOrder($order);
            }
            return $orders;
        }

        $statement = $this->pdo->query(
            'SELECT p.*, u.nombre, u.apellidos, u.email,
                    d.direccion, d.codigo_postal, d.ciudad,
                    pg.metodo_pago, pg.estado AS pago_estado,
                    pg.importe AS pago_importe,
                    pg.referencia AS pago_referencia
             FROM pedidos p
             JOIN usuarios u ON u.id = p.usuario_id
             LEFT JOIN direcciones_pedido d ON d.pedido_id = p.id
             LEFT JOIN pagos pg ON pg.pedido_id = p.id
             ORDER BY p.fecha_pedido DESC',
        );
        $orders = $statement->fetchAll();

        foreach ($orders as &$order) {
            $order['items'] = $this->getOrderItems((int) $order['id']);
        }

        return array_map(
            fn ($order) => $this->normalizeOrder($order),
            $orders,
        );
    }

    public function addEvent(string $type,?int $userId,?int $productId,?int $orderId,array $payload): void {
        if($this->isMock()){$this->mock['events'][]=['id'=>(int)$this->mock['next']['event']++,'tipo_evento'=>$type,'usuario_id'=>$userId,'producto_id'=>$productId,'pedido_id'=>$orderId,'datos'=>json_encode($payload,JSON_UNESCAPED_UNICODE),'fecha_evento'=>date(DATE_ATOM)];$this->saveMock();return;}
        $allowed=['product.viewed','cart.item_added','checkout.started','order.created','payment.simulated','support.requested','user.registered','user.logged_in','user.logged_out'];
        if(!in_array($type,$allowed,true)) return;
        $st=$this->pdo->prepare('INSERT INTO eventos (tipo_evento,usuario_id,producto_id,pedido_id,datos) VALUES (?,?,?,?,?)'); $st->execute([$type,$userId,$productId,$orderId,json_encode($payload,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)]);
    }
    public function events(): array {
        if($this->isMock()) return array_reverse($this->mock['events']);
        return $this->pdo->query('SELECT id,tipo_evento,usuario_id,producto_id,pedido_id,incidencia_id,datos,fecha_evento FROM eventos ORDER BY fecha_evento DESC,id DESC LIMIT 500')->fetchAll();
    }
    public function createIncident(int $userId,string $subject,string $description): array {
        if($this->isMock()){$id=(int)$this->mock['next']['incident']++;$row=['id'=>$id,'usuario_id'=>$userId,'pedido_id'=>null,'asunto'=>$subject,'descripcion'=>$description,'estado'=>'abierta','prioridad'=>'media','fecha_creacion'=>date(DATE_ATOM)];$this->mock['incidents'][]=$row;$this->saveMock();return $row;}
        $st=$this->pdo->prepare("INSERT INTO incidencias (usuario_id,asunto,descripcion,estado,prioridad) VALUES (?,?,?,'abierta','media')");$st->execute([$userId,$subject,$description]);$id=(int)$this->pdo->lastInsertId();return $this->findIncident($id);
    }
    private function findIncident(int $id): array { $st=$this->pdo->prepare('SELECT * FROM incidencias WHERE id=?');$st->execute([$id]);return $st->fetch()?:[]; }
}

function db(): PFDatabase { global $config; return PFDatabase::fromConfig($config); }
