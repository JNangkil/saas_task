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
        Schema::table('users', function (Blueprint $table) {
            $table->string('job_title')->nullable()->after('name');
            $table->string('timezone')->default('UTC')->after('email_verified_at');
            $table->string('locale', 10)->default('en')->after('timezone');
            $table->enum('status', ['active', 'suspended', 'pending'])->default('active')->after('locale');
            $table->string('avatar_url')->nullable()->after('status');

            // Add indexes for performance
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropColumn(['job_title', 'timezone', 'locale', 'status', 'avatar_url']);
        });
    }
};