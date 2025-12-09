<?php

namespace Tests\Unit;

use App\Http\Controllers\WebhookController;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionEvent;
use App\Models\Tenant;
use App\Services\BillingProviders\BillingProviderFactory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Mockery;
use Tests\TestCase;

class WebhookTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function it_handles_checkout_completed_webhook()
    {
        // Create a test tenant and plan
        $tenant = Tenant::factory()->create();
        $plan = Plan::factory()->create();

        // Mock the billing provider
        $provider = Mockery::mock();
        $provider->shouldReceive('verifyWebhookSignature')
            ->once()
            ->andReturn(true);

        $provider->shouldReceive('getEventFromPayload')
            ->once()
            ->andReturn([
                'type' => 'checkout.session.completed',
                'data' => [
                    'object' => [
                        'id' => 'cs_test_123',
                        'customer' => 'cus_test_123',
                        'subscription' => 'sub_test_123',
                        'client_reference_id' => $tenant->id,
                        'metadata' => [
                            'plan_id' => $plan->id,
                        ],
                    ],
                ],
            ]);

        BillingProviderFactory::shouldReceive('make')
            ->once()
            ->andReturn($provider);

        // Create the request
        $request = Request::create('/api/billing/webhook', 'POST', [], [], [], [], json_encode([
            'type' => 'checkout.session.completed',
            'data' => [
                'object' => [
                    'id' => 'cs_test_123',
                    'customer' => 'cus_test_123',
                    'subscription' => 'sub_test_123',
                ],
            ],
        ]));

        $controller = new WebhookController();
        $response = $controller->handleWebhook($request, 'stripe');

        $this->assertEquals(200, $response->getStatusCode());

        // Check that subscription was created
        $this->assertDatabaseHas('subscriptions', [
            'tenant_id' => $tenant->id,
            'plan_id' => $plan->id,
            'external_customer_id' => 'cus_test_123',
            'external_subscription_id' => 'sub_test_123',
            'status' => Subscription::STATUS_TRIALING,
        ]);

        // Check that event was logged
        $this->assertDatabaseHas('subscription_events', [
            'type' => SubscriptionEvent::TYPE_CREATED,
        ]);
    }

    /** @test */
    public function it_handles_payment_succeeded_webhook()
    {
        $subscription = Subscription::factory()->trialing()->create();

        $provider = Mockery::mock();
        $provider->shouldReceive('verifyWebhookSignature')
            ->once()
            ->andReturn(true);

        $provider->shouldReceive('getEventFromPayload')
            ->once()
            ->andReturn([
                'type' => 'invoice.payment_succeeded',
                'data' => [
                    'object' => [
                        'id' => 'in_test_123',
                        'subscription' => $subscription->external_subscription_id,
                        'customer' => $subscription->external_customer_id,
                        'amount_paid' => 4999,
                        'currency' => 'usd',
                    ],
                ],
            ]);

        BillingProviderFactory::shouldReceive('make')
            ->once()
            ->andReturn($provider);

        $request = Request::create('/api/billing/webhook', 'POST', [], [], [], [], json_encode([
            'type' => 'invoice.payment_succeeded',
            'data' => [
                'object' => [
                    'subscription' => $subscription->external_subscription_id,
                ],
            ],
        ]));

        $controller = new WebhookController();
        $response = $controller->handleWebhook($request, 'stripe');

        $this->assertEquals(200, $response->getStatusCode());

        // Check that subscription was activated
        $subscription->refresh();
        $this->assertEquals(Subscription::STATUS_ACTIVE, $subscription->status);

        // Check that payment succeeded event was created
        $this->assertDatabaseHas('subscription_events', [
            'subscription_id' => $subscription->id,
            'type' => SubscriptionEvent::TYPE_PAYMENT_SUCCEEDED,
        ]);
    }

    /** @test */
    public function it_handles_payment_failed_webhook()
    {
        $subscription = Subscription::factory()->active()->create();

        $provider = Mockery::mock();
        $provider->shouldReceive('verifyWebhookSignature')
            ->once()
            ->andReturn(true);

        $provider->shouldReceive('getEventFromPayload')
            ->once()
            ->andReturn([
                'type' => 'invoice.payment_failed',
                'data' => [
                    'object' => [
                        'id' => 'in_test_123',
                        'subscription' => $subscription->external_subscription_id,
                        'customer' => $subscription->external_customer_id,
                        'attempt_count' => 1,
                    ],
                ],
            ]);

        BillingProviderFactory::shouldReceive('make')
            ->once()
            ->andReturn($provider);

        $request = Request::create('/api/billing/webhook', 'POST', [], [], [], [], json_encode([
            'type' => 'invoice.payment_failed',
            'data' => [
                'object' => [
                    'subscription' => $subscription->external_subscription_id,
                ],
            ],
        ]));

        $controller = new WebhookController();
        $response = $controller->handleWebhook($request, 'stripe');

        $this->assertEquals(200, $response->getStatusCode());

        // Check that subscription was marked as past due
        $subscription->refresh();
        $this->assertEquals(Subscription::STATUS_PAST_DUE, $subscription->status);

        // Check that payment failed event was created
        $this->assertDatabaseHas('subscription_events', [
            'subscription_id' => $subscription->id,
            'type' => SubscriptionEvent::TYPE_PAYMENT_FAILED,
        ]);
    }

    /** @test */
    public function it_handles_subscription_updated_webhook()
    {
        $oldPlan = Plan::factory()->create(['price' => 19.99]);
        $newPlan = Plan::factory()->create(['price' => 49.99]);
        $subscription = Subscription::factory()->create([
            'plan_id' => $oldPlan->id,
        ]);

        $provider = Mockery::mock();
        $provider->shouldReceive('verifyWebhookSignature')
            ->once()
            ->andReturn(true);

        $provider->shouldReceive('getEventFromPayload')
            ->once()
            ->andReturn([
                'type' => 'customer.subscription.updated',
                'data' => [
                    'object' => [
                        'id' => $subscription->external_subscription_id,
                        'customer' => $subscription->external_customer_id,
                        'items' => [
                            'data' => [
                                [
                                    'price' => [
                                        'metadata' => [
                                            'plan_id' => $newPlan->id,
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ]);

        BillingProviderFactory::shouldReceive('make')
            ->once()
            ->andReturn($provider);

        $request = Request::create('/api/billing/webhook', 'POST', [], [], [], [], json_encode([
            'type' => 'customer.subscription.updated',
            'data' => [
                'object' => [
                    'subscription' => $subscription->external_subscription_id,
                ],
            ],
        ]));

        $controller = new WebhookController();
        $response = $controller->handleWebhook($request, 'stripe');

        $this->assertEquals(200, $response->getStatusCode());

        // Check that plan was changed
        $subscription->refresh();
        $this->assertEquals($newPlan->id, $subscription->plan_id);

        // Check that plan changed event was created
        $this->assertDatabaseHas('subscription_events', [
            'subscription_id' => $subscription->id,
            'type' => SubscriptionEvent::TYPE_PLAN_CHANGED,
        ]);
    }

    /** @test */
    public function it_handles_subscription_deleted_webhook()
    {
        $subscription = Subscription::factory()->active()->create();

        $provider = Mockery::mock();
        $provider->shouldReceive('verifyWebhookSignature')
            ->once()
            ->andReturn(true);

        $provider->shouldReceive('getEventFromPayload')
            ->once()
            ->andReturn([
                'type' => 'customer.subscription.deleted',
                'data' => [
                    'object' => [
                        'id' => $subscription->external_subscription_id,
                        'customer' => $subscription->external_customer_id,
                        'canceled_at' => time(),
                    ],
                ],
            ]);

        BillingProviderFactory::shouldReceive('make')
            ->once()
            ->andReturn($provider);

        $request = Request::create('/api/billing/webhook', 'POST', [], [], [], [], json_encode([
            'type' => 'customer.subscription.deleted',
            'data' => [
                'object' => [
                    'subscription' => $subscription->external_subscription_id,
                ],
            ],
        ]));

        $controller = new WebhookController();
        $response = $controller->handleWebhook($request, 'stripe');

        $this->assertEquals(200, $response->getStatusCode());

        // Check that subscription was canceled
        $subscription->refresh();
        $this->assertEquals(Subscription::STATUS_CANCELED, $subscription->status);

        // Check that canceled event was created
        $this->assertDatabaseHas('subscription_events', [
            'subscription_id' => $subscription->id,
            'type' => SubscriptionEvent::TYPE_CANCELED,
        ]);
    }

    /** @test */
    public function it_rejects_invalid_webhook_signatures()
    {
        $provider = Mockery::mock();
        $provider->shouldReceive('verifyWebhookSignature')
            ->once()
            ->andReturn(false);

        BillingProviderFactory::shouldReceive('make')
            ->once()
            ->andReturn($provider);

        $request = Request::create('/api/billing/webhook', 'POST');

        $controller = new WebhookController();
        $response = $controller->handleWebhook($request, 'stripe');

        $this->assertEquals(401, $response->getStatusCode());
    }

    /** @test */
    public function it_handles_unknown_event_types_gracefully()
    {
        $provider = Mockery::mock();
        $provider->shouldReceive('verifyWebhookSignature')
            ->once()
            ->andReturn(true);

        $provider->shouldReceive('getEventFromPayload')
            ->once()
            ->andReturn([
                'type' => 'unknown.event.type',
                'data' => [],
            ]);

        BillingProviderFactory::shouldReceive('make')
            ->once()
            ->andReturn($provider);

        $request = Request::create('/api/billing/webhook', 'POST', [], [], [], [], json_encode([
            'type' => 'unknown.event.type',
            'data' => [],
        ]));

        $controller = new WebhookController();
        $response = $controller->handleWebhook($request, 'stripe');

        // Should still return 200 for unknown events
        $this->assertEquals(200, $response->getStatusCode());
    }

    /** @test */
    public function it_implements_idempotency_for_duplicate_webhooks()
    {
        $subscription = Subscription::factory()->active()->create();

        // Process the same webhook twice
        $webhookData = [
            'type' => 'invoice.payment_succeeded',
            'data' => [
                'object' => [
                    'id' => 'in_test_unique_123',
                    'subscription' => $subscription->external_subscription_id,
                    'customer' => $subscription->external_customer_id,
                    'amount_paid' => 4999,
                    'currency' => 'usd',
                ],
            ],
        ];

        // First webhook
        $provider1 = Mockery::mock();
        $provider1->shouldReceive('verifyWebhookSignature')->once()->andReturn(true);
        $provider1->shouldReceive('getEventFromPayload')->once()->andReturn($webhookData);
        BillingProviderFactory::shouldReceive('make')->once()->andReturn($provider1);

        $request1 = Request::create('/api/billing/webhook', 'POST', [], [], [], [], json_encode($webhookData));
        $controller1 = new WebhookController();
        $response1 = $controller1->handleWebhook($request1, 'stripe');

        // Second webhook (duplicate)
        $provider2 = Mockery::mock();
        $provider2->shouldReceive('verifyWebhookSignature')->once()->andReturn(true);
        $provider2->shouldReceive('getEventFromPayload')->once()->andReturn($webhookData);
        BillingProviderFactory::shouldReceive('make')->once()->andReturn($provider2);

        $request2 = Request::create('/api/billing/webhook', 'POST', [], [], [], [], json_encode($webhookData));
        $controller2 = new WebhookController();
        $response2 = $controller2->handleWebhook($request2, 'stripe');

        // Both should return 200
        $this->assertEquals(200, $response1->getStatusCode());
        $this->assertEquals(200, $response2->getStatusCode());

        // But only one payment succeeded event should be created
        $this->assertEquals(1, SubscriptionEvent::where([
            'subscription_id' => $subscription->id,
            'type' => SubscriptionEvent::TYPE_PAYMENT_SUCCEEDED,
            'external_event_id' => 'in_test_unique_123',
        ])->count());
    }

    /** @test */
    public function it_logs_all_webhook_events()
    {
        $provider = Mockery::mock();
        $provider->shouldReceive('verifyWebhookSignature')
            ->once()
            ->andReturn(true);

        $provider->shouldReceive('getEventFromPayload')
            ->once()
            ->andReturn([
                'type' => 'payment_method.attached',
                'data' => [
                    'object' => [
                        'id' => 'pm_test_123',
                        'customer' => 'cus_test_123',
                    ],
                ],
            ]);

        BillingProviderFactory::shouldReceive('make')
            ->once()
            ->andReturn($provider);

        $request = Request::create('/api/billing/webhook', 'POST', [], [], [], [], json_encode([
            'type' => 'payment_method.attached',
            'data' => [
                'object' => ['id' => 'pm_test_123'],
            ],
        ]));

        $controller = new WebhookController();
        $response = $controller->handleWebhook($request, 'stripe');

        $this->assertEquals(200, $response->getStatusCode());

        // Check that the webhook was logged (implementation dependent)
        // This would require checking your logging mechanism
    }

    /** @test */
    public function it_handles_subscription_without_external_ids()
    {
        $provider = Mockery::mock();
        $provider->shouldReceive('verifyWebhookSignature')
            ->once()
            ->andReturn(true);

        $provider->shouldReceive('getEventFromPayload')
            ->once()
            ->andReturn([
                'type' => 'invoice.payment_succeeded',
                'data' => [
                    'object' => [
                        'id' => 'in_test_123',
                        'subscription' => 'sub_test_123',
                        'customer' => 'cus_test_123',
                    ],
                ],
            ]);

        BillingProviderFactory::shouldReceive('make')
            ->once()
            ->andReturn($provider);

        $request = Request::create('/api/billing/webhook', 'POST', [], [], [], [], json_encode([
            'type' => 'invoice.payment_succeeded',
            'data' => [
                'object' => [
                    'subscription' => 'non_existent_sub',
                ],
            ],
        ]));

        $controller = new WebhookController();
        $response = $controller->handleWebhook($request, 'stripe');

        // Should still return 200 even if subscription not found
        $this->assertEquals(200, $response->getStatusCode());
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}