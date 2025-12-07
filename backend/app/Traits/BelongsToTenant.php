<?php

namespace App\Traits;

use App\Scopes\TenantScope;
use App\Models\Tenant;

trait BelongsToTenant
{
    /**
     * Boot the trait
     */
    protected static function bootBelongsToTenant(): void
    {
        static::addGlobalScope(new TenantScope);
        
        // Automatically set tenant_id when creating a new model
        static::creating(function ($model) {
            $tenant = app('current_tenant');
            if ($tenant && !isset($model->tenant_id)) {
                $model->tenant_id = $tenant->id;
            }
        });
    }

    /**
     * Get the tenant that owns the model.
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Scope a query to only include models for a specific tenant.
     */
    public function scopeForTenant($query, $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    /**
     * Scope a query to only include models for the current tenant.
     */
    public function scopeForCurrentTenant($query)
    {
        $tenant = app('current_tenant');
        if ($tenant) {
            return $query->where('tenant_id', $tenant->id);
        }
        return $query;
    }

    /**
     * Get all models without tenant scope (for admin operations).
     */
    public static function withoutTenantScope()
    {
        return (new static)->withoutGlobalScope(TenantScope::class);
    }

    /**
     * Get all models across all tenants (for admin operations).
     */
    public static function allTenants()
    {
        return static::withoutGlobalScope(TenantScope::class);
    }
}