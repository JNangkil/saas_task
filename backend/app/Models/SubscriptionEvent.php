<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubscriptionEvent extends Model
{
    use HasFactory;

    /**
     * Event type constants.
     */
    const TYPE_CREATED = 'created';
    const TYPE_UPDATED = 'updated';
    const TYPE_CANCELED = 'canceled';
    const TYPE_EXPIRED = 'expired';
    const TYPE_PAYMENT_FAILED = 'payment_failed';
    const TYPE_PAYMENT_SUCCEEDED = 'payment_succeeded';
    const TYPE_TRIAL_STARTED = 'trial_started';
    const TYPE_TRIAL_ENDED = 'trial_ended';
    const TYPE_PLAN_CHANGED = 'plan_changed';
    const TYPE_RENEWED = 'renewed';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'subscription_id',
        'type',
        'data',
        'processed_at',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'data' => 'array',
            'processed_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Get the subscription that owns the event.
     */
    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    /**
     * Check if the event has been processed.
     */
    public function isProcessed(): bool
    {
        return !is_null($this->processed_at);
    }

    /**
     * Mark the event as processed.
     */
    public function markAsProcessed(): void
    {
        $this->processed_at = now();
        $this->save();
    }

    /**
     * Get the formatted type for display.
     */
    public function getTypeDisplayAttribute(): string
    {
        return match($this->type) {
            self::TYPE_CREATED => 'Created',
            self::TYPE_UPDATED => 'Updated',
            self::TYPE_CANCELED => 'Canceled',
            self::TYPE_EXPIRED => 'Expired',
            self::TYPE_PAYMENT_FAILED => 'Payment Failed',
            self::TYPE_PAYMENT_SUCCEEDED => 'Payment Succeeded',
            self::TYPE_TRIAL_STARTED => 'Trial Started',
            self::TYPE_TRIAL_ENDED => 'Trial Ended',
            self::TYPE_PLAN_CHANGED => 'Plan Changed',
            self::TYPE_RENEWED => 'Renewed',
            default => ucfirst(str_replace('_', ' ', $this->type)),
        };
    }

    /**
     * Get a specific data value from the event data.
     */
    public function getDataValue(string $key, mixed $default = null): mixed
    {
        return data_get($this->data, $key, $default);
    }

    /**
     * Scope a query to only include processed events.
     */
    public function scopeProcessed($query)
    {
        return $query->whereNotNull('processed_at');
    }

    /**
     * Scope a query to only include unprocessed events.
     */
    public function scopeUnprocessed($query)
    {
        return $query->whereNull('processed_at');
    }

    /**
     * Scope a query to only include events of a specific type.
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope a query to only include events created within the last X days.
     */
    public function scopeRecent($query, int $days = 7)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    /**
     * Create a new subscription event.
     */
    public static function createEvent(Subscription $subscription, string $type, array $data = []): self
    {
        return static::create([
            'subscription_id' => $subscription->id,
            'type' => $type,
            'data' => $data,
        ]);
    }

    /**
     * Create a payment succeeded event.
     */
    public static function paymentSucceeded(Subscription $subscription, array $paymentData = []): self
    {
        return static::createEvent($subscription, self::TYPE_PAYMENT_SUCCEEDED, $paymentData);
    }

    /**
     * Create a payment failed event.
     */
    public static function paymentFailed(Subscription $subscription, array $errorData = []): self
    {
        return static::createEvent($subscription, self::TYPE_PAYMENT_FAILED, $errorData);
    }

    /**
     * Create a plan changed event.
     */
    public static function planChanged(Subscription $subscription, int $oldPlanId, int $newPlanId): self
    {
        return static::createEvent($subscription, self::TYPE_PLAN_CHANGED, [
            'old_plan_id' => $oldPlanId,
            'new_plan_id' => $newPlanId,
        ]);
    }
}