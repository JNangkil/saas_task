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
        Schema::create('user_board_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('board_id')->constrained()->onDelete('cascade');
            $table->json('column_preferences')->nullable(); // Store column visibility, order, width, etc.
            $table->timestamps();

            // Indexes for performance
            $table->index(['user_id']);
            $table->index(['board_id']);
            $table->unique(['user_id', 'board_id']); // One preference set per user per board
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_board_preferences');
    }
};