<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'slug',
        'price',
        'billing_interval',
        'trial_days',
        'limits',
        'features',
        'stripe_price_id',
        'metadata',
        'is_popular',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'limits' => 'array',
            'features' => 'array',
            'metadata' => 'array',
            'is_popular' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Get the subscriptions for the plan.
     */
    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    /**
     * Get the maximum users limit for the plan.
     */
    public function getMaxUsersAttribute(): int
    {
        return $this->limits['max_users'] ?? 0;
    }

    /**
     * Get the maximum workspaces limit for the plan.
     */
    public function getMaxWorkspacesAttribute(): int
    {
        return $this->limits['max_workspaces'] ?? 0;
    }

    /**
     * Get the maximum boards limit for the plan.
     */
    public function getMaxBoardsAttribute(): int
    {
        return $this->limits['max_boards'] ?? 0;
    }

    /**
     * Get the storage limit in MB for the plan.
     */
    public function getMaxStorageMbAttribute(): int
    {
        return $this->limits['max_storage_mb'] ?? 0;
    }

    /**
     * Check if a specific feature is enabled for this plan.
     */
    public function hasFeature(string $feature): bool
    {
        return in_array($feature, $this->features ?? []);
    }

    /**
     * Get the formatted price for display.
     */
    public function getFormattedPriceAttribute(): string
    {
        return '$' . number_format($this->price, 2);
    }

    /**
     * Get the billing interval in human readable format.
     */
    public function getBillingIntervalDisplayAttribute(): string
    {
        return match($this->billing_interval) {
            'month' => 'Monthly',
            'year' => 'Yearly',
            default => ucfirst($this->billing_interval),
        };
    }

    /**
     * Log warning if stripe_price_id is missing from database
     */
    protected static function boot()
    {
        parent::boot();
        
        static::retrieved(function ($plan) {
            if (!$plan->stripe_price_id) {
                \Log::warning('Plan missing stripe_price_id', [
                    'plan_id' => $plan->id,
                    'plan_slug' => $plan->slug,
                    'issue' => 'stripe_price_id column may be missing from database'
                ]);
            }
        });
    }

    /**
     * Scope a query to only include monthly plans.
     */
    public function scopeMonthly($query)
    {
        return $query->where('billing_interval', 'month');
    }

    /**
     * Scope a query to only include yearly plans.
     */
    public function scopeYearly($query)
    {
        return $query->where('billing_interval', 'year');
    }
}