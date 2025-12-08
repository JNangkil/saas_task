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
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('slug')->unique();
            $table->decimal('price', 8, 2);
            $table->enum('billing_interval', ['month', 'year']);
            $table->integer('trial_days')->default(0);
            $table->json('limits')->nullable();
            $table->json('features')->nullable();
            $table->timestamps();

            // Indexes for performance
            $table->index('name');
            $table->index('slug');
            $table->index('billing_interval');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};