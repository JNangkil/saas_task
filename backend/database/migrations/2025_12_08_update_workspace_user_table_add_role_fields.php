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
        Schema::table('workspace_user', function (Blueprint $table) {
            // Update the role enum to include 'owner'
            $table->enum('role', ['owner', 'admin', 'member', 'viewer'])->default('member')->change();
            
            // Add status field
            $table->enum('status', ['active', 'pending'])->default('active')->after('role');
            
            // Add invited_by foreign key
            $table->foreignId('invited_by')->nullable()->after('status')->constrained('users')->onDelete('set null');
            
            // Add indexes for performance
            $table->index('status');
            $table->index('invited_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('workspace_user', function (Blueprint $table) {
            // Drop indexes
            $table->dropIndex(['status']);
            $table->dropIndex(['invited_by']);
            
            // Drop foreign key constraint
            $table->dropForeign(['invited_by']);
            
            // Drop columns
            $table->dropColumn('status');
            $table->dropColumn('invited_by');
            
            // Revert role enum to original values
            $table->enum('role', ['admin', 'member', 'viewer'])->default('member')->change();
        });
    }
};