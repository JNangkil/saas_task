<?php

namespace Tests\Feature;

use App\Http\Resources\PlanResource;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class PlanControllerTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    private User $user;
    private Tenant $tenant;
    private Plan $plan;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->tenant = Tenant::factory()->create();
        $this->tenant->users()->attach($this->user->id, ['role' => 'owner']);
        
        $this->plan = Plan::factory()->create([
            'billing_interval' => 'month',
            'price' => 29.99,
            'is_popular' => false,
            'features' => ['analytics', 'api_access'],
            'limits' => [
                'max_users' => 10,
                'max_workspaces' => 5,
            ],
        ]);

        // Set the current tenant in the app container
        app()->instance('current_tenant', $this->tenant);
    }

    /** @test */
    public function it_can_list_all_plans()
    {
        Plan::factory()->count(3)->create();

        $response = $this->getJson('/api/plans');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'slug',
                        'price',
                        'formatted_price',
                        'billing_interval',
                        'billing_interval_display',
                        'trial_days',
                        'features',
                        'limits',
                        'is_popular',
                        'metadata',
                    ],
                ],
            ]);

        $this->assertEquals(4, $response->json('meta.total')); // 3 created + 1 from setup
    }

    /** @test */
    public function it_can_filter_plans_by_billing_interval()
    {
        Plan::factory()->create(['billing_interval' => 'month']);
        Plan::factory()->create(['billing_interval' => 'year']);

        $response = $this->getJson('/api/plans?interval=month');

        $response->assertStatus(200);
        
        $plans = $response->json('data');
        foreach ($plans as $plan) {
            $this->assertEquals('month', $plan['billing_interval']);
        }
    }

    /** @test */
    public function it_can_filter_plans_by_featured_status()
    {
        Plan::factory()->create(['is_popular' => true]);
        Plan::factory()->create(['is_popular' => false]);

        $response = $this->getJson('/api/plans?featured=true');

        $response->assertStatus(200);
        
        $plans = $response->json('data');
        foreach ($plans as $plan) {
            $this->assertTrue($plan['is_popular']);
        }
    }

    /** @test */
    public function it_can_filter_plans_by_feature()
    {
        Plan::factory()->create(['features' => ['analytics']]);
        Plan::factory()->create(['features' => ['api_access']]);
        Plan::factory()->create(['features' => ['analytics', 'api_access']]);

        $response = $this->getJson('/api/plans?has_feature=analytics');

        $response->assertStatus(200);
        
        $plans = $response->json('data');
        foreach ($plans as $plan) {
            $this->assertContains('analytics', $plan['features']);
        }
    }

    /** @test */
    public function it_returns_422_for_invalid_query_parameters()
    {
        $response = $this->getJson('/api/plans?interval=invalid');

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'Invalid query parameters',
            ]);
    }

    /** @test */
    public function it_caches_plan_list_responses()
    {
        Cache::shouldReceive('remember')
            ->once()
            ->with(\Mockery::type('string'), 3600, \Mockery::type('callable'))
            ->andReturn(collect([$this->plan]));

        $this->getJson('/api/plans');
    }

    /** @test */
    public function it_can_show_a_specific_plan_by_slug()
    {
        $response = $this->getJson("/api/plans/{$this->plan->slug}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'name',
                    'slug',
                    'price',
                    'formatted_price',
                    'billing_interval',
                    'billing_interval_display',
                    'trial_days',
                    'features',
                    'limits',
                    'is_popular',
                    'metadata',
                    'description',
                    'promotional_message',
                ],
            ]);

        $this->assertEquals($this->plan->slug, $response->json('data.slug'));
    }

    /** @test */
    public function it_returns_404_for_nonexistent_plan()
    {
        $response = $this->getJson('/api/plans/nonexistent');

        $response->assertStatus(404)
            ->assertJson([
                'message' => 'Plan not found',
            ]);
    }

    /** @test */
    public function it_caches_plan_show_responses()
    {
        Cache::shouldReceive('remember')
            ->once()
            ->with("plan:{$this->plan->slug}", 3600, \Mockery::type('callable'))
            ->andReturn($this->plan);

        $this->getJson("/api/plans/{$this->plan->slug}");
    }

    /** @test */
    public function it_can_compare_multiple_plans()
    {
        $plan2 = Plan::factory()->create([
            'billing_interval' => 'month',
            'price' => 49.99,
            'features' => ['analytics', 'api_access', 'sso'],
        ]);
        $plan3 = Plan::factory()->create([
            'billing_interval' => 'month',
            'price' => 99.99,
            'features' => ['analytics', 'api_access', 'sso', 'custom_domains'],
        ]);

        $response = $this->getJson("/api/plans/compare?slugs={$this->plan->slug},{$plan2->slug},{$plan3->slug}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'plans' => [
                        '*' => [
                            'id',
                            'name',
                            'slug',
                            'price',
                            'features',
                            'limits',
                        ],
                    ],
                    'comparison_matrix',
                    'all_features',
                ],
            ]);
    }

    /** @test */
    public function it_returns_422_for_invalid_compare_parameters()
    {
        $response = $this->getJson('/api/plans/compare?slugs=invalid-format');

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'Invalid query parameters',
            ]);
    }

    /** @test */
    public function it_returns_422_when_comparing_fewer_than_2_plans()
    {
        $response = $this->getJson("/api/plans/compare?slugs={$this->plan->slug}");

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'At least 2 plans are required for comparison',
            ]);
    }

    /** @test */
    public function it_returns_422_when_comparing_more_than_5_plans()
    {
        $slugs = collect(range(1, 6))->map(fn() => $this->faker->slug)->implode(',');
        
        $response = $this->getJson("/api/plans/compare?slugs={$slugs}");

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'Cannot compare more than 5 plans at once',
            ]);
    }

    /** @test */
    public function it_returns_404_when_comparing_nonexistent_plans()
    {
        $response = $this->getJson('/api/plans/compare?slugs=nonexistent1,nonexistent2');

        $response->assertStatus(404)
            ->assertJson([
                'message' => 'One or more plans not found',
            ]);
    }

    /** @test */
    public function it_caches_plan_comparison_responses()
    {
        Cache::shouldReceive('remember')
            ->once()
            ->with(\Mockery::type('string'), 3600, \Mockery::type('callable'))
            ->andReturn(new \stdClass());

        $this->getJson("/api/plans/compare?slugs={$this->plan->slug},another-plan");
    }

    /** @test */
    public function it_can_get_current_tenant_subscription()
    {
        $subscription = Subscription::factory()->create([
            'tenant_id' => $this->tenant->id,
            'plan_id' => $this->plan->id,
            'status' => Subscription::STATUS_ACTIVE,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/plans/current');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'subscription' => [
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
                    ],
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
                    ],
                ],
            ]);

        $this->assertEquals($subscription->id, $response->json('data.subscription.id'));
        $this->assertEquals($this->plan->id, $response->json('data.plan.id'));
    }

    /** @test */
    public function it_returns_null_when_no_active_subscription()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/plans/current');

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'No active subscription found',
                'data' => [
                    'subscription' => null,
                    'plan' => null,
                    'usage' => null,
                ],
            ]);
    }

    /** @test */
    public function it_returns_404_when_tenant_not_found()
    {
        app()->instance('current_tenant', null);

        $response = $this->actingAs($this->user)
            ->getJson('/api/plans/current');

        $response->assertStatus(404)
            ->assertJson([
                'message' => 'Tenant not found',
            ]);
    }

    /** @test */
    public function it_can_list_all_features()
    {
        Plan::factory()->create([
            'features' => ['analytics', 'api_access'],
        ]);
        Plan::factory()->create([
            'features' => ['analytics', 'sso'],
            'is_popular' => true,
        ]);

        $response = $this->getJson('/api/plans/features');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'features' => [
                        '*' => [
                            'name',
                            'display_name',
                            'description',
                            'category',
                            'available_in_plans',
                            'popular_in_plans',
                        ],
                    ],
                    'categories',
                ],
            ]);
    }

    /** @test */
    public function it_can_filter_features_by_category()
    {
        Plan::factory()->create(['features' => ['analytics']]);
        Plan::factory()->create(['features' => ['sso']]);

        $response = $this->getJson('/api/plans/features?category=analytics');

        $response->assertStatus(200);
        
        $features = $response->json('data.features');
        foreach ($features as $feature) {
            $this->assertEquals('analytics', $feature['category']);
        }
    }

    /** @test */
    public function it_returns_422_for_invalid_feature_parameters()
    {
        $response = $this->getJson('/api/plans/features?category=' . str_repeat('a', 51));

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'Invalid query parameters',
            ]);
    }

    /** @test */
    public function it_caches_features_responses()
    {
        Cache::shouldReceive('remember')
            ->once()
            ->with(\Mockery::type('string'), 3600, \Mockery::type('callable'))
            ->andReturn(['features' => [], 'categories' => []]);

        $this->getJson('/api/plans/features');
    }

    /** @test */
    public function it_returns_correct_feature_descriptions()
    {
        $plan = Plan::factory()->create(['features' => ['basic_analytics']]);

        $response = $this->getJson('/api/plans/features');

        $features = $response->json('data.features');
        $analyticsFeature = collect($features)->firstWhere('name', 'basic_analytics');
        
        $this->assertEquals('View basic usage statistics and reports', $analyticsFeature['description']);
    }

    /** @test */
    public function it_returns_correct_feature_categories()
    {
        $plan = Plan::factory()->create(['features' => ['sso']]);

        $response = $this->getJson('/api/plans/features');

        $features = $response->json('data.features');
        $ssoFeature = collect($features)->firstWhere('name', 'sso');
        
        $this->assertEquals('security', $ssoFeature['category']);
    }
}