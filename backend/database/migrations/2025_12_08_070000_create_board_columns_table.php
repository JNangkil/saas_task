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
        Schema::create('board_columns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('board_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('type'); // text, long_text, status, priority, assignee, date, labels, number, checkbox, url
            $table->integer('position')->default(0);
            $table->integer('width')->nullable(); // Column width in pixels
            $table->boolean('is_pinned')->default(false);
            $table->boolean('is_required')->default(false);
            $table->json('options')->nullable(); // Column-specific options (e.g., status values, validation rules)
            $table->timestamps();

            // Indexes for performance
            $table->index(['board_id']);
            $table->index(['board_id', 'position']); // For ordering columns within a board
            $table->unique(['board_id', 'name']); // Unique column name within a board
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('board_columns');
    }
};