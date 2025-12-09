<?php

namespace App\Providers;

use App\Scopes\TenantScope;
use App\Services\TenantContextService;
use Illuminate\Support\ServiceProvider;
use Illuminate\Database\Eloquent\Builder;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Register helper functions
        require_once app_path('Helpers/TenantHelper.php');

        // Register singleton for current tenant context
        $this->app->singleton('current_tenant', function () {
            return null; // Will be set by TenantResolution middleware
        });

        // Register TenantContextService as a singleton
        $this->app->singleton(TenantContextService::class, function ($app) {
            return new TenantContextService();
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Extend the query builder with tenant-aware macros
        Builder::macro('withoutTenantScope', function () {
            return $this->withoutGlobalScope(TenantScope::class);
        });

        Builder::macro('withTenantScope', function ($tenantId) {
            return $this->withoutGlobalScope(TenantScope::class)
                          ->where('tenant_id', $tenantId);
        });

        Builder::macro('allTenants', function () {
            return $this->withoutGlobalScope(TenantScope::class);
        });

        // Register event listeners for tenant context validation
        \App\Models\Workspace::creating(function ($workspace) {
            if (!tenant() && !app()->runningInConsole()) {
                throw new \Exception('Cannot create workspace without tenant context');
            }
        });

        \App\Models\Board::creating(function ($board) {
            if (!tenant() && !app()->runningInConsole()) {
                throw new \Exception('Cannot create board without tenant context');
            }
        });

        \App\Models\Task::creating(function ($task) {
            if (!tenant() && !app()->runningInConsole()) {
                throw new \Exception('Cannot create task without tenant context');
            }
        });
    }
}
