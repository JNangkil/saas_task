<?php

namespace Tests\Feature;

use App\Jobs\ProcessStripeWebhook;
use App\Models\Subscription;
use App\Services\BillingProviders\BillingProviderFactory;
use App\Services\BillingProviders\BillingProviderInterface;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Mockery;
use Tests\TestCase;

class WebhookControllerTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    private BillingProviderInterface $mockBillingProvider;
    private string $validPayload;
    private string $validSignature;

    protected function setUp(): void
    {
        parent::setUp();

        $this->mockBillingProvider = Mockery::mock(BillingProviderInterface::class);
        $this->instance(BillingProviderInterface::class, $this->mockBillingProvider);

        // Sample valid webhook payload
        $this->validPayload = json_encode([
            'id' => 'evt_test123',
            'type' => 'invoice.payment_succeeded',
            'object' => 'event',
            'data' => [
                'object' => [
                    'id' => 'in_test123',
                    'customer' => 'cus_test123',
                    'subscription' => 'sub_test123',
                ],
            ],
        ]);

        $this->validSignature = 't=1234567890,v1=test_signature';
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** @test */
    public function it_handles_valid_stripe_webhook()
    {
        // Mock signature verification
        $this->mockBillingProvider
            ->shouldReceive('verifyWebhookSignature')
            ->once()
            ->with($this->validPayload, $this->validSignature)
            ->andReturn(true);

        // Mock job dispatch
        Bus::fake();

        $response = $this->postJson('/webhooks/stripe', [], [
            'Stripe-Signature' => $this->validSignature,
        ], [], [], [], $this->validPayload);

        $response->assertStatus(202)
            ->assertJson([
                'message' => 'Webhook received and queued for processing',
            ]);

        Bus::assertDispatched(ProcessStripeWebhook::class, function ($job) {
            $event = $job->getEvent();
            return $event['id'] === 'evt_test123' && $event['type'] === 'invoice.payment_succeeded';
        });
    }

    /** @test */
    public function it_rejects_webhook_with_invalid_signature()
    {
        $this->mockBillingProvider
            ->shouldReceive('verifyWebhookSignature')
            ->once()
            ->with($this->validPayload, 'invalid_signature')
            ->andReturn(false);

        Log::shouldReceive('error')->once()->with(
            'Invalid Stripe webhook signature',
            \Mockery::type('array')
        );

        $response = $this->postJson('/webhooks/stripe', [], [
            'Stripe-Signature' => 'invalid_signature',
        ], [], [], [], $this->validPayload);

        $response->assertStatus(401)
            ->assertJson([
                'error' => 'Invalid signature',
            ]);
    }

    /** @test */
    public function it_rejects_webhook_with_malformed_payload()
    {
        $this->mockBillingProvider
            ->shouldReceive('verifyWebhookSignature')
            ->once()
            ->andReturn(true);

        Log::shouldReceive('error')->once()->with(
            'Malformed Stripe webhook payload',
            \Mockery::type('array')
        );

        $malformedPayload = '{"invalid": json}';

        $response = $this->postJson('/webhooks/stripe', [], [
            'Stripe-Signature' => $this->validSignature,
        ], [], [], [], $malformedPayload);

        $response->assertStatus(400)
            ->assertJson([
                'error' => 'Malformed payload',
            ]);
    }

    /** @test */
    public function it_rejects_webhook_missing_required_fields()
    {
        $this->mockBillingProvider
            ->shouldReceive('verifyWebhookSignature')
            ->once()
            ->andReturn(true);

        Log::shouldReceive('error')->once()->with(
            'Malformed Stripe webhook payload',
            \Mockery::type('array')
        );

        $incompletePayload = json_encode([
            'type' => 'invoice.payment_succeeded',
            // Missing 'id' field
        ]);

        $response = $this->postJson('/webhooks/stripe', [], [
            'Stripe-Signature' => $this->validSignature,
        ], [], [], [], $incompletePayload);

        $response->assertStatus(400)
            ->assertJson([
                'error' => 'Malformed payload',
            ]);
    }

    /** @test */
    public function it_returns_200_for_already_processed_events()
    {
        // Insert a processed event record
        DB::table('processed_webhook_events')->insert([
            'event_id' => 'evt_test123',
            'provider' => 'stripe',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->mockBillingProvider
            ->shouldReceive('verifyWebhookSignature')
            ->once()
            ->andReturn(true);

        Log::shouldReceive('info')->once()->with(
            'Stripe webhook event already processed',
            \Mockery::type('array')
        );

        $response = $this->postJson('/webhooks/stripe', [], [
            'Stripe-Signature' => $this->validSignature,
        ], [], [], [], $this->validPayload);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Event already processed',
            ]);
    }

    /** @test */
    public function it_handles_job_dispatch_failure()
    {
        $this->mockBillingProvider
            ->shouldReceive('verifyWebhookSignature')
            ->once()
            ->andReturn(true);

        // Mock job dispatch to throw an exception
        Bus::fake();
        Bus::shouldReceive('dispatch')
            ->once()
            ->andThrow(new \Exception('Job dispatch failed'));

        Log::shouldReceive('error')->once()->with(
            'Failed to process Stripe webhook event',
            \Mockery::type('array')
        );

        $response = $this->postJson('/webhooks/stripe', [], [
            'Stripe-Signature' => $this->validSignature,
        ], [], [], [], $this->validPayload);

        $response->assertStatus(500)
            ->assertJson([
                'error' => 'Webhook processing failed',
                'message' => 'Job dispatch failed',
            ]);
    }

    /** @test */
    public function it_handles_different_webhook_event_types()
    {
        $paymentFailedPayload = json_encode([
            'id' => 'evt_payment_failed',
            'type' => 'invoice.payment_failed',
            'object' => 'event',
            'data' => [
                'object' => [
                    'id' => 'in_failed123',
                    'customer' => 'cus_test123',
                    'subscription' => 'sub_test123',
                ],
            ],
        ]);

        $this->mockBillingProvider
            ->shouldReceive('verifyWebhookSignature')
            ->once()
            ->andReturn(true);

        Bus::fake();

        $response = $this->postJson('/webhooks/stripe', [], [
            'Stripe-Signature' => $this->validSignature,
        ], [], [], [], $paymentFailedPayload);

        $response->assertStatus(202);

        Bus::assertDispatched(ProcessStripeWebhook::class, function ($job) {
            $event = $job->getEvent();
            return $event['id'] === 'evt_payment_failed' && $event['type'] === 'invoice.payment_failed';
        });
    }

    /** @test */
    public function it_handles_customer_subscription_created_event()
    {
        $subscriptionCreatedPayload = json_encode([
            'id' => 'evt_sub_created',
            'type' => 'customer.subscription.created',
            'object' => 'event',
            'data' => [
                'object' => [
                    'id' => 'sub_new123',
                    'customer' => 'cus_test123',
                    'status' => 'active',
                ],
            ],
        ]);

        $this->mockBillingProvider
            ->shouldReceive('verifyWebhookSignature')
            ->once()
            ->andReturn(true);

        Bus::fake();

        $response = $this->postJson('/webhooks/stripe', [], [
            'Stripe-Signature' => $this->validSignature,
        ], [], [], [], $subscriptionCreatedPayload);

        $response->assertStatus(202);

        Bus::assertDispatched(ProcessStripeWebhook::class, function ($job) {
            $event = $job->getEvent();
            return $event['id'] === 'evt_sub_created' && $event['type'] === 'customer.subscription.created';
        });
    }

    /** @test */
    public function it_handles_customer_subscription_deleted_event()
    {
        $subscriptionDeletedPayload = json_encode([
            'id' => 'evt_sub_deleted',
            'type' => 'customer.subscription.deleted',
            'object' => 'event',
            'data' => [
                'object' => [
                    'id' => 'sub_deleted123',
                    'customer' => 'cus_test123',
                    'status' => 'canceled',
                ],
            ],
        ]);

        $this->mockBillingProvider
            ->shouldReceive('verifyWebhookSignature')
            ->once()
            ->andReturn(true);

        Bus::fake();

        $response = $this->postJson('/webhooks/stripe', [], [
            'Stripe-Signature' => $this->validSignature,
        ], [], [], [], $subscriptionDeletedPayload);

        $response->assertStatus(202);

        Bus::assertDispatched(ProcessStripeWebhook::class, function ($job) {
            $event = $job->getEvent();
            return $event['id'] === 'evt_sub_deleted' && $event['type'] === 'customer.subscription.deleted';
        });
    }

    /** @test */
    public function it_logs_successful_webhook_processing()
    {
        $this->mockBillingProvider
            ->shouldReceive('verifyWebhookSignature')
            ->once()
            ->andReturn(true);

        Bus::fake();

        Log::shouldReceive('info')->once()->with(
            'Processing Stripe webhook event',
            \Mockery::type('array')
        );

        Log::shouldReceive('info')->once()->with(
            'Stripe webhook event dispatched for processing',
            \Mockery::type('array')
        );

        $response = $this->postJson('/webhooks/stripe', [], [
            'Stripe-Signature' => $this->validSignature,
        ], [], [], [], $this->validPayload);

        $response->assertStatus(202);
    }

    /** @test */
    public function it_handles_large_webhook_payloads()
    {
        $largePayload = json_encode([
            'id' => 'evt_large123',
            'type' => 'invoice.payment_succeeded',
            'object' => 'event',
            'data' => [
                'object' => [
                    'id' => 'in_large123',
                    'customer' => 'cus_test123',
                    'subscription' => 'sub_test123',
                    'lines' => array_fill(0, 100, [
                        'id' => 'il_test123',
                        'amount' => 1000,
                    ]),
                ],
            ],
        ]);

        $this->mockBillingProvider
            ->shouldReceive('verifyWebhookSignature')
            ->once()
            ->andReturn(true);

        Bus::fake();

        $response = $this->postJson('/webhooks/stripe', [], [
            'Stripe-Signature' => $this->validSignature,
        ], [], [], [], $largePayload);

        $response->assertStatus(202);

        Bus::assertDispatched(ProcessStripeWebhook::class);
    }

    /** @test */
    public function it_returns_correct_status_code_for_different_exceptions()
    {
        $this->mockBillingProvider
            ->shouldReceive('verifyWebhookSignature')
            ->once()
            ->andReturn(true);

        // Mock job dispatch to throw an InvalidArgumentException (client error)
        Bus::shouldReceive('dispatch')
            ->once()
            ->andThrow(new \InvalidArgumentException('Invalid argument'));

        Log::shouldReceive('error')->once();

        $response = $this->postJson('/webhooks/stripe', [], [
            'Stripe-Signature' => $this->validSignature,
        ], [], [], [], $this->validPayload);

        $response->assertStatus(400);
    }

    /** @test */
    public function it_prevents_duplicate_processing_across_requests()
    {
        $this->mockBillingProvider
            ->shouldReceive('verifyWebhookSignature')
            ->twice()
            ->andReturn(true);

        Bus::fake();

        // First request
        $response1 = $this->postJson('/webhooks/stripe', [], [
            'Stripe-Signature' => $this->validSignature,
        ], [], [], [], $this->validPayload);

        $response1->assertStatus(202);
        Bus::assertDispatchedTimes(ProcessStripeWebhook::class, 1);

        // Second request with same event
        $response2 = $this->postJson('/webhooks/stripe', [], [
            'Stripe-Signature' => $this->validSignature,
        ], [], [], [], $this->validPayload);

        $response2->assertStatus(200);
        Bus::assertDispatchedTimes(ProcessStripeWebhook::class, 1); // Still only once
    }

    /** @test */
    public function it_handles_webhook_without_signature_header()
    {
        Log::shouldReceive('error')->once()->with(
            'Invalid Stripe webhook signature',
            \Mockery::type('array')
        );

        $response = $this->postJson('/webhooks/stripe', [], [], [], [], [], $this->validPayload);

        $response->assertStatus(401)
            ->assertJson([
                'error' => 'Invalid signature',
            ]);
    }
}