<?php

$envFile = __DIR__ . '/.env';
$content = file_get_contents($envFile);

$replacements = [
    'BROADCAST_CONNECTION' => 'reverb',
    'REVERB_APP_ID' => '954781',
    'REVERB_APP_KEY' => 'saas_task_key',
    'REVERB_APP_SECRET' => 'saas_task_secret',
    'REVERB_HOST' => 'localhost',
    'REVERB_PORT' => '8080',
    'REVERB_SCHEME' => 'http',
    'VITE_REVERB_APP_KEY' => 'saas_task_key',
    'VITE_REVERB_HOST' => 'localhost',
    'VITE_REVERB_PORT' => '8080',
    'VITE_REVERB_SCHEME' => 'http',
];

foreach ($replacements as $key => $value) {
    if (strpos($content, "{$key}=") !== false) {
        $content = preg_replace("/^{$key}=.*/m", "{$key}={$value}", $content);
    } else {
        $content .= "\n{$key}={$value}";
    }
}

file_put_contents($envFile, $content);

echo "Updated .env file successfully.\n";
