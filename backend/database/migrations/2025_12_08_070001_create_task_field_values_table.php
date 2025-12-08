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
        Schema::create('task_field_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained()->onDelete('cascade');
            $table->foreignId('board_column_id')->constrained()->onDelete('cascade');
            $table->json('value'); // Store the actual value as JSON to handle different column types
            $table->timestamps();

            // Indexes for performance
            $table->index(['task_id']);
            $table->index(['board_column_id']);
            $table->unique(['task_id', 'board_column_id']); // One value per task per column
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_field_values');
    }
};