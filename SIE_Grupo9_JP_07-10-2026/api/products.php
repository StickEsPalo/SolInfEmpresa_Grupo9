<?php
require_once __DIR__ . '/lib/bootstrap.php';

requestMethod('GET');
$rows = db()->products();
$difficultyLabels = [
    'facil' => 'Iniciación',
    'media' => 'Media',
    'dificil' => 'Experta',
];
$products = [];

foreach ($rows as $product) {
    $minimumPlayers = (int) $product['jugadores_min'];
    $maximumPlayers = (int) $product['jugadores_max'];
    $players = $minimumPlayers === $maximumPlayers
        ? (string) $minimumPlayers
        : $minimumPlayers . '-' . $maximumPlayers;
    $playerFilters = [];

    if ($minimumPlayers <= 1) {
        $playerFilters[] = 'solo';
    }
    if ($maximumPlayers >= 2 && $minimumPlayers <= 3) {
        $playerFilters[] = 'small';
    }
    if ($maximumPlayers >= 4) {
        $playerFilters[] = 'group';
    }

    $categories = trim(
        explode(' · ', (string) ($product['categorias'] ?? ''))[0],
    );

    $products[] = [
        'id' => (string) $product['id'],
        'title' => $product['nombre'],
        'subtitle' => $product['subtitulo'],
        'category' => $categories,
        'players' => $players,
        'playerFilter' => $playerFilters,
        'difficulty' => $difficultyLabels[(string) $product['dificultad']]
            ?? (string) $product['dificultad'],
        'duration' => $product['duracion'],
        'origin' => $product['origenes'] ?? '',
        'author' => $product['autor'],
        'price' => (float) $product['precio'],
        'image' => $product['imagen'],
        'description' => $product['descripcion'],
        'mechanics' => $product['mecanicas'],
        'language' => $product['idioma'],
        'parentId' => $product['producto_padre_id'] !== null
            ? (string) $product['producto_padre_id']
            : null,
        'stock' => (int) $product['stock'],
        'tone' => '#1c1c1c',
        'text' => '#ffffff',
        'symbol' => '◆',
    ];
}

apiRespond(['products' => $products]);
