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
        Schema::create('saved_filters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('board_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->text('description')->nullable();
            $table->json('filter_definition');
            $table->boolean('is_public')->default(false);
            $table->boolean('is_default')->default(false);
            $table->integer('usage_count')->default(0);
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();

            // Indexes for performance
            $table->index(['tenant_id', 'user_id']);
            $table->index(['tenant_id', 'board_id']);
            $table->index(['user_id', 'board_id']);
            $table->index(['user_id', 'is_public']);
            $table->index(['user_id', 'is_default']);
            $table->index(['board_id', 'is_public']);
            $table->index('last_used_at');
            $table->index('usage_count');
            $table->index('created_at');

            // Unique constraint for filter names per user per board
            $table->unique(['user_id', 'board_id', 'name'], 'saved_filters_unique_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('saved_filters');
    }
};