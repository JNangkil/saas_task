<?php

namespace Database\Factories;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionEvent;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\SubscriptionEvent>
 */
class SubscriptionEventFactory extends Factory
{
    protected $model = SubscriptionEvent::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $subscription = Subscription::factory()->create();
        $eventType = $this->faker->randomElement([
            SubscriptionEvent::TYPE_CREATED,
            SubscriptionEvent::TYPE_UPDATED,
            SubscriptionEvent::TYPE_CANCELED,
            SubscriptionEvent::TYPE_EXPIRED,
            SubscriptionEvent::TYPE_PAYMENT_FAILED,
            SubscriptionEvent::TYPE_PAYMENT_SUCCEEDED,
            SubscriptionEvent::TYPE_TRIAL_STARTED,
            SubscriptionEvent::TYPE_TRIAL_ENDED,
            SubscriptionEvent::TYPE_PLAN_CHANGED,
            SubscriptionEvent::TYPE_RENEWED,
        ]);

        // Generate appropriate data based on event type
        $data = match($eventType) {
            SubscriptionEvent::TYPE_PAYMENT_SUCCEEDED => [
                'amount' => $this->faker->randomFloat(2, 9.99, 199.99),
                'currency' => 'usd',
                'payment_method' => 'card',
                'transaction_id' => 'txn_' . $this->faker->unique()->sha1(),
            ],
            SubscriptionEvent::TYPE_PAYMENT_FAILED => [
                'reason' => $this->faker->randomElement(['insufficient_funds', 'card_declined', 'expired_card']),
                'error_code' => $this->faker->randomElement(['card_declined', 'expired_card', 'processing_error']),
                'attempt_count' => $this->faker->numberBetween(1, 3),
            ],
            SubscriptionEvent::TYPE_PLAN_CHANGED => [
                'old_plan_id' => Plan::factory()->create()->id,
                'new_plan_id' => $subscription->plan_id,
                'change_reason' => $this->faker->randomElement(['upgrade', 'downgrade', 'user_initiated']),
            ],
            SubscriptionEvent::TYPE_CREATED => [
                'source' => $this->faker->randomElement(['checkout', 'admin', 'api', 'migration']),
                'trial_started' => $this->faker->boolean(30),
            ],
            default => [],
        };

        return [
            'subscription_id' => $subscription->id,
            'type' => $eventType,
            'data' => $data,
            'processed_at' => $this->faker->boolean(80) ? now() : null, // 80% chance of being processed
        ];
    }

    /**
     * Indicate that the event is for a specific subscription.
     */
    public function forSubscription(Subscription $subscription): static
    {
        return $this->state(fn (array $attributes) => [
            'subscription_id' => $subscription->id,
        ]);
    }

    /**
     * Indicate that the event is a creation event.
     */
    public function created(array $data = []): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => SubscriptionEvent::TYPE_CREATED,
            'data' => array_merge([
                'source' => 'checkout',
                'trial_started' => false,
            ], $data),
        ]);
    }

    /**
     * Indicate that the event is an update event.
     */
    public function updated(array $data = []): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => SubscriptionEvent::TYPE_UPDATED,
            'data' => $data,
        ]);
    }

    /**
     * Indicate that the event is a cancellation event.
     */
    public function canceled(array $data = []): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => SubscriptionEvent::TYPE_CANCELED,
            'data' => array_merge([
                'reason' => 'user_requested',
                'immediate' => false,
                'feedback' => null,
            ], $data),
        ]);
    }

    /**
     * Indicate that the event is an expiration event.
     */
    public function expired(array $data = []): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => SubscriptionEvent::TYPE_EXPIRED,
            'data' => array_merge([
                'reason' => 'non_payment',
                'grace_period_used' => true,
            ], $data),
        ]);
    }

    /**
     * Indicate that the event is a payment succeeded event.
     */
    public function paymentSucceeded(array $paymentData = []): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => SubscriptionEvent::TYPE_PAYMENT_SUCCEEDED,
            'data' => array_merge([
                'amount' => $this->faker->randomFloat(2, 9.99, 199.99),
                'currency' => 'usd',
                'payment_method' => 'card',
                'transaction_id' => 'txn_' . $this->faker->unique()->sha1(),
            ], $paymentData),
        ]);
    }

    /**
     * Indicate that the event is a payment failed event.
     */
    public function paymentFailed(array $errorData = []): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => SubscriptionEvent::TYPE_PAYMENT_FAILED,
            'data' => array_merge([
                'reason' => $this->faker->randomElement(['insufficient_funds', 'card_declined', 'expired_card']),
                'error_code' => $this->faker->randomElement(['card_declined', 'expired_card', 'processing_error']),
                'attempt_count' => $this->faker->numberBetween(1, 3),
            ], $errorData),
        ]);
    }

    /**
     * Indicate that the event is a trial started event.
     */
    public function trialStarted(array $data = []): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => SubscriptionEvent::TYPE_TRIAL_STARTED,
            'data' => array_merge([
                'trial_days' => $this->faker->randomElement([7, 14, 30]),
                'trial_reason' => 'new_subscription',
            ], $data),
        ]);
    }

    /**
     * Indicate that the event is a trial ended event.
     */
    public function trialEnded(array $data = []): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => SubscriptionEvent::TYPE_TRIAL_ENDED,
            'data' => array_merge([
                'trial_converted' => $this->faker->boolean(70), // 70% conversion rate
                'trial_days_used' => $this->faker->numberBetween(7, 30),
            ], $data),
        ]);
    }

    /**
     * Indicate that the event is a plan changed event.
     */
    public function planChanged(int $oldPlanId = null, int $newPlanId = null): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => SubscriptionEvent::TYPE_PLAN_CHANGED,
            'data' => [
                'old_plan_id' => $oldPlanId ?? Plan::factory()->create()->id,
                'new_plan_id' => $newPlanId ?? Plan::factory()->create()->id,
                'change_reason' => $this->faker->randomElement(['upgrade', 'downgrade', 'user_initiated']),
                'prorated' => $this->faker->boolean(50),
            ],
        ]);
    }

    /**
     * Indicate that the event is a renewal event.
     */
    public function renewed(array $data = []): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => SubscriptionEvent::TYPE_RENEWED,
            'data' => array_merge([
                'renewal_count' => $this->faker->numberBetween(1, 12),
                'auto_renewed' => true,
                'next_billing_date' => now()->addMonth()->toDateString(),
            ], $data),
        ]);
    }

    /**
     * Indicate that the event has been processed.
     */
    public function processed(): static
    {
        return $this->state(fn (array $attributes) => [
            'processed_at' => now(),
        ]);
    }

    /**
     * Indicate that the event has not been processed.
     */
    public function unprocessed(): static
    {
        return $this->state(fn (array $attributes) => [
            'processed_at' => null,
        ]);
    }

    /**
     * Indicate that the event was created recently.
     */
    public function recent(int $hours = 24): static
    {
        return $this->state(fn (array $attributes) => [
            'created_at' => $this->faker->dateTimeBetween("-{$hours} hours", 'now'),
            'updated_at' => $this->faker->dateTimeBetween("-{$hours} hours", 'now'),
        ]);
    }
}