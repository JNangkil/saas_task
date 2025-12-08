<?php

namespace App\Traits;

use App\Scopes\TenantScope;
use App\Models\Tenant;

trait BelongsToTenant
{
    /**
     * Boot the trait.
     */
    protected static function bootBelongsToTenant(): void
    {
        static::addGlobalScope(new TenantScope);
        
        static::creating(function ($model) {
            if (tenant()) {
                $model->tenant_id = tenant()->id;
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
}