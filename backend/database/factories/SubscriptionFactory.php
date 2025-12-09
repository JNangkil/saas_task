<?php

namespace Database\Factories;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Subscription>
 */
class SubscriptionFactory extends Factory
{
    protected $model = Subscription::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $plan = Plan::factory()->create();
        $tenant = Tenant::factory()->create();
        $status = $this->faker->randomElement([
            Subscription::STATUS_TRIALING,
            Subscription::STATUS_ACTIVE,
            Subscription::STATUS_PAST_DUE,
            Subscription::STATUS_CANCELED,
            Subscription::STATUS_EXPIRED,
        ]);

        $billingPeriodStart = $this->faker->dateTimeBetween('-1 year', 'now');
        $billingPeriodEnd = (clone $billingPeriodStart)->modify('+1 month');
        $trialEndsAt = null;
        $cancelAt = null;
        $cancelledAt = null;

        if ($status === Subscription::STATUS_TRIALING) {
            $trialEndsAt = $this->faker->dateTimeBetween('now', '+14 days');
        } elseif ($status === Subscription::STATUS_CANCELED) {
            $cancelAt = $this->faker->dateTimeBetween('now', '+1 month');
            $cancelledAt = $this->faker->dateTimeBetween('-1 week', 'now');
        }

        return [
            'tenant_id' => $tenant->id,
            'plan_id' => $plan->id,
            'status' => $status,
            'billing_period_start' => $billingPeriodStart,
            'billing_period_end' => $billingPeriodEnd,
            'trial_ends_at' => $trialEndsAt,
            'cancel_at' => $cancelAt,
            'cancelled_at' => $cancelledAt,
            'external_customer_id' => 'cus_' . $this->faker->unique()->sha1(),
            'external_subscription_id' => 'sub_' . $this->faker->unique()->sha1(),
        ];
    }

    /**
     * Indicate that the subscription is trialing.
     */
    public function trialing(?int $trialDays = null): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Subscription::STATUS_TRIALING,
            'trial_ends_at' => $trialDays ? now()->addDays($trialDays) : $this->faker->dateTimeBetween('now', '+14 days'),
        ]);
    }

    /**
     * Indicate that the subscription is active.
     */
    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Subscription::STATUS_ACTIVE,
            'trial_ends_at' => null,
        ]);
    }

    /**
     * Indicate that the subscription is past due.
     */
    public function pastDue(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Subscription::STATUS_PAST_DUE,
            'trial_ends_at' => null,
            'billing_period_end' => $this->faker->dateTimeBetween('-30 days', '-1 day'),
        ]);
    }

    /**
     * Indicate that the subscription is canceled.
     */
    public function canceled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Subscription::STATUS_CANCELED,
            'cancel_at' => $this->faker->dateTimeBetween('now', '+1 month'),
            'cancelled_at' => $this->faker->dateTimeBetween('-1 week', 'now'),
        ]);
    }

    /**
     * Indicate that the subscription is expired.
     */
    public function expired(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Subscription::STATUS_EXPIRED,
            'billing_period_end' => $this->faker->dateTimeBetween('-90 days', '-31 days'),
        ]);
    }

    /**
     * Create a subscription for a specific tenant.
     */
    public function forTenant(Tenant $tenant): static
    {
        return $this->state(fn (array $attributes) => [
            'tenant_id' => $tenant->id,
        ]);
    }

    /**
     * Create a subscription for a specific plan.
     */
    public function forPlan(Plan $plan): static
    {
        return $this->state(fn (array $attributes) => [
            'plan_id' => $plan->id,
        ]);
    }

    /**
     * Create a subscription with a free plan.
     */
    public function free(): static
    {
        return $this->state(fn (array $attributes) => [
            'plan_id' => Plan::factory()->free(),
            'status' => Subscription::STATUS_ACTIVE,
            'trial_ends_at' => null,
            'external_customer_id' => null,
            'external_subscription_id' => null,
        ]);
    }

    /**
     * Create a subscription with a starter plan.
     */
    public function starter(): static
    {
        return $this->state(fn (array $attributes) => [
            'plan_id' => Plan::factory()->starter(),
        ]);
    }

    /**
     * Create a subscription with a pro plan.
     */
    public function pro(): static
    {
        return $this->state(fn (array $attributes) => [
            'plan_id' => Plan::factory()->pro(),
        ]);
    }

    /**
     * Create a subscription with an enterprise plan.
     */
    public function enterprise(): static
    {
        return $this->state(fn (array $attributes) => [
            'plan_id' => Plan::factory()->enterprise(),
        ]);
    }

    /**
     * Create a subscription without external IDs (for cash/manual billing).
     */
    public function withoutExternalIds(): static
    {
        return $this->state(fn (array $attributes) => [
            'external_customer_id' => null,
            'external_subscription_id' => null,
        ]);
    }

    /**
     * Create a subscription that will end soon.
     */
    public function endingSoon(int $days = 7): static
    {
        return $this->state(fn (array $attributes) => [
            'billing_period_end' => now()->addDays($days),
        ]);
    }

    /**
     * Create a subscription with a trial ending soon.
     */
    public function trialEndingSoon(int $hours = 48): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Subscription::STATUS_TRIALING,
            'trial_ends_at' => now()->addHours($hours),
        ]);
    }
}