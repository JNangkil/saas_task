<?php

namespace App\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

class TenantScope implements Scope
{
    /**
     * Apply the scope to a given Eloquent query builder.
     */
    public function apply(Builder $builder, Model $model): void
    {
        // Skip tenant scoping for system operations (super admin, console commands, etc.)
        if ($this->shouldSkipTenantScoping()) {
            return;
        }

        // Get current tenant from app instance (set by TenantResolution middleware)
        $tenant = app('current_tenant');

        if ($tenant) {
            // Apply tenant filter to ensure data isolation
            $builder->where($model->getTable() . '.tenant_id', $tenant->id);
        }
    }

    /**
     * Determine if tenant scoping should be skipped.
     */
    protected function shouldSkipTenantScoping(): bool
    {
        // Skip if running in console but not in tests (migrations, seeds, etc.)
        if (app()->runningInConsole() && !app()->environment('testing')) {
            return true;
        }

        // Skip if no authenticated user (public routes)
        if (!Auth::check()) {
            return true;
        }

        // Skip for super admin users (they can see all data)
        if (Auth::user() && Auth::user()->isSuperAdmin()) {
            return true;
        }

        return false;
    }

    /**
     * Extend the query builder with tenant-aware methods.
     */
    public function extend(Builder $builder)
    {
        $builder->macro('withoutTenantScope', function (Builder $builder) {
            return $builder->withoutGlobalScope($this);
        });

        $builder->macro('withTenantScope', function (Builder $builder, $tenantId) {
            return $builder->withoutGlobalScope($this)
                          ->where('tenant_id', $tenantId);
        });

        $builder->macro('allTenants', function (Builder $builder) {
            return $builder->withoutGlobalScope($this);
        });
    }
}