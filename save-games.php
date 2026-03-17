<?php
// save-games.php — upload this to the ROOT of dupemm2.shop
//
// Change this to a secret password only you know.
// You'll enter the same value in the admin panel Settings tab.
define('SECRET_KEY', 'changeme123');

// Allow requests from any origin (needed if admin is on a different domain/GitHub Pages)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);

if (!$body || !isset($body['key']) || $body['key'] !== SECRET_KEY) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid key']);
    exit;
}

if (!isset($body['data'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No data provided']);
    exit;
}

$path = __DIR__ . '/joiner/games.json';

// Make sure the joiner directory exists
if (!is_dir(dirname($path))) {
    mkdir(dirname($path), 0755, true);
}

$result = file_put_contents($path, $body['data']);

if ($result === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to write file — check folder permissions']);
    exit;
}

echo json_encode(['ok' => true, 'bytes' => $result]);
