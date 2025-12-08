<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

class Subscription extends Model
{
    use HasFactory;

    /**
     * Subscription status constants.
     */
    const STATUS_TRIALING = 'trialing';
    const STATUS_ACTIVE = 'active';
    const STATUS_PAST_DUE = 'past_due';
    const STATUS_CANCELED = 'canceled';
    const STATUS_EXPIRED = 'expired';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'plan_id',
        'stripe_subscription_id',
        'stripe_customer_id',
        'status',
        'trial_ends_at',
        'ends_at',
        'metadata',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'trial_ends_at' => 'datetime',
            'ends_at' => 'datetime',
            'metadata' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Get the tenant that owns the subscription.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the plan that the subscription belongs to.
     */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    /**
     * Get the events for the subscription.
     */
    public function subscriptionEvents(): HasMany
    {
        return $this->hasMany(SubscriptionEvent::class);
    }

    /**
     * Check if the subscription is in trial period.
     */
    public function isTrialing(): bool
    {
        return $this->status === self::STATUS_TRIALING && 
               $this->trial_ends_at && 
               $this->trial_ends_at->isFuture();
    }

    /**
     * Check if the subscription is active.
     */
    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE && 
               (!$this->ends_at || $this->ends_at->isFuture());
    }

    /**
     * Check if the subscription is past due.
     */
    public function isPastDue(): bool
    {
        return $this->status === self::STATUS_PAST_DUE;
    }

    /**
     * Check if the subscription is canceled.
     */
    public function isCanceled(): bool
    {
        return $this->status === self::STATUS_CANCELED;
    }

    /**
     * Check if the subscription is expired.
     */
    public function isExpired(): bool
    {
        return $this->status === self::STATUS_EXPIRED || 
               ($this->ends_at && $this->ends_at->isPast());
    }

    /**
     * Check if the subscription is within grace period.
     */
    public function isWithinGracePeriod(): bool
    {
        if (!$this->ends_at) {
            return false;
        }

        // Define grace period as 7 days after subscription ends
        $gracePeriodEnd = $this->ends_at->copy()->addDays(7);
        
        return $this->isCanceled() && $gracePeriodEnd->isFuture();
    }

    /**
     * Check if the subscription is valid (active or trialing).
     */
    public function isValid(): bool
    {
        return $this->isActive() || $this->isTrialing();
    }

    /**
     * Get the plan limits for this subscription.
     */
    public function getPlanLimits(): array
    {
        return $this->plan ? $this->plan->limits : [];
    }

    /**
     * Get a specific plan limit.
     */
    public function getPlanLimit(string $limit): mixed
    {
        return $this->plan ? ($this->plan->limits[$limit] ?? null) : null;
    }

    /**
     * Check if a feature is enabled for this subscription's plan.
     */
    public function hasFeature(string $feature): bool
    {
        return $this->plan ? $this->plan->hasFeature($feature) : false;
    }

    /**
     * Get the days remaining in trial.
     */
    public function getTrialDaysRemaining(): int
    {
        if (!$this->trial_ends_at) {
            return 0;
        }

        return max(0, Carbon::now()->diffInDays($this->trial_ends_at, false));
    }

    /**
     * Get the days remaining until subscription ends.
     */
    public function getDaysRemaining(): int
    {
        if (!$this->ends_at) {
            return 0;
        }

        return max(0, Carbon::now()->diffInDays($this->ends_at, false));
    }

    /**
     * Get the formatted status for display.
     */
    public function getStatusDisplayAttribute(): string
    {
        return match($this->status) {
            self::STATUS_TRIALING => 'Trial',
            self::STATUS_ACTIVE => 'Active',
            self::STATUS_PAST_DUE => 'Past Due',
            self::STATUS_CANCELED => 'Canceled',
            self::STATUS_EXPIRED => 'Expired',
            default => ucfirst($this->status),
        };
    }

    /**
     * Scope a query to only include active subscriptions.
     */
    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    /**
     * Scope a query to only include trialing subscriptions.
     */
    public function scopeTrialing($query)
    {
        return $query->where('status', self::STATUS_TRIALING);
    }

    /**
     * Scope a query to only include valid subscriptions (active or trialing).
     */
    public function scopeValid($query)
    {
        return $query->whereIn('status', [self::STATUS_ACTIVE, self::STATUS_TRIALING]);
    }

    /**
     * Log warning if metadata column is missing from database
     */
    protected static function boot()
    {
        parent::boot();
        
        static::retrieved(function ($subscription) {
            // Check if metadata property exists (would fail if column doesn't exist)
            try {
                $metadata = $subscription->metadata;
                if ($metadata === null && !is_array($metadata)) {
                    \Log::warning('Subscription metadata may be missing from database', [
                        'subscription_id' => $subscription->id,
                        'issue' => 'metadata column may be missing from subscriptions table'
                    ]);
                }
            } catch (\Exception $e) {
                \Log::error('Error accessing subscription metadata', [
                    'subscription_id' => $subscription->id,
                    'error' => $e->getMessage(),
                    'issue' => 'metadata column may be missing from subscriptions table'
                ]);
            }
        });
    }
}