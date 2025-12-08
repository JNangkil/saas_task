<?php

namespace Tests\Unit;

use App\Models\Subscription;
use App\Models\SubscriptionEvent;
use App\Models\Tenant;
use App\Services\SubscriptionStateManager;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class SubscriptionStateManagerTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    private SubscriptionStateManager $stateManager;
    private Tenant $tenant;
    private Subscription $subscription;

    protected function setUp(): void
    {
        parent::setUp();

        $this->stateManager = new SubscriptionStateManager();
        $this->tenant = Tenant::factory()->create();
        
        $this->subscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => Subscription::STATUS_TRIALING,
            'trial_ends_at' => now()->addDays(7),
        ]);
    }

    /** @test */
    public function it_can_start_trial()
    {
        $newSubscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => null, // New subscription
        ]);

        $result = $this->stateManager->startTrial($newSubscription, 14);

        $this->assertEquals(Subscription::STATUS_TRIALING, $result->status);
        $this->assertEquals(14, $result->trial_days_remaining);
        $this->assertNotNull($result->trial_ends_at);

        // Check that subscription event was created
        $this->assertDatabaseHas('subscription_events', [
            'subscription_id' => $newSubscription->id,
            'type' => SubscriptionEvent::TYPE_TRIAL_STARTED,
        ]);
    }

    /** @test */
    public function it_throws_exception_when_starting_trial_from_invalid_state()
    {
        $activeSubscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => Subscription::STATUS_ACTIVE,
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Cannot transition from active to trialing');
        
        $this->stateManager->startTrial($activeSubscription, 14);
    }

    /** @test */
    public function it_can_start_trial_from_expired_subscription()
    {
        $expiredSubscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => Subscription::STATUS_EXPIRED,
        ]);

        $result = $this->stateManager->startTrial($expiredSubscription, 14);

        $this->assertEquals(Subscription::STATUS_TRIALING, $result->status);
        $this->assertNotNull($result->trial_ends_at);
    }

    /** @test */
    public function it_can_activate_subscription()
    {
        $result = $this->stateManager->activateSubscription($this->subscription, 'sub_stripe_123');

        $this->assertEquals(Subscription::STATUS_ACTIVE, $result->status);
        $this->assertEquals('sub_stripe_123', $result->stripe_subscription_id);
        $this->assertNull($result->trial_ends_at); // Trial end date should be cleared

        // Check that subscription event was created
        $this->assertDatabaseHas('subscription_events', [
            'subscription_id' => $this->subscription->id,
            'type' => SubscriptionEvent::TYPE_TRIAL_ENDED,
        ]);
    }

    /** @test */
    public function it_can_activate_subscription_without_stripe_id()
    {
        $result = $this->stateManager->activateSubscription($this->subscription);

        $this->assertEquals(Subscription::STATUS_ACTIVE, $result->status);
        $this->assertNull($result->trial_ends_at);
    }

    /** @test */
    public function it_throws_exception_when_activating_from_invalid_state()
    {
        $expiredSubscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => Subscription::STATUS_EXPIRED,
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Cannot transition from expired to active');
        
        $this->stateManager->activateSubscription($expiredSubscription);
    }

    /** @test */
    public function it_can_mark_subscription_as_past_due()
    {
        $activeSubscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => Subscription::STATUS_ACTIVE,
        ]);

        $result = $this->stateManager->markAsPastDue($activeSubscription);

        $this->assertEquals(Subscription::STATUS_PAST_DUE, $result->status);

        // Check that payment failed event was created
        $this->assertDatabaseHas('subscription_events', [
            'subscription_id' => $activeSubscription->id,
            'type' => SubscriptionEvent::TYPE_PAYMENT_FAILED,
        ]);
    }

    /** @test */
    public function it_throws_exception_when_marking_invalid_state_as_past_due()
    {
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Cannot transition from trialing to past_due');
        
        $this->stateManager->markAsPastDue($this->subscription);
    }

    /** @test */
    public function it_can_cancel_subscription_immediately()
    {
        $activeSubscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => Subscription::STATUS_ACTIVE,
        ]);

        $result = $this->stateManager->cancelSubscription($activeSubscription, true);

        $this->assertEquals(Subscription::STATUS_CANCELED, $result->status);
        $this->assertNotNull($result->ends_at);
        $this->assertEquals(now()->format('Y-m-d'), $result->ends_at->format('Y-m-d'));

        // Check that canceled event was created
        $this->assertDatabaseHas('subscription_events', [
            'subscription_id' => $activeSubscription->id,
            'type' => SubscriptionEvent::TYPE_CANCELED,
        ]);
    }

    /** @test */
    public function it_can_cancel_subscription_at_period_end()
    {
        $activeSubscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => Subscription::STATUS_ACTIVE,
        ]);

        $result = $this->stateManager->cancelSubscription($activeSubscription, false);

        $this->assertEquals(Subscription::STATUS_CANCELED, $result->status);
        $this->assertNotNull($result->ends_at);
        $this->assertEquals(
            now()->addMonth()->format('Y-m-d'),
            $result->ends_at->format('Y-m-d')
        );
    }

    /** @test */
    public function it_sets_end_date_to_trial_end_when_canceling_trial()
    {
        $result = $this->stateManager->cancelSubscription($this->subscription, false);

        $this->assertEquals(Subscription::STATUS_CANCELED, $result->status);
        $this->assertEquals(
            $this->subscription->trial_ends_at->format('Y-m-d'),
            $result->ends_at->format('Y-m-d')
        );
    }

    /** @test */
    public function it_throws_exception_when_canceling_from_invalid_state()
    {
        $expiredSubscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => Subscription::STATUS_EXPIRED,
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Cannot transition from expired to canceled');
        
        $this->stateManager->cancelSubscription($expiredSubscription);
    }

    /** @test */
    public function it_can_expire_subscription()
    {
        $canceledSubscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => Subscription::STATUS_CANCELED,
            'ends_at' => now()->subDays(10),
        ]);

        $result = $this->stateManager->expireSubscription($canceledSubscription);

        $this->assertEquals(Subscription::STATUS_EXPIRED, $result->status);
        $this->assertEquals(now()->format('Y-m-d'), $result->ends_at->format('Y-m-d'));

        // Check that expired event was created
        $this->assertDatabaseHas('subscription_events', [
            'subscription_id' => $canceledSubscription->id,
            'type' => SubscriptionEvent::TYPE_EXPIRED,
        ]);
    }

    /** @test */
    public function it_throws_exception_when_expiring_from_invalid_state()
    {
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Cannot transition from trialing to expired');
        
        $this->stateManager->expireSubscription($this->subscription);
    }

    /** @test */
    public function it_validates_state_transitions_correctly()
    {
        // Test valid transitions
        $this->assertTrue($this->stateManager->isValidTransition(
            Subscription::STATUS_TRIALING,
            Subscription::STATUS_ACTIVE
        ));

        $this->assertTrue($this->stateManager->isValidTransition(
            Subscription::STATUS_ACTIVE,
            Subscription::STATUS_CANCELED
        ));

        $this->assertTrue($this->stateManager->isValidTransition(
            Subscription::STATUS_PAST_DUE,
            Subscription::STATUS_ACTIVE
        ));

        // Test invalid transitions
        $this->assertFalse($this->stateManager->isValidTransition(
            Subscription::STATUS_EXPIRED,
            Subscription::STATUS_ACTIVE
        ));

        $this->assertFalse($this->stateManager->isValidTransition(
            Subscription::STATUS_ACTIVE,
            Subscription::STATUS_TRIALING
        ));
    }

    /** @test */
    public function it_allows_trial_transition_from_no_status()
    {
        $this->assertTrue($this->stateManager->isValidTransition(
            'none',
            Subscription::STATUS_TRIALING
        ));
    }

    /** @test */
    public function it_records_state_changes()
    {
        $activeSubscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => Subscription::STATUS_ACTIVE,
        ]);

        $event = $this->stateManager->recordStateChange(
            $activeSubscription,
            Subscription::STATUS_ACTIVE,
            Subscription::STATUS_CANCELED,
            ['immediately' => true]
        );

        $this->assertEquals(SubscriptionEvent::TYPE_UPDATED, $event->type);
        $this->assertEquals(Subscription::STATUS_ACTIVE, $event->data['previous_status']);
        $this->assertEquals(Subscription::STATUS_CANCELED, $event->data['new_status']);
        $this->assertTrue($event->data['immediately']);
    }

    /** @test */
    public function it_processes_grace_period_for_canceled_subscription()
    {
        $canceledSubscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => Subscription::STATUS_CANCELED,
            'ends_at' => now()->subDays(10), // Past 7-day grace period
        ]);

        $result = $this->stateManager->processGracePeriod($canceledSubscription);

        $this->assertNotNull($result);
        $this->assertEquals(Subscription::STATUS_EXPIRED, $result->status);
    }

    /** @test */
    public function it_returns_null_for_subscription_not_needing_grace_period_processing()
    {
        $canceledSubscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => Subscription::STATUS_CANCELED,
            'ends_at' => now()->subDays(2), // Still within grace period
        ]);

        $result = $this->stateManager->processGracePeriod($canceledSubscription);

        $this->assertNull($result);
    }

    /** @test */
    public function it_returns_null_for_active_subscription_grace_period_processing()
    {
        $activeSubscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => Subscription::STATUS_ACTIVE,
        ]);

        $result = $this->stateManager->processGracePeriod($activeSubscription);

        $this->assertNull($result);
    }

    /** @test */
    public function it_returns_null_for_subscription_without_end_date_grace_period_processing()
    {
        $canceledSubscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => Subscription::STATUS_CANCELED,
            'ends_at' => null,
        ]);

        $result = $this->stateManager->processGracePeriod($canceledSubscription);

        $this->assertNull($result);
    }

    /** @test */
    public function it_gets_valid_transitions_for_state()
    {
        $activeTransitions = $this->stateManager->getValidTransitions(Subscription::STATUS_ACTIVE);
        
        $this->assertContains(Subscription::STATUS_PAST_DUE, $activeTransitions);
        $this->assertContains(Subscription::STATUS_CANCELED, $activeTransitions);
        $this->assertNotContains(Subscription::STATUS_TRIALING, $activeTransitions);
        $this->assertNotContains(Subscription::STATUS_EXPIRED, $activeTransitions);
    }

    /** @test */
    public function it_returns_empty_array_for_expired_state_transitions()
    {
        $expiredTransitions = $this->stateManager->getValidTransitions(Subscription::STATUS_EXPIRED);
        
        $this->assertEmpty($expiredTransitions);
    }

    /** @test */
    public function it_checks_if_subscription_can_transition_to_state()
    {
        $activeSubscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => Subscription::STATUS_ACTIVE,
        ]);

        $this->assertTrue(
            $this->stateManager->canTransitionTo($activeSubscription, Subscription::STATUS_CANCELED)
        );
        
        $this->assertFalse(
            $this->stateManager->canTransitionTo($activeSubscription, Subscription::STATUS_TRIALING)
        );
    }

    /** @test */
    public function it_logs_state_transitions()
    {
        Log::shouldReceive('info')->once()->with(
            "Subscription {$this->subscription->id} activated",
            \Mockery::type('array')
        );

        $this->stateManager->activateSubscription($this->subscription);
    }

    /** @test */
    public function it_logs_warning_for_past_due_transitions()
    {
        $activeSubscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => Subscription::STATUS_ACTIVE,
        ]);

        Log::shouldReceive('warning')->once()->with(
            "Subscription {$activeSubscription->id} marked as past due",
            \Mockery::type('array')
        );

        $this->stateManager->markAsPastDue($activeSubscription);
    }

    /** @test */
    public function it_logs_cancellation_transitions()
    {
        $activeSubscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => Subscription::STATUS_ACTIVE,
        ]);

        Log::shouldReceive('info')->once()->with(
            "Subscription {$activeSubscription->id} canceled",
            \Mockery::type('array')
        );

        $this->stateManager->cancelSubscription($activeSubscription, true);
    }

    /** @test */
    public function it_logs_expiration_transitions()
    {
        $canceledSubscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => Subscription::STATUS_CANCELED,
            'ends_at' => now()->subDays(10),
        ]);

        Log::shouldReceive('info')->once()->with(
            "Subscription {$canceledSubscription->id} expired",
            \Mockery::type('array')
        );

        $this->stateManager->expireSubscription($canceledSubscription);
    }

    /** @test */
    public function it_handles_trial_start_logging()
    {
        $newSubscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => null,
        ]);

        Log::shouldReceive('info')->once()->with(
            "Subscription {$newSubscription->id} started trial for 14 days"
        );

        $this->stateManager->startTrial($newSubscription, 14);
    }

    /** @test */
    public function it_creates_correct_event_types_for_state_changes()
    {
        // Test trial to active creates trial_ended event
        $this->stateManager->activateSubscription($this->subscription);
        
        $this->assertDatabaseHas('subscription_events', [
            'subscription_id' => $this->subscription->id,
            'type' => SubscriptionEvent::TYPE_TRIAL_ENDED,
        ]);

        // Test active to canceled creates canceled event
        $activeSubscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => Subscription::STATUS_ACTIVE,
        ]);

        $this->stateManager->cancelSubscription($activeSubscription, true);
        
        $this->assertDatabaseHas('subscription_events', [
            'subscription_id' => $activeSubscription->id,
            'type' => SubscriptionEvent::TYPE_CANCELED,
        ]);
    }
}