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
        // 1. Update boards table
        Schema::table('boards', function (Blueprint $table) {
            $table->string('type')->default('kanban')->after('icon'); // kanban, list, etc.
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->after('is_archived');
            $table->integer('position')->default(0)->after('created_by');
            $table->softDeletes()->after('updated_at');
        });

        // 2. Create board_templates table
        Schema::create('board_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained()->onDelete('cascade'); // Nullable for global templates
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('icon', 50)->nullable();
            $table->json('config'); // Column structure, default settings
            $table->boolean('is_global')->default(false);
            $table->boolean('is_published')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['tenant_id', 'is_published']);
            $table->index('is_global');
        });

        // 3. Create user_board_favorites pivot table
        Schema::create('user_board_favorites', function (Blueprint $table) {
            $table->id(); // Optional, but good for consistency
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('board_id')->constrained()->onDelete('cascade');
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['user_id', 'board_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_board_favorites');
        Schema::dropIfExists('board_templates');

        Schema::table('boards', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropColumn(['type', 'created_by', 'position', 'deleted_at']);
        });
    }
};
