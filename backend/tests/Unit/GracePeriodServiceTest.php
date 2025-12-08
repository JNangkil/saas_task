<?php

namespace Tests\Unit;

use App\Mail\GracePeriodNotification;
use App\Models\Subscription;
use App\Models\SubscriptionEvent;
use App\Models\Tenant;
use App\Models\User;
use App\Services\GracePeriodService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class GracePeriodServiceTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    private GracePeriodService $service;
    private Tenant $tenant;
    private User $user;
    private Subscription $subscription;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new GracePeriodService();
        
        $this->tenant = Tenant::factory()->create();
        $this->user = User::factory()->create();
        $this->tenant->users()->attach($this->user->id, ['role' => 'owner']);
        
        $this->subscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => Subscription::STATUS_CANCELED,
            'ends_at' => now()->subDays(2),
        ]);
    }

    /** @test */
    public function it_identifies_subscription_within_grace_period()
    {
        $isWithinGracePeriod = $this->service->isWithinGracePeriod($this->subscription);
        
        $this->assertTrue($isWithinGracePeriod);
    }

    /** @test */
    public function it_identifies_subscription_not_within_grace_period()
    {
        // Create a subscription that ended 10 days ago (beyond 7-day grace period)
        $oldSubscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => Subscription::STATUS_CANCELED,
            'ends_at' => now()->subDays(10),
        ]);

        $isWithinGracePeriod = $this->service->isWithinGracePeriod($oldSubscription);
        
        $this->assertFalse($isWithinGracePeriod);
    }

    /** @test */
    public function it_returns_false_for_subscription_without_end_date()
    {
        $subscriptionWithoutEndDate = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => Subscription::STATUS_CANCELED,
            'ends_at' => null,
        ]);

        $isWithinGracePeriod = $this->service->isWithinGracePeriod($subscriptionWithoutEndDate);
        
        $this->assertFalse($isWithinGracePeriod);
    }

    /** @test */
    public function it_returns_false_for_active_subscription()
    {
        $activeSubscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => Subscription::STATUS_ACTIVE,
            'ends_at' => now()->subDays(2),
        ]);

        $isWithinGracePeriod = $this->service->isWithinGracePeriod($activeSubscription);
        
        $this->assertFalse($isWithinGracePeriod);
    }

    /** @test */
    public function it_calculates_grace_period_end_date()
    {
        $gracePeriodEnd = $this->service->calculateGracePeriodEndDate($this->subscription);
        
        $expectedEnd = $this->subscription->ends_at->copy()->addDays(7);
        $this->assertEquals($expectedEnd, $gracePeriodEnd);
    }

    /** @test */
    public function it_throws_exception_when_calculating_grace_period_without_end_date()
    {
        $subscriptionWithoutEndDate = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => Subscription::STATUS_CANCELED,
            'ends_at' => null,
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Subscription has no end date');
        
        $this->service->calculateGracePeriodEndDate($subscriptionWithoutEndDate);
    }

    /** @test */
    public function it_sends_grace_period_notification()
    {
        Mail::fake();

        $result = $this->service->sendGracePeriodNotification($this->subscription, 3);

        $this->assertTrue($result);

        Mail::assertSent(GracePeriodNotification::class, function ($mail) {
            return $mail->subscription->id === $this->subscription->id && 
                   $mail->dayNumber === 3;
        });

        // Check that subscription event was created
        $this->assertDatabaseHas('subscription_events', [
            'subscription_id' => $this->subscription->id,
            'type' => 'grace_period_notification',
        ]);
    }

    /** @test */
    public function it_fails_to_send_notification_for_non_grace_period_subscription()
    {
        $activeSubscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => Subscription::STATUS_ACTIVE,
        ]);

        Log::shouldReceive('warning')->once();

        $result = $this->service->sendGracePeriodNotification($activeSubscription, 3);

        $this->assertFalse($result);
    }

    /** @test */
    public function it_fails_to_send_notification_for_subscription_without_tenant()
    {
        $orphanSubscription = Subscription::factory()->create([
            'status' => Subscription::STATUS_CANCELED,
            'ends_at' => now()->subDays(2),
            'tenant_id' => 999, // Non-existent tenant
        ]);

        Log::shouldReceive('error')->once();

        $result = $this->service->sendGracePeriodNotification($orphanSubscription, 3);

        $this->assertFalse($result);
    }

    /** @test */
    public function it_handles_grace_period_expiration()
    {
        // Create a subscription that's past the grace period
        $expiredSubscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => Subscription::STATUS_CANCELED,
            'ends_at' => now()->subDays(10), // 10 days ago, past 7-day grace period
        ]);

        $result = $this->service->handleGracePeriodExpiration($expiredSubscription);

        $this->assertEquals(Subscription::STATUS_EXPIRED, $result->status);

        // Check that subscription event was created
        $this->assertDatabaseHas('subscription_events', [
            'subscription_id' => $expiredSubscription->id,
            'type' => SubscriptionEvent::TYPE_EXPIRED,
        ]);
    }

    /** @test */
    public function it_throws_exception_when_expiring_non_grace_period_subscription()
    {
        $activeSubscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => Subscription::STATUS_ACTIVE,
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Subscription is not within grace period');
        
        $this->service->handleGracePeriodExpiration($activeSubscription);
    }

    /** @test */
    public function it_throws_exception_when_expiring_subscription_not_past_grace_period()
    {
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Grace period has not yet expired');
        
        $this->service->handleGracePeriodExpiration($this->subscription); // Only 2 days into grace period
    }

    /** @test */
    public function it_extends_grace_period()
    {
        $originalGracePeriodEnd = $this->service->calculateGracePeriodEndDate($this->subscription);
        
        $result = $this->service->extendGracePeriod($this->subscription, 3, 'Customer request');

        $newGracePeriodEnd = $this->service->calculateGracePeriodEndDate($result);
        
        $this->assertEquals(
            $originalGracePeriodEnd->addDays(3)->format('Y-m-d'),
            $newGracePeriodEnd->format('Y-m-d')
        );

        // Check metadata was updated
        $metadata = $result->metadata;
        $this->assertArrayHasKey('grace_period_extensions', $metadata);
        $this->assertArrayHasKey('extended_grace_period_end', $metadata);

        // Check that subscription event was created
        $this->assertDatabaseHas('subscription_events', [
            'subscription_id' => $this->subscription->id,
            'type' => 'grace_period_extended',
        ]);
    }

    /** @test */
    public function it_throws_exception_when_extending_non_canceled_subscription()
    {
        $activeSubscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => Subscription::STATUS_ACTIVE,
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Subscription must be canceled to extend grace period');
        
        $this->service->extendGracePeriod($activeSubscription, 3);
    }

    /** @test */
    public function it_throws_exception_when_extending_subscription_without_end_date()
    {
        $subscriptionWithoutEndDate = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => Subscription::STATUS_CANCELED,
            'ends_at' => null,
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Subscription has no end date');
        
        $this->service->extendGracePeriod($subscriptionWithoutEndDate, 3);
    }

    /** @test */
    public function it_gets_grace_period_days_from_config()
    {
        Config::set('billing.grace_period_days', 14);

        $gracePeriodDays = $this->service->getGracePeriodDays();

        $this->assertEquals(14, $gracePeriodDays);
    }

    /** @test */
    public function it_returns_default_grace_period_days_when_not_configured()
    {
        Config::forget('billing.grace_period_days');

        $gracePeriodDays = $this->service->getGracePeriodDays();

        $this->assertEquals(7, $gracePeriodDays); // Default value
    }

    /** @test */
    public function it_gets_grace_period_warning_days_from_config()
    {
        Config::set('billing.grace_period_warnings', '1,3,5,7');

        $warningDays = $this->service->getGracePeriodWarningDays();

        $this->assertEquals([1, 3, 5, 7], $warningDays);
    }

    /** @test */
    public function it_handles_array_grace_period_warning_days_config()
    {
        Config::set('billing.grace_period_warnings', [1, 3, 5]);

        $warningDays = $this->service->getGracePeriodWarningDays();

        $this->assertEquals([1, 3, 5], $warningDays);
    }

    /** @test */
    public function it_gets_subscriptions_in_grace_period()
    {
        // Create subscriptions in different states
        Subscription::factory()->create([
            'status' => Subscription::STATUS_ACTIVE,
        ]);

        Subscription::factory()->create([
            'status' => Subscription::STATUS_CANCELED,
            'ends_at' => now()->subDays(10), // Past grace period
        ]);

        $inGracePeriod = $this->service->getSubscriptionsInGracePeriod();

        $this->assertCount(1, $inGracePeriod);
        $this->assertEquals($this->subscription->id, $inGracePeriod->first()->id);
    }

    /** @test */
    public function it_gets_subscriptions_needing_notifications()
    {
        // Create subscription that needs notification on day 3
        $subscription3Days = Subscription::factory()->create([
            'tenant_id' => Tenant::factory()->create()->id,
            'status' => Subscription::STATUS_CANCELED,
            'ends_at' => now()->subDays(4), // 4 days ago, so day 3 of grace period
        ]);

        Config::set('billing.grace_period_warnings', '1,3,7');

        $needingNotifications = $this->service->getSubscriptionsNeedingNotifications();

        $this->assertCount(1, $needingNotifications);
        $this->assertEquals(3, $needingNotifications->first()['day_number']);
    }

    /** @test */
    public function it_does_not_duplicate_notifications()
    {
        // Mark day 3 notification as sent
        $metadata = [
            'grace_period_notifications_sent' => [3],
        ];
        $this->subscription->update(['metadata' => $metadata]);

        Config::set('billing.grace_period_warnings', '1,3,7');

        $needingNotifications = $this->service->getSubscriptionsNeedingNotifications();

        $this->assertCount(0, $needingNotifications);
    }

    /** @test */
    public function it_gets_subscriptions_with_expired_grace_periods()
    {
        // Create subscription with expired grace period
        $expiredSubscription = Subscription::factory()->create([
            'tenant_id' => Tenant::factory()->create()->id,
            'status' => Subscription::STATUS_CANCELED,
            'ends_at' => now()->subDays(10), // 10 days ago, past 7-day grace period
        ]);

        $expiredGracePeriods = $this->service->getSubscriptionsWithExpiredGracePeriod();

        $this->assertCount(1, $expiredGracePeriods);
        $this->assertEquals($expiredSubscription->id, $expiredGracePeriods->first()->id);
    }

    /** @test */
    public function it_marks_notification_as_sent()
    {
        $result = $this->service->markNotificationAsSent($this->subscription, 3);

        $metadata = $result->metadata;
        $this->assertContains(3, $metadata['grace_period_notifications_sent']);
    }

    /** @test */
    public function it_does_not_duplicate_marked_notifications()
    {
        // Mark day 3 as sent
        $this->service->markNotificationAsSent($this->subscription, 3);

        // Mark it again
        $result = $this->service->markNotificationAsSent($this->subscription, 3);

        $metadata = $result->metadata;
        $sentNotifications = $metadata['grace_period_notifications_sent'];
        
        // Should only have one entry for day 3
        $this->assertEquals(1, count(array_filter($sentNotifications, fn($day) => $day === 3)));
    }

    /** @test */
    public function it_gets_grace_period_status()
    {
        $status = $this->service->getGracePeriodStatus($this->subscription);

        $this->assertTrue($status['in_grace_period']);
        $this->assertNotNull($status['grace_period_end']);
        $this->assertGreaterThan(0, $status['days_remaining']);
        $this->assertIsArray($status['warnings_sent']);
    }

    /** @test */
    public function it_returns_false_grace_period_status_for_non_canceled_subscription()
    {
        $activeSubscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => Subscription::STATUS_ACTIVE,
        ]);

        $status = $this->service->getGracePeriodStatus($activeSubscription);

        $this->assertFalse($status['in_grace_period']);
        $this->assertNull($status['grace_period_end']);
        $this->assertEquals(0, $status['days_remaining']);
        $this->assertIsArray($status['warnings_sent']);
    }

    /** @test */
    public function it_handles_grace_period_status_calculation_error()
    {
        $subscriptionWithoutEndDate = Subscription::factory()->create([
            'status' => Subscription::STATUS_CANCELED,
            'ends_at' => null,
        ]);

        $status = $this->service->getGracePeriodStatus($subscriptionWithoutEndDate);

        $this->assertFalse($status['in_grace_period']);
        $this->assertNull($status['grace_period_end']);
        $this->assertEquals(0, $status['days_remaining']);
        $this->assertArrayHasKey('error', $status);
    }
}