<?php

namespace Tests\Unit;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionEvent;
use App\Models\Tenant;
use App\Services\SubscriptionStateManager;
use Exception;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionTest extends TestCase
{
    use RefreshDatabase;

    protected SubscriptionStateManager $stateManager;

    protected function setUp(): void
    {
        parent::setUp();
        $this->stateManager = new SubscriptionStateManager();
    }

    /** @test */
    public function it_can_create_a_subscription()
    {
        $tenant = Tenant::factory()->create();
        $plan = Plan::factory()->create();

        $subscription = Subscription::create([
            'tenant_id' => $tenant->id,
            'plan_id' => $plan->id,
            'status' => Subscription::STATUS_TRIALING,
            'billing_period_start' => now(),
            'billing_period_end' => now()->addMonth(),
            'trial_ends_at' => now()->addDays(14),
            'external_customer_id' => 'cus_123',
            'external_subscription_id' => 'sub_123',
        ]);

        $this->assertInstanceOf(Subscription::class, $subscription);
        $this->assertEquals($tenant->id, $subscription->tenant_id);
        $this->assertEquals($plan->id, $subscription->plan_id);
        $this->assertEquals(Subscription::STATUS_TRIALING, $subscription->status);
        $this->assertEquals('cus_123', $subscription->external_customer_id);
        $this->assertEquals('sub_123', $subscription->external_subscription_id);
    }

    /** @test */
    public function it_can_start_trial()
    {
        $subscription = Subscription::factory()->create([
            'status' => null,
        ]);

        $updatedSubscription = $this->stateManager->startTrial($subscription, 21);

        $this->assertEquals(Subscription::STATUS_TRIALING, $updatedSubscription->status);
        $this->assertEquals(21, $updatedSubscription->trial_days);
        $this->assertNotNull($updatedSubscription->trial_ends_at);

        // Check that an event was created
        $this->assertDatabaseHas('subscription_events', [
            'subscription_id' => $subscription->id,
            'type' => SubscriptionEvent::TYPE_TRIAL_STARTED,
        ]);
    }

    /** @test */
    public function it_cannot_start_trial_from_invalid_state()
    {
        $subscription = Subscription::factory()->active()->create();

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('Cannot transition from active to trialing');

        $this->stateManager->startTrial($subscription, 14);
    }

    /** @test */
    public function it_can_activate_subscription()
    {
        $subscription = Subscription::factory()->trialing()->create();

        $updatedSubscription = $this->stateManager->activateSubscription(
            $subscription,
            'sub_new_123'
        );

        $this->assertEquals(Subscription::STATUS_ACTIVE, $updatedSubscription->status);
        $this->assertEquals('sub_new_123', $updatedSubscription->external_subscription_id);
        $this->assertNull($updatedSubscription->trial_ends_at);

        // Check that events were created
        $this->assertDatabaseHas('subscription_events', [
            'subscription_id' => $subscription->id,
            'type' => SubscriptionEvent::TYPE_TRIAL_ENDED,
        ]);
    }

    /** @test */
    public function it_cannot_activate_from_invalid_state()
    {
        $subscription = Subscription::factory()->expired()->create();

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('Cannot transition from expired to active');

        $this->stateManager->activateSubscription($subscription);
    }

    /** @test */
    public function it_can_mark_subscription_as_past_due()
    {
        $subscription = Subscription::factory()->active()->create();

        $updatedSubscription = $this->stateManager->markAsPastDue($subscription);

        $this->assertEquals(Subscription::STATUS_PAST_DUE, $updatedSubscription->status);

        // Check that a payment failed event was created
        $this->assertDatabaseHas('subscription_events', [
            'subscription_id' => $subscription->id,
            'type' => SubscriptionEvent::TYPE_PAYMENT_FAILED,
        ]);
    }

    /** @test */
    public function it_cannot_mark_as_past_due_from_invalid_state()
    {
        $subscription = Subscription::factory()->trialing()->create();

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('Cannot transition from trialing to past_due');

        $this->stateManager->markAsPastDue($subscription);
    }

    /** @test */
    public function it_can_cancel_subscription_immediately()
    {
        $subscription = Subscription::factory()->active()->create();

        $updatedSubscription = $this->stateManager->cancelSubscription($subscription, true);

        $this->assertEquals(Subscription::STATUS_CANCELED, $updatedSubscription->status);
        $this->assertNotNull($updatedSubscription->ends_at);

        // Check that a canceled event was created
        $this->assertDatabaseHas('subscription_events', [
            'subscription_id' => $subscription->id,
            'type' => SubscriptionEvent::TYPE_CANCELED,
        ]);
    }

    /** @test */
    public function it_can_cancel_subscription_scheduled()
    {
        $subscription = Subscription::factory()->active()->create();

        $updatedSubscription = $this->stateManager->cancelSubscription($subscription, false);

        $this->assertEquals(Subscription::STATUS_CANCELED, $updatedSubscription->status);
        $this->assertNotNull($updatedSubscription->ends_at);
        $this->assertGreaterThan(now(), $updatedSubscription->ends_at);
    }

    /** @test */
    public function it_cannot_cancel_from_invalid_state()
    {
        $subscription = Subscription::factory()->expired()->create();

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('Cannot transition from expired to canceled');

        $this->stateManager->cancelSubscription($subscription);
    }

    /** @test */
    public function it_can_expire_subscription()
    {
        $subscription = Subscription::factory()->canceled()->create();

        $updatedSubscription = $this->stateManager->expireSubscription($subscription);

        $this->assertEquals(Subscription::STATUS_EXPIRED, $updatedSubscription->status);
        $this->assertNotNull($updatedSubscription->ends_at);

        // Check that an expired event was created
        $this->assertDatabaseHas('subscription_events', [
            'subscription_id' => $subscription->id,
            'type' => SubscriptionEvent::TYPE_EXPIRED,
        ]);
    }

    /** @test */
    public function it_cannot_expire_from_invalid_state()
    {
        $subscription = Subscription::factory()->active()->create();

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('Cannot transition from active to expired');

        $this->stateManager->expireSubscription($subscription);
    }

    /** @test */
    public function it_can_recover_from_past_due_to_active()
    {
        $subscription = Subscription::factory()->pastDue()->create();

        $updatedSubscription = $this->stateManager->activateSubscription($subscription);

        $this->assertEquals(Subscription::STATUS_ACTIVE, $updatedSubscription->status);
    }

    /** @test */
    public function it_processes_grace_period_correctly()
    {
        $subscription = Subscription::factory()->canceled()->create([
            'ends_at' => now()->subDays(10), // Ended 10 days ago
        ]);

        // Grace period is 7 days, so this should expire
        $result = $this->stateManager->processGracePeriod($subscription);

        $this->assertNotNull($result);
        $this->assertEquals(Subscription::STATUS_EXPIRED, $result->status);
    }

    /** @test */
    public function it_does_not_expire_within_grace_period()
    {
        $subscription = Subscription::factory()->canceled()->create([
            'ends_at' => now()->subDays(3), // Ended 3 days ago
        ]);

        // Still within 7-day grace period
        $result = $this->stateManager->processGracePeriod($subscription);

        $this->assertNull($result);
        $this->assertEquals(Subscription::STATUS_CANCELED, $subscription->fresh()->status);
    }

    /** @test */
    public function it_returns_valid_transitions()
    {
        $transitions = $this->stateManager->getValidTransitions(Subscription::STATUS_TRIALING);

        $this->assertContains(Subscription::STATUS_ACTIVE, $transitions);
        $this->assertContains(Subscription::STATUS_PAST_DUE, $transitions);
        $this->assertContains(Subscription::STATUS_CANCELED, $transitions);
        $this->assertNotContains(Subscription::STATUS_TRIALING, $transitions);
        $this->assertNotContains(Subscription::STATUS_EXPIRED, $transitions);
    }

    /** @test */
    public function it_checks_if_transition_is_possible()
    {
        $trialingSubscription = Subscription::factory()->trialing()->create();
        $activeSubscription = Subscription::factory()->active()->create();

        $this->assertTrue(
            $this->stateManager->canTransitionTo($trialingSubscription, Subscription::STATUS_ACTIVE)
        );
        $this->assertFalse(
            $this->stateManager->canTransitionTo($activeSubscription, Subscription::STATUS_TRIALING)
        );
    }

    /** @test */
    public function it_has_proper_status_scopes()
    {
        // Create subscriptions with different statuses
        Subscription::factory()->trialing()->create();
        Subscription::factory()->active()->create();
        Subscription::factory()->pastDue()->create();
        Subscription::factory()->canceled()->create();
        Subscription::factory()->expired()->create();

        $this->assertEquals(1, Subscription::trialing()->count());
        $this->assertEquals(1, Subscription::active()->count());
        $this->assertEquals(1, Subscription::pastDue()->count());
        $this->assertEquals(1, Subscription::canceled()->count());
        $this->assertEquals(1, Subscription::expired()->count());
    }

    /** @test */
    public function it_checks_subscription_status_correctly()
    {
        $trialing = Subscription::factory()->trialing()->create();
        $active = Subscription::factory()->active()->create();
        $pastDue = Subscription::factory()->pastDue()->create();
        $canceled = Subscription::factory()->canceled()->create();
        $expired = Subscription::factory()->expired()->create();

        $this->assertTrue($trialing->isTrialing());
        $this->assertFalse($trialing->isActive());

        $this->assertTrue($active->isActive());
        $this->assertFalse($active->isTrialing());

        $this->assertTrue($pastDue->isPastDue());
        $this->assertFalse($pastDue->isActive());

        $this->assertTrue($canceled->isCanceled());
        $this->assertFalse($canceled->isActive());

        $this->assertTrue($expired->isExpired());
        $this->assertFalse($expired->isActive());
    }

    /** @test */
    public function it_checks_if_subscription_is_on_trial()
    {
        $trialing = Subscription::factory()->trialing([
            'trial_ends_at' => now()->addDays(7),
        ])->create();

        $expiredTrial = Subscription::factory()->trialing([
            'trial_ends_at' => now()->subDays(7),
        ])->create();

        $this->assertTrue($trialing->onTrial());
        $this->assertFalse($expiredTrial->onTrial());
    }

    /** @test */
    public function it_checks_if_subscription_is_within_grace_period()
    {
        $inGracePeriod = Subscription::factory()->canceled([
            'ends_at' => now()->subDays(3),
        ])->create();

        $outsideGracePeriod = Subscription::factory()->canceled([
            'ends_at' => now()->subDays(10),
        ])->create();

        $activeSubscription = Subscription::factory()->active()->create();

        $this->assertTrue($inGracePeriod->inGracePeriod());
        $this->assertFalse($outsideGracePeriod->inGracePeriod());
        $this->assertFalse($activeSubscription->inGracePeriod());
    }

    /** @test */
    public function it_has_relationship_with_tenant()
    {
        $tenant = Tenant::factory()->create();
        $subscription = Subscription::factory()->create(['tenant_id' => $tenant->id]);

        $this->assertInstanceOf(Tenant::class, $subscription->tenant);
        $this->assertEquals($tenant->id, $subscription->tenant->id);
    }

    /** @test */
    public function it_has_relationship_with_plan()
    {
        $plan = Plan::factory()->create();
        $subscription = Subscription::factory()->create(['plan_id' => $plan->id]);

        $this->assertInstanceOf(Plan::class, $subscription->plan);
        $this->assertEquals($plan->id, $subscription->plan->id);
    }

    /** @test */
    public function it_has_relationship_with_events()
    {
        $subscription = Subscription::factory()->create();
        SubscriptionEvent::factory()->count(3)->create(['subscription_id' => $subscription->id]);

        $this->assertCount(3, $subscription->events);
        $subscription->events->each(function ($event) use ($subscription) {
            $this->assertEquals($subscription->id, $event->subscription_id);
        });
    }

    /** @test */
    public function it_can_create_subscription_using_factory()
    {
        $subscription = Subscription::factory()->create();

        $this->assertInstanceOf(Subscription::class, $subscription);
        $this->assertNotNull($subscription->tenant_id);
        $this->assertNotNull($subscription->plan_id);
        $this->assertNotNull($subscription->status);
    }

    /** @test */
    public function it_can_create_trial_subscription_using_factory()
    {
        $subscription = Subscription::factory()->trialing(30)->create();

        $this->assertEquals(Subscription::STATUS_TRIALING, $subscription->status);
        $this->assertEquals(30, $subscription->trial_days);
        $this->assertNotNull($subscription->trial_ends_at);
    }

    /** @test */
    public function it_can_create_active_subscription_using_factory()
    {
        $subscription = Subscription::factory()->active()->create();

        $this->assertEquals(Subscription::STATUS_ACTIVE, $subscription->status);
        $this->assertNull($subscription->trial_ends_at);
    }

    /** @test */
    public function it_can_create_past_due_subscription_using_factory()
    {
        $subscription = Subscription::factory()->pastDue()->create();

        $this->assertEquals(Subscription::STATUS_PAST_DUE, $subscription->status);
    }

    /** @test */
    public function it_can_create_canceled_subscription_using_factory()
    {
        $subscription = Subscription::factory()->canceled()->create();

        $this->assertEquals(Subscription::STATUS_CANCELED, $subscription->status);
        $this->assertNotNull($subscription->cancel_at);
        $this->assertNotNull($subscription->cancelled_at);
    }

    /** @test */
    public function it_can_create_expired_subscription_using_factory()
    {
        $subscription = Subscription::factory()->expired()->create();

        $this->assertEquals(Subscription::STATUS_EXPIRED, $subscription->status);
    }
}