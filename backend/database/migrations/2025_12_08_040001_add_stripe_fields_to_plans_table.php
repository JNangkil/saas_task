<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->string('stripe_price_id')->nullable()->after('features');
            $table->json('metadata')->nullable()->after('stripe_price_id');
            $table->boolean('is_popular')->default(false)->after('metadata');
            $table->index('stripe_price_id');
            $table->index('is_popular');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropIndex(['stripe_price_id']);
            $table->dropIndex(['is_popular']);
            $table->dropColumn(['stripe_price_id', 'metadata', 'is_popular']);
        });
    }
};