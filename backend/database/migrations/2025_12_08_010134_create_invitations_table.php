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
        Schema::create('invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->onDelete('cascade');
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->string('email');
            $table->enum('role', ['owner', 'admin', 'member', 'viewer']);
            $table->string('token', 48)->unique();
            $table->text('message')->nullable();
            $table->foreignId('invited_by')->constrained('users')->onDelete('cascade');
            $table->timestamp('expires_at');
            $table->enum('status', ['pending', 'accepted', 'expired', 'cancelled'])->default('pending');
            $table->timestamp('accepted_at')->nullable();
            $table->timestamps();

            // Indexes for performance
            $table->index('email');
            $table->index(['workspace_id', 'status']);
            $table->index(['tenant_id', 'status']);
            $table->index('expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invitations');
    }
};
