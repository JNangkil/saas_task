<?php

require_once __DIR__ . '/vendor/autoload.php';

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

// Check if required columns exist in database tables
echo "Checking subscription billing database structure...\n\n";

// Check plans table for stripe_price_id
echo "1. Checking plans table for stripe_price_id column...\n";
if (Schema::hasColumn('plans', 'stripe_price_id')) {
    echo "   ✓ stripe_price_id column exists in plans table\n";
} else {
    echo "   ✗ stripe_price_id column MISSING from plans table\n";
}

// Check subscriptions table for metadata column
echo "\n2. Checking subscriptions table for metadata column...\n";
if (Schema::hasColumn('subscriptions', 'metadata')) {
    echo "   ✓ metadata column exists in subscriptions table\n";
} else {
    echo "   ✗ metadata column MISSING from subscriptions table\n";
}

// Check if subscription_events table exists
echo "\n3. Checking if subscription_events table exists...\n";
if (Schema::hasTable('subscription_events')) {
    echo "   ✓ subscription_events table exists\n";
    
    // Check if it has required columns
    $requiredColumns = ['id', 'subscription_id', 'type', 'data', 'processed_at', 'created_at', 'updated_at'];
    foreach ($requiredColumns as $column) {
        if (Schema::hasColumn('subscription_events', $column)) {
            echo "   ✓ $column column exists\n";
        } else {
            echo "   ✗ $column column MISSING\n";
        }
    }
} else {
    echo "   ✗ subscription_events table MISSING\n";
}

// Check if processed_webhook_events table exists
echo "\n4. Checking if processed_webhook_events table exists...\n";
if (Schema::hasTable('processed_webhook_events')) {
    echo "   ✓ processed_webhook_events table exists\n";
} else {
    echo "   ✗ processed_webhook_events table MISSING\n";
}

// Check if failed_webhook_events table exists
echo "\n5. Checking if failed_webhook_events table exists...\n";
if (Schema::hasTable('failed_webhook_events')) {
    echo "   ✓ failed_webhook_events table exists\n";
} else {
    echo "   ✗ failed_webhook_events table MISSING\n";
}

echo "\nDatabase structure check completed.\n";