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
        Schema::table('tasks', function (Blueprint $table) {
            // Update status enum to include 'review'
            $table->enum('status', ['todo', 'in_progress', 'review', 'done', 'archived'])->default('todo')->change();
            
            // Update priority enum to use 'urgent' instead of 'critical'
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            // Revert status enum to original values
            $table->enum('status', ['todo', 'in_progress', 'done', 'archived'])->default('todo')->change();
            
            // Revert priority enum to original values
            $table->enum('priority', ['low', 'medium', 'high', 'critical'])->default('medium')->change();
        });
    }
};