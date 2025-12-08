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
        Schema::create('boards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->foreignId('workspace_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('color', 7)->nullable(); // Hex color code
            $table->string('icon', 50)->nullable();
            $table->boolean('is_archived')->default(false);
            $table->timestamps();

            // Indexes for performance
            $table->index(['tenant_id', 'workspace_id']);
            $table->index(['tenant_id', 'is_archived']);
            $table->unique(['tenant_id', 'workspace_id', 'name']); // Unique name within tenant workspace
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('boards');
    }
};