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
        Schema::create('user_board_view_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('board_id')->constrained()->cascadeOnDelete();
            $table->string('preferred_view')->default('table'); // table, kanban, calendar
            $table->json('kanban_config')->nullable();
            $table->json('calendar_config')->nullable();
            $table->json('filters')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'board_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_board_view_preferences');
    }
};
