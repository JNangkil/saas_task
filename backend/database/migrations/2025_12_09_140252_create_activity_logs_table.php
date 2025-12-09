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
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();

            // Who performed the action
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

            // Tenant and workspace scoping
            $table->foreignId('tenant_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('workspace_id')->nullable()->constrained()->nullOnDelete();

            // What was acted upon
            $table->string('subject_type'); // Model class (Task, Board, etc.)
            $table->unsignedBigInteger('subject_id');

            // Action details
            $table->string('action'); // created, updated, deleted, assigned, etc.
            $table->text('description')->nullable(); // Human-readable description

            // Change tracking (old/new values)
            $table->json('changes')->nullable();

            // Additional metadata
            $table->json('metadata')->nullable(); // IP address, user agent, etc.

            $table->index(['tenant_id', 'created_at']);
            $table->index(['workspace_id', 'created_at']);
            $table->index(['user_id', 'created_at']);
            $table->index(['subject_type', 'subject_id']);
            $table->index(['action', 'created_at']);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
