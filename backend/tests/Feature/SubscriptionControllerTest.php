<?php

namespace Tests\Feature;

use App\Http\Resources\SubscriptionResource;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionEvent;
use App\Models\Tenant;
use App\Models\User;
use App\Services\BillingProviders\BillingProviderFactory;
use App\Services\BillingProviders\BillingProviderInterface;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Mockery;
use Tests\TestCase;

class SubscriptionControllerTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    private User $user;
    private User $memberUser;
    private Tenant $tenant;
    private Plan $plan;
    private Subscription $subscription;
    private BillingProviderInterface $mockBillingProvider;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->memberUser = User::factory()->create();
        $this->tenant = Tenant::factory()->create();
        $this->tenant->users()->attach($this->user->id, ['role' => 'owner']);
        $this->tenant->users()->attach($this->memberUser->id, ['role' => 'member']);
        
        $this->plan = Plan::factory()->create([
            'billing_interval' => 'month',
            'price' => 29.99,
            'stripe_price_id' => 'price_test123',
        ]);

        $this->subscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'plan_id' => $this->plan->id,
            'status' => Subscription::STATUS_ACTIVE,
            'stripe_subscription_id' => 'sub_test123',
        ]);

        // Set up mock billing provider
        $this->mockBillingProvider = Mockery::mock(BillingProviderInterface::class);
        $this->instance(BillingProviderInterface::class, $this->mockBillingProvider);

        // Set current tenant in app container
        app()->instance('current_tenant', $this->tenant);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** @test */
    public function it_can_get_current_subscription()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/subscriptions');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'status',
                    'status_display',
                    'trial_ends_at',
                    'ends_at',
                    'is_trialing',
                    'is_active',
                    'is_past_due',
                    'is_canceled',
                    'is_expired',
                    'is_within_grace_period',
                    'trial_days_remaining',
                    'days_remaining',
                    'created_at',
                    'updated_at',
                    'plan' => [
                        'id',
                        'name',
                        'slug',
                        'price',
                        'formatted_price',
                        'billing_interval',
                        'features',
                        'limits',
                    ],
                    'usage' => [
                        'users',
                        'workspaces',
                        'boards',
                        'storage_mb',
                    ],
                    'limits' => [
                        'max_users',
                        'max_workspaces',
                        'max_boards',
                        'max_storage_mb',
                    ],
                ],
            ]);

        $this->assertEquals($this->subscription->id, $response->json('data.id'));
    }

    /** @test */
    public function it_returns_404_when_no_active_subscription()
    {
        $this->subscription->delete();

        $response = $this->actingAs($this->user)
            ->getJson('/api/subscriptions');

        $response->assertStatus(404)
            ->assertJson([
                'message' => 'No active subscription found',
            ]);
    }

    /** @test */
    public function it_returns_403_when_member_tries_to_view_subscription()
    {
        $response = $this->actingAs($this->memberUser)
            ->getJson('/api/subscriptions');

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'You do not have permission to view subscription information',
            ]);
    }

    /** @test */
    public function it_can_create_checkout_session()
    {
        // Delete existing subscription to allow new one
        $this->subscription->delete();

        $this->mockBillingProvider
            ->shouldReceive('createCheckoutSession')
            ->once()
            ->andReturn([
                'id' => 'cs_test123',
                'url' => 'https://checkout.stripe.com/pay/cs_test123',
            ]);

        $response = $this->actingAs($this->user)
            ->postJson('/api/subscriptions/checkout', [
                'plan_id' => $this->plan->id,
                'billing_interval' => 'month',
                'success_url' => 'https://example.com/success',
                'cancel_url' => 'https://example.com/cancel',
                'customer_email' => 'test@example.com',
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'session_id',
                    'url',
                ],
            ]);

        $this->assertEquals('cs_test123', $response->json('data.session_id'));
    }

    /** @test */
    public function it_returns_422_when_creating_checkout_session_with_invalid_data()
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/subscriptions/checkout', [
                'plan_id' => 999,
                'billing_interval' => 'invalid',
            ]);

        $response->assertStatus(422);
    }

    /** @test */
    public function it_returns_403_when_member_tries_to_create_checkout_session()
    {
        $response = $this->actingAs($this->memberUser)
            ->postJson('/api/subscriptions/checkout', [
                'plan_id' => $this->plan->id,
                'billing_interval' => 'month',
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'Only tenant owners can create subscriptions',
            ]);
    }

    /** @test */
    public function it_returns_422_when_tenant_already_has_active_subscription()
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/subscriptions/checkout', [
                'plan_id' => $this->plan->id,
                'billing_interval' => 'month',
            ]);

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'Tenant already has an active subscription',
            ]);
    }

    /** @test */
    public function it_returns_404_when_plan_not_found_for_checkout()
    {
        $this->subscription->delete();

        $response = $this->actingAs($this->user)
            ->postJson('/api/subscriptions/checkout', [
                'plan_id' => 999,
                'billing_interval' => 'month',
            ]);

        $response->assertStatus(404)
            ->assertJson([
                'message' => 'Plan not found',
            ]);
    }

    /** @test */
    public function it_can_upgrade_subscription()
    {
        $newPlan = Plan::factory()->create([
            'billing_interval' => 'month',
            'price' => 49.99,
            'stripe_price_id' => 'price_upgrade123',
        ]);

        $this->mockBillingProvider
            ->shouldReceive('updateSubscription')
            ->once()
            ->andReturn([
                'id' => 'sub_updated123',
                'status' => Subscription::STATUS_ACTIVE,
            ]);

        $response = $this->actingAs($this->user)
            ->putJson('/api/subscriptions/upgrade', [
                'plan_id' => $newPlan->id,
                'billing_interval' => 'month',
                'proration_behavior' => 'create_prorations',
                'effective_when' => 'immediately',
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'status',
                    'plan' => [
                        'id',
                        'name',
                        'slug',
                        'price',
                        'billing_interval',
                    ],
                ],
            ]);

        $this->assertEquals($newPlan->id, $response->json('data.plan.id'));
    }

    /** @test */
    public function it_returns_422_when_upgrading_to_same_plan()
    {
        $response = $this->actingAs($this->user)
            ->putJson('/api/subscriptions/upgrade', [
                'plan_id' => $this->plan->id,
                'billing_interval' => 'month',
            ]);

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'Subscription is already on this plan',
            ]);
    }

    /** @test */
    public function it_returns_403_when_member_tries_to_upgrade_subscription()
    {
        $response = $this->actingAs($this->memberUser)
            ->putJson('/api/subscriptions/upgrade', [
                'plan_id' => $this->plan->id + 1,
                'billing_interval' => 'month',
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'Only tenant owners can update subscriptions',
            ]);
    }

    /** @test */
    public function it_can_cancel_subscription_immediately()
    {
        $this->mockBillingProvider
            ->shouldReceive('cancelSubscription')
            ->once()
            ->with($this->subscription, true)
            ->andReturn([
                'id' => 'sub_canceled123',
                'status' => Subscription::STATUS_CANCELED,
            ]);

        $response = $this->actingAs($this->user)
            ->deleteJson('/api/subscriptions/cancel', [
                'immediately' => true,
                'reason' => 'Switching to another provider',
                'feedback' => 'Found a better solution',
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'status',
                    'ends_at',
                    'canceled_at',
                ],
            ]);

        $this->assertEquals(Subscription::STATUS_CANCELED, $response->json('data.status'));
    }

    /** @test */
    public function it_can_cancel_subscription_at_period_end()
    {
        $this->mockBillingProvider
            ->shouldReceive('cancelSubscription')
            ->once()
            ->with($this->subscription, false)
            ->andReturn([
                'id' => 'sub_canceled123',
                'status' => Subscription::STATUS_CANCELED,
            ]);

        $response = $this->actingAs($this->user)
            ->deleteJson('/api/subscriptions/cancel', [
                'immediately' => false,
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'status',
                    'ends_at',
                ],
            ]);
    }

    /** @test */
    public function it_returns_422_when_canceling_already_canceled_subscription()
    {
        $this->subscription->update(['status' => Subscription::STATUS_CANCELED]);

        $response = $this->actingAs($this->user)
            ->deleteJson('/api/subscriptions/cancel');

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'Subscription is already canceled',
            ]);
    }

    /** @test */
    public function it_returns_403_when_member_tries_to_cancel_subscription()
    {
        $response = $this->actingAs($this->memberUser)
            ->deleteJson('/api/subscriptions/cancel');

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'Only tenant owners can cancel subscriptions',
            ]);
    }

    /** @test */
    public function it_can_resume_canceled_subscription()
    {
        $this->subscription->update([
            'status' => Subscription::STATUS_CANCELED,
            'ends_at' => now()->addDays(7),
        ]);

        $this->mockBillingProvider
            ->shouldReceive('resumeSubscription')
            ->once()
            ->andReturn([
                'id' => 'sub_resumed123',
                'status' => Subscription::STATUS_ACTIVE,
            ]);

        $response = $this->actingAs($this->user)
            ->postJson('/api/subscriptions/resume');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'status',
                    'ends_at',
                    'resumed_at',
                ],
            ]);

        $this->assertEquals(Subscription::STATUS_ACTIVE, $response->json('data.status'));
    }

    /** @test */
    public function it_returns_404_when_no_resumable_subscription()
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/subscriptions/resume');

        $response->assertStatus(404)
            ->assertJson([
                'message' => 'No resumable subscription found',
            ]);
    }

    /** @test */
    public function it_returns_403_when_member_tries_to_resume_subscription()
    {
        $response = $this->actingAs($this->memberUser)
            ->postJson('/api/subscriptions/resume');

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'Only tenant owners can resume subscriptions',
            ]);
    }

    /** @test */
    public function it_can_create_customer_portal_session()
    {
        $this->tenant->update(['stripe_customer_id' => 'cus_test123']);

        $this->mockBillingProvider
            ->shouldReceive('createPortalSession')
            ->once()
            ->with('cus_test123', \Mockery::type('array'))
            ->andReturn([
                'id' => 'bps_test123',
                'url' => 'https://billing.stripe.com/session/bps_test123',
            ]);

        $response = $this->actingAs($this->user)
            ->postJson('/api/subscriptions/portal', [
                'return_url' => 'https://example.com/billing',
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'url',
                ],
            ]);

        $this->assertStringContains('stripe.com', $response->json('data.url'));
    }

    /** @test */
    public function it_returns_404_when_no_stripe_customer_id()
    {
        $this->tenant->update(['stripe_customer_id' => null]);

        $response = $this->actingAs($this->user)
            ->postJson('/api/subscriptions/portal');

        $response->assertStatus(404)
            ->assertJson([
                'message' => 'No billing account found',
            ]);
    }

    /** @test */
    public function it_returns_403_when_member_tries_to_access_portal()
    {
        $response = $this->actingAs($this->memberUser)
            ->postJson('/api/subscriptions/portal');

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'Only tenant owners can access billing portal',
            ]);
    }

    /** @test */
    public function it_can_get_subscription_history()
    {
        // Create some subscription events
        SubscriptionEvent::factory()->count(3)->create([
            'subscription_id' => $this->subscription->id,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/subscriptions/history');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'type',
                        'type_display',
                        'data',
                        'processed_at',
                        'created_at',
                    ],
                ],
                'meta' => [
                    'total',
                    'limit',
                    'offset',
                ],
            ]);

        $this->assertEquals(3, $response->json('meta.total'));
    }

    /** @test */
    public function it_can_filter_subscription_history_by_type()
    {
        SubscriptionEvent::factory()->create([
            'subscription_id' => $this->subscription->id,
            'type' => SubscriptionEvent::TYPE_PAYMENT_SUCCEEDED,
        ]);

        SubscriptionEvent::factory()->create([
            'subscription_id' => $this->subscription->id,
            'type' => SubscriptionEvent::TYPE_PAYMENT_FAILED,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/subscriptions/history?type=payment_succeeded');

        $response->assertStatus(200);
        
        $events = $response->json('data');
        foreach ($events as $event) {
            $this->assertEquals(SubscriptionEvent::TYPE_PAYMENT_SUCCEEDED, $event['type']);
        }
    }

    /** @test */
    public function it_returns_403_when_member_tries_to_view_history()
    {
        $response = $this->actingAs($this->memberUser)
            ->getJson('/api/subscriptions/history');

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'You do not have permission to view subscription history',
            ]);
    }

    /** @test */
    public function it_can_get_usage_statistics()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/subscriptions/usage');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'users' => [
                        'current',
                        'limit',
                        'percentage',
                        'remaining',
                    ],
                    'workspaces' => [
                        'current',
                        'limit',
                        'percentage',
                        'remaining',
                    ],
                    'boards' => [
                        'current',
                        'limit',
                        'percentage',
                        'remaining',
                    ],
                    'storage_mb' => [
                        'current',
                        'limit',
                        'percentage',
                        'remaining',
                    ],
                ],
            ]);
    }

    /** @test */
    public function it_returns_403_when_member_tries_to_view_usage()
    {
        $response = $this->actingAs($this->memberUser)
            ->getJson('/api/subscriptions/usage');

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'You do not have permission to view usage statistics',
            ]);
    }

    /** @test */
    public function it_returns_404_when_no_active_subscription_for_usage()
    {
        $this->subscription->delete();

        $response = $this->actingAs($this->user)
            ->getJson('/api/subscriptions/usage');

        $response->assertStatus(404)
            ->assertJson([
                'message' => 'No active subscription found',
            ]);
    }

    /** @test */
    public function it_logs_subscription_operations()
    {
        Log::shouldReceive('info')->once()->with(
            'Subscription updated',
            \Mockery::type('array')
        );

        $newPlan = Plan::factory()->create([
            'billing_interval' => 'month',
            'stripe_price_id' => 'price_upgrade123',
        ]);

        $this->mockBillingProvider
            ->shouldReceive('updateSubscription')
            ->once()
            ->andReturn([
                'id' => 'sub_updated123',
                'status' => Subscription::STATUS_ACTIVE,
            ]);

        $this->actingAs($this->user)
            ->putJson('/api/subscriptions/upgrade', [
                'plan_id' => $newPlan->id,
                'billing_interval' => 'month',
            ]);
    }
}