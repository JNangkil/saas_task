<?php

namespace App\Traits;

use App\Scopes\TenantScope;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Builder;

trait BelongsToTenant
{
    /**
     * Boot the trait.
     */
    protected static function bootBelongsToTenant(): void
    {
        // Add the global tenant scope for automatic filtering
        static::addGlobalScope(new TenantScope);
        
        // Automatically set tenant_id when creating new models
        static::creating(function ($model) {
            // Skip tenant_id assignment for system operations
            if (app()->runningInConsole() || !tenant()) {
                return;
            }
            
            // Only set tenant_id if it's not already set (allows explicit override)
            if (!isset($model->attributes['tenant_id'])) {
                $model->tenant_id = tenant()->id;
            }
        });

        // Validate tenant relationship when updating models
        static::updating(function ($model) {
            // Skip validation for system operations
            if (app()->runningInConsole() || !tenant()) {
                return;
            }

            // Ensure the model belongs to the current tenant
            if (isset($model->attributes['tenant_id']) &&
                $model->attributes['tenant_id'] !== tenant()->id) {
                // This would be a security issue - trying to move data between tenants
                throw new \Exception('Cannot change tenant of a model');
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
     * Scope a query to only include models for the given tenant.
     */
    public function scopeForTenant($query, Tenant $tenant)
    {
        return $query->where('tenant_id', $tenant->id);
    }

    /**
     * Scope a query to only include models for the given tenant ID.
     */
    public function scopeForTenantId($query, int $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    /**
     * Scope a query to include models from all tenants (bypasses tenant scope).
     * This should only be used by system administrators.
     */
    public function scopeAllTenants($query)
    {
        return $query->withoutGlobalScope(TenantScope::class);
    }

    /**
     * Scope a query to include models from a specific tenant (bypasses current tenant).
     * This should only be used by system administrators.
     */
    public function scopeForSpecificTenant($query, int $tenantId)
    {
        return $query->withoutGlobalScope(TenantScope::class)
                    ->where('tenant_id', $tenantId);
    }

    /**
     * Check if the model belongs to the current tenant.
     */
    public function belongsToCurrentTenant(): bool
    {
        return tenant() && $this->tenant_id === tenant()->id;
    }

    /**
     * Get the tenant ID attribute with proper validation.
     */
    public function getTenantIdAttribute($value)
    {
        return $value;
    }

    /**
     * Set the tenant ID attribute with validation.
     */
    public function setTenantIdAttribute($value)
    {
        // Prevent changing tenant_id if model already exists and has a different tenant
        if ($this->exists && $this->tenant_id !== $value && tenant()) {
            throw new \Exception('Cannot change tenant of an existing model');
        }
        
        $this->attributes['tenant_id'] = $value;
    }
}