<?php

namespace Tests\Unit;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Services\BillingProviders\StripeBillingProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Mockery;
use Stripe\Customer as StripeCustomer;
use Stripe\Exception\ApiErrorException;
use Stripe\Exception\CardException;
use Stripe\Exception\InvalidRequestException;
use Stripe\Subscription as StripeSubscription;
use Stripe\Checkout\Session as StripeCheckoutSession;
use Stripe\BillingPortal\Session as StripePortalSession;
use Tests\TestCase;

class StripeBillingProviderTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    private StripeBillingProvider $provider;
    private Tenant $tenant;
    private Plan $plan;
    private Subscription $subscription;

    protected function setUp(): void
    {
        parent::setUp();

        // Set up Stripe configuration
        Config::set('services.stripe.secret', 'sk_test_123');
        Config::set('services.stripe.api_version', '2023-10-16');
        Config::set('services.stripe.webhook_secret', 'whsec_test_123');

        $this->provider = new StripeBillingProvider();
        
        $this->tenant = Tenant::factory()->create([
            'name' => 'Test Tenant',
            'billing_email' => 'billing@test.com',
            'stripe_customer_id' => 'cus_test123',
        ]);
        
        $this->plan = Plan::factory()->create([
            'stripe_price_id' => 'price_test123',
            'trial_days' => 14,
        ]);

        $this->subscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'plan_id' => $this->plan->id,
            'stripe_subscription_id' => 'sub_test123',
        ]);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** @test */
    public function it_creates_customer_successfully()
    {
        $mockCustomer = Mockery::mock(StripeCustomer::class);
        $mockCustomer->shouldReceive('toArray')->andReturn([
            'id' => 'cus_new123',
            'email' => 'billing@test.com',
        ]);

        $mockCustomer->shouldReceive('create')->once()->with([
            'name' => $this->tenant->name,
            'email' => $this->tenant->billing_email,
            'metadata' => [
                'tenant_id' => $this->tenant->id,
                'tenant_slug' => $this->tenant->slug,
            ],
        ])->andReturn($mockCustomer);

        Mockery::mock('alias:Stripe\Customer')
            ->shouldReceive('create')
            ->andReturn($mockCustomer);

        $result = $this->provider->createCustomer($this->tenant, []);

        $this->assertEquals('cus_new123', $result['id']);
        $this->assertEquals('billing@test.com', $result['email']);
    }

    /** @test */
    public function it_creates_customer_with_additional_data()
    {
        $mockCustomer = Mockery::mock(StripeCustomer::class);
        $mockCustomer->shouldReceive('toArray')->andReturn([
            'id' => 'cus_new123',
        ]);

        $mockCustomer->shouldReceive('create')->once()->with([
            'name' => $this->tenant->name,
            'email' => $this->tenant->billing_email,
            'metadata' => [
                'tenant_id' => $this->tenant->id,
                'tenant_slug' => $this->tenant->slug,
            ],
            'phone' => '+1234567890',
            'address' => [
                'line1' => '123 Test St',
            ],
        ])->andReturn($mockCustomer);

        Mockery::mock('alias:Stripe\Customer')
            ->shouldReceive('create')
            ->andReturn($mockCustomer);

        $result = $this->provider->createCustomer($this->tenant, [
            'phone' => '+1234567890',
            'address' => [
                'line1' => '123 Test St',
            ],
        ]);

        $this->assertEquals('cus_new123', $result['id']);
    }

    /** @test */
    public function it_handles_customer_creation_failure()
    {
        $exception = new ApiErrorException('Customer creation failed');

        Mockery::mock('alias:Stripe\Customer')
            ->shouldReceive('create')
            ->andThrow($exception);

        Log::shouldReceive('error')->once();

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Failed to create customer: Customer creation failed');

        $this->provider->createCustomer($this->tenant, []);
    }

    /** @test */
    public function it_creates_subscription_successfully()
    {
        $mockSubscription = Mockery::mock(StripeSubscription::class);
        $mockSubscription->shouldReceive('toArray')->andReturn([
            'id' => 'sub_new123',
            'status' => 'active',
        ]);

        $mockSubscription->shouldReceive('create')->once()->with([
            'customer' => $this->tenant->stripe_customer_id,
            'items' => [
                [
                    'price' => $this->plan->stripe_price_id,
                    'quantity' => 1,
                ],
            ],
            'payment_behavior' => 'default_incomplete',
            'payment_settings' => [
                'save_default_payment_method' => 'on_subscription',
            ],
            'expand' => ['latest_invoice.payment_intent'],
            'metadata' => [
                'tenant_id' => $this->tenant->id,
                'plan_id' => $this->plan->id,
            ],
            'trial_period_days' => 14,
        ])->andReturn($mockSubscription);

        Mockery::mock('alias:Stripe\Subscription')
            ->shouldReceive('create')
            ->andReturn($mockSubscription);

        $result = $this->provider->createSubscription($this->tenant, $this->plan, 'pm_test123');

        $this->assertEquals('sub_new123', $result['id']);
        $this->assertEquals('active', $result['status']);
    }

    /** @test */
    public function it_creates_customer_when_missing_for_subscription()
    {
        $tenantWithoutCustomer = Tenant::factory()->create([
            'stripe_customer_id' => null,
        ]);

        $mockCustomer = Mockery::mock(StripeCustomer::class);
        $mockCustomer->shouldReceive('toArray')->andReturn(['id' => 'cus_new123']);

        $mockSubscription = Mockery::mock(StripeSubscription::class);
        $mockSubscription->shouldReceive('toArray')->andReturn(['id' => 'sub_new123']);

        Mockery::mock('alias:Stripe\Customer')
            ->shouldReceive('create')
            ->andReturn($mockCustomer);

        Mockery::mock('alias:Stripe\Subscription')
            ->shouldReceive('create')
            ->andReturn($mockSubscription);

        $this->provider->createSubscription($tenantWithoutCustomer, $this->plan, 'pm_test123');

        $this->assertEquals('cus_new123', $tenantWithoutCustomer->fresh()->stripe_customer_id);
    }

    /** @test */
    public function it_cancels_subscription_immediately()
    {
        $mockSubscription = Mockery::mock(StripeSubscription::class);
        $mockSubscription->shouldReceive('toArray')->andReturn([
            'id' => 'sub_test123',
            'status' => 'canceled',
        ]);

        $mockRetrievedSubscription = Mockery::mock(StripeSubscription::class);
        $mockRetrievedSubscription->shouldReceive('cancel')->once()->withNoArgs()->andReturn($mockSubscription);

        Mockery::mock('alias:Stripe\Subscription')
            ->shouldReceive('retrieve')
            ->with('sub_test123')
            ->andReturn($mockRetrievedSubscription);

        $result = $this->provider->cancelSubscription($this->subscription, true);

        $this->assertEquals('canceled', $result['status']);
    }

    /** @test */
    public function it_cancels_subscription_at_period_end()
    {
        $mockSubscription = Mockery::mock(StripeSubscription::class);
        $mockSubscription->shouldReceive('toArray')->andReturn([
            'id' => 'sub_test123',
            'status' => 'active',
            'cancel_at_period_end' => true,
        ]);

        $mockRetrievedSubscription = Mockery::mock(StripeSubscription::class);
        $mockRetrievedSubscription->shouldReceive('cancel')->once()->with(['at_period_end' => true])->andReturn($mockSubscription);

        Mockery::mock('alias:Stripe\Subscription')
            ->shouldReceive('retrieve')
            ->andReturn($mockRetrievedSubscription);

        $result = $this->provider->cancelSubscription($this->subscription, false);

        $this->assertEquals('active', $result['status']);
        $this->assertTrue($result['cancel_at_period_end']);
    }

    /** @test */
    public function it_updates_subscription_with_proration()
    {
        $newPlan = Plan::factory()->create(['stripe_price_id' => 'price_upgrade123']);

        $mockSubscription = Mockery::mock(StripeSubscription::class);
        $mockSubscription->shouldReceive('toArray')->andReturn([
            'id' => 'sub_test123',
            'status' => 'active',
        ]);

        $mockRetrievedSubscription = Mockery::mock(StripeSubscription::class);
        $mockRetrievedSubscription->items = (object) [
            'data' => [
                (object) ['id' => 'si_test123'],
            ],
        ];

        $mockRetrievedSubscription->shouldReceive('update')
            ->once()
            ->with('sub_test123', [
                'items' => [
                    [
                        'id' => 'si_test123',
                        'price' => 'price_upgrade123',
                    ],
                ],
                'metadata' => [
                    'tenant_id' => $this->subscription->tenant_id,
                    'plan_id' => $newPlan->id,
                ],
                'proration_behavior' => 'create_prorations',
            ])
            ->andReturn($mockSubscription);

        Mockery::mock('alias:Stripe\Subscription')
            ->shouldReceive('retrieve')
            ->andReturn($mockRetrievedSubscription);

        $result = $this->provider->updateSubscription($this->subscription, $newPlan, [
            'proration_behavior' => 'create_prorations',
        ]);

        $this->assertEquals('active', $result['status']);
    }

    /** @test */
    public function it_resumes_subscription()
    {
        $mockSubscription = Mockery::mock(StripeSubscription::class);
        $mockSubscription->pause_collection = (object) ['behavior' => 'void'];
        $mockSubscription->shouldReceive('toArray')->andReturn([
            'id' => 'sub_test123',
            'status' => 'active',
        ]);

        $mockRetrievedSubscription = Mockery::mock(StripeSubscription::class);
        $mockRetrievedSubscription->pause_collection = (object) ['behavior' => 'void'];
        $mockRetrievedSubscription->shouldReceive('update')
            ->once()
            ->with('sub_test123', ['pause_collection' => null])
            ->andReturn($mockSubscription);

        Mockery::mock('alias:Stripe\Subscription')
            ->shouldReceive('retrieve')
            ->andReturn($mockRetrievedSubscription);

        $result = $this->provider->resumeSubscription($this->subscription);

        $this->assertEquals('active', $result['status']);
    }

    /** @test */
    public function it_returns_existing_subscription_when_not_paused()
    {
        $mockSubscription = Mockery::mock(StripeSubscription::class);
        $mockSubscription->pause_collection = null;
        $mockSubscription->shouldReceive('toArray')->andReturn([
            'id' => 'sub_test123',
            'status' => 'active',
        ]);

        Mockery::mock('alias:Stripe\Subscription')
            ->shouldReceive('retrieve')
            ->andReturn($mockSubscription);

        $result = $this->provider->resumeSubscription($this->subscription);

        $this->assertEquals('active', $result['status']);
    }

    /** @test */
    public function it_gets_customer_with_subscriptions()
    {
        $mockCustomer = Mockery::mock(StripeCustomer::class);
        $mockCustomer->shouldReceive('toArray')->andReturn([
            'id' => 'cus_test123',
            'email' => 'billing@test.com',
            'subscriptions' => [
                'data' => [
                    ['id' => 'sub_test123'],
                ],
            ],
        ]);

        Mockery::mock('alias:Stripe\Customer')
            ->shouldReceive('retrieve')
            ->with('cus_test123', ['expand' => ['subscriptions']])
            ->andReturn($mockCustomer);

        $result = $this->provider->getCustomer('cus_test123');

        $this->assertEquals('cus_test123', $result['id']);
        $this->assertArrayHasKey('subscriptions', $result);
    }

    /** @test */
    public function it_gets_subscription_with_expansions()
    {
        $mockSubscription = Mockery::mock(StripeSubscription::class);
        $mockSubscription->shouldReceive('toArray')->andReturn([
            'id' => 'sub_test123',
            'customer' => ['id' => 'cus_test123'],
            'latest_invoice' => [
                'payment_intent' => ['id' => 'pi_test123'],
            ],
        ]);

        Mockery::mock('alias:Stripe\Subscription')
            ->shouldReceive('retrieve')
            ->with('sub_test123', ['expand' => ['customer', 'latest_invoice.payment_intent']])
            ->andReturn($mockSubscription);

        $result = $this->provider->getSubscription('sub_test123');

        $this->assertEquals('sub_test123', $result['id']);
        $this->assertArrayHasKey('customer', $result);
        $this->assertArrayHasKey('latest_invoice', $result);
    }

    /** @test */
    public function it_creates_checkout_session()
    {
        $mockSession = Mockery::mock(StripeCheckoutSession::class);
        $mockSession->shouldReceive('toArray')->andReturn([
            'id' => 'cs_test123',
            'url' => 'https://checkout.stripe.com/pay/cs_test123',
        ]);

        $mockSession->shouldReceive('create')->once()->with([
            'customer' => $this->tenant->stripe_customer_id,
            'payment_method_types' => ['card'],
            'line_items' => [
                [
                    'price' => $this->plan->stripe_price_id,
                    'quantity' => 1,
                ],
            ],
            'mode' => 'subscription',
            'success_url' => config('app.url') . '/billing/success?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => config('app.url') . '/billing/cancel',
            'metadata' => [
                'tenant_id' => $this->tenant->id,
                'plan_id' => $this->plan->id,
            ],
            'subscription_data' => [
                'trial_period_days' => 14,
            ],
        ])->andReturn($mockSession);

        Mockery::mock('alias:Stripe\Checkout\Session')
            ->shouldReceive('create')
            ->andReturn($mockSession);

        $result = $this->provider->createCheckoutSession($this->tenant, $this->plan);

        $this->assertEquals('cs_test123', $result['id']);
        $this->assertStringContains('stripe.com', $result['url']);
    }

    /** @test */
    public function it_creates_checkout_session_with_custom_options()
    {
        $mockSession = Mockery::mock(StripeCheckoutSession::class);
        $mockSession->shouldReceive('toArray')->andReturn(['id' => 'cs_test123']);

        $mockSession->shouldReceive('create')->once()->with([
            'customer' => $this->tenant->stripe_customer_id,
            'payment_method_types' => ['card'],
            'line_items' => [
                [
                    'price' => $this->plan->stripe_price_id,
                    'quantity' => 1,
                ],
            ],
            'mode' => 'subscription',
            'success_url' => 'https://example.com/success',
            'cancel_url' => 'https://example.com/cancel',
            'metadata' => [
                'tenant_id' => $this->tenant->id,
                'plan_id' => $this->plan->id,
            ],
            'subscription_data' => [
                'trial_period_days' => 14,
            ],
        ])->andReturn($mockSession);

        Mockery::mock('alias:Stripe\Checkout\Session')
            ->shouldReceive('create')
            ->andReturn($mockSession);

        $this->provider->createCheckoutSession($this->tenant, $this->plan, [
            'success_url' => 'https://example.com/success',
            'cancel_url' => 'https://example.com/cancel',
        ]);
    }

    /** @test */
    public function it_creates_customer_for_checkout_session_when_missing()
    {
        $tenantWithoutCustomer = Tenant::factory()->create([
            'stripe_customer_id' => null,
        ]);

        $mockCustomer = Mockery::mock(StripeCustomer::class);
        $mockCustomer->shouldReceive('toArray')->andReturn(['id' => 'cus_new123']);

        $mockSession = Mockery::mock(StripeCheckoutSession::class);
        $mockSession->shouldReceive('toArray')->andReturn(['id' => 'cs_test123']);

        Mockery::mock('alias:Stripe\Customer')
            ->shouldReceive('create')
            ->andReturn($mockCustomer);

        Mockery::mock('alias:Stripe\Checkout\Session')
            ->shouldReceive('create')
            ->andReturn($mockSession);

        $this->provider->createCheckoutSession($tenantWithoutCustomer, $this->plan);

        $this->assertEquals('cus_new123', $tenantWithoutCustomer->fresh()->stripe_customer_id);
    }

    /** @test */
    public function it_creates_portal_session()
    {
        $mockSession = Mockery::mock(StripePortalSession::class);
        $mockSession->shouldReceive('toArray')->andReturn([
            'id' => 'bps_test123',
            'url' => 'https://billing.stripe.com/session/bps_test123',
        ]);

        $mockSession->shouldReceive('create')->once()->with([
            'customer' => 'cus_test123',
            'return_url' => config('app.url') . '/billing',
        ])->andReturn($mockSession);

        Mockery::mock('alias:Stripe\BillingPortal\Session')
            ->shouldReceive('create')
            ->andReturn($mockSession);

        $result = $this->provider->createPortalSession('cus_test123');

        $this->assertEquals('bps_test123', $result['id']);
        $this->assertStringContains('stripe.com', $result['url']);
    }

    /** @test */
    public function it_verifies_webhook_signature_successfully()
    {
        Mockery::mock('alias:Stripe\Webhook')
            ->shouldReceive('constructEvent')
            ->once()
            ->with('test_payload', 'test_signature', 'whsec_test_123')
            ->andReturn((object) ['id' => 'evt_test123']);

        $result = $this->provider->verifyWebhookSignature('test_payload', 'test_signature');

        $this->assertTrue($result);
    }

    /** @test */
    public function it_fails_webhook_signature_verification()
    {
        Mockery::mock('alias:Stripe\Webhook')
            ->shouldReceive('constructEvent')
            ->once()
            ->andThrow(new \Stripe\Exception\SignatureVerificationException('Invalid signature'));

        Log::shouldReceive('error')->once();

        $result = $this->provider->verifyWebhookSignature('invalid_payload', 'invalid_signature');

        $this->assertFalse($result);
    }

    /** @test */
    public function it_handles_missing_webhook_secret()
    {
        Config::set('services.stripe.webhook_secret', null);

        Log::shouldReceive('error')->once()->with('Stripe webhook secret not configured');

        $result = $this->provider->verifyWebhookSignature('test_payload', 'test_signature');

        $this->assertFalse($result);
    }

    /** @test */
    public function it_handles_invalid_webhook_payload()
    {
        Mockery::mock('alias:Stripe\Webhook')
            ->shouldReceive('constructEvent')
            ->once()
            ->andThrow(new \UnexpectedValueException('Invalid payload'));

        Log::shouldReceive('error')->once();

        $result = $this->provider->verifyWebhookSignature('invalid_payload', 'test_signature');

        $this->assertFalse($result);
    }

    /** @test */
    public function it_attaches_payment_method_to_customer()
    {
        $mockPaymentMethod = Mockery::mock();
        $mockPaymentMethod->shouldReceive('attach')->once()->with(['customer' => 'cus_test123']);

        Mockery::mock('alias:Stripe\PaymentMethod')
            ->shouldReceive('retrieve')
            ->with('pm_test123')
            ->andReturn($mockPaymentMethod);

        Mockery::mock('alias:Stripe\Customer')
            ->shouldReceive('update')
            ->once()
            ->with('cus_test123', [
                'invoice_settings' => [
                    'default_payment_method' => 'pm_test123',
                ],
            ]);

        // Use reflection to test private method
        $reflection = new \ReflectionClass($this->provider);
        $method = $reflection->getMethod('attachPaymentMethod');
        $method->setAccessible(true);

        $method->invoke($this->provider, 'cus_test123', 'pm_test123');
    }

    /** @test */
    public function it_handles_payment_method_attachment_failure()
    {
        Mockery::mock('alias:Stripe\PaymentMethod')
            ->shouldReceive('retrieve')
            ->andThrow(new ApiErrorException('Payment method not found'));

        Log::shouldReceive('error')->once();

        $reflection = new \ReflectionClass($this->provider);
        $method = $reflection->getMethod('attachPaymentMethod');
        $method->setAccessible(true);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Failed to attach payment method: Payment method not found');

        $method->invoke($this->provider, 'cus_test123', 'pm_invalid');
    }

    /** @test */
    public function it_logs_successful_operations()
    {
        $mockCustomer = Mockery::mock(StripeCustomer::class);
        $mockCustomer->shouldReceive('toArray')->andReturn(['id' => 'cus_new123']);

        Mockery::mock('alias:Stripe\Customer')
            ->shouldReceive('create')
            ->andReturn($mockCustomer);

        Log::shouldReceive('info')->once()->with(
            'Stripe customer created',
            \Mockery::type('array')
        );

        $this->provider->createCustomer($this->tenant, []);
    }

    /** @test */
    public function it_logs_failed_operations()
    {
        Mockery::mock('alias:Stripe\Customer')
            ->shouldReceive('create')
            ->andThrow(new ApiErrorException('API Error'));

        Log::shouldReceive('error')->once()->with(
            'Failed to create Stripe customer',
            \Mockery::type('array')
        );

        $this->expectException(\Exception::class);

        $this->provider->createCustomer($this->tenant, []);
    }
}