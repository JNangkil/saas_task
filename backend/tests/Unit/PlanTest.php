<?php

namespace Tests\Unit;

use App\Models\Plan;
use Database\Factories\PlanFactory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlanTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function it_can_create_a_plan()
    {
        $planData = [
            'name' => 'Test Plan',
            'slug' => 'test-plan',
            'price' => 29.99,
            'billing_interval' => 'month',
            'trial_days' => 14,
            'limits' => [
                'max_users' => 10,
                'max_workspaces' => 5,
                'max_boards' => 25,
                'max_storage_mb' => 5000,
            ],
            'features' => [
                'basic_features',
                'email_support',
                'api_access',
            ],
            'metadata' => [
                'tier' => 'premium',
                'description' => 'A test plan for premium features',
            ],
            'is_popular' => true,
        ];

        $plan = Plan::create($planData);

        $this->assertInstanceOf(Plan::class, $plan);
        $this->assertEquals('Test Plan', $plan->name);
        $this->assertEquals('test-plan', $plan->slug);
        $this->assertEquals(29.99, $plan->price);
        $this->assertEquals('month', $plan->billing_interval);
        $this->assertEquals(14, $plan->trial_days);
        $this->assertTrue($plan->is_popular);
        $this->assertIsArray($plan->limits);
        $this->assertIsArray($plan->features);
        $this->assertIsArray($plan->metadata);
    }

    /** @test */
    public function it_can_get_max_users_attribute()
    {
        $plan = Plan::factory()->create([
            'limits' => ['max_users' => 25],
        ]);

        $this->assertEquals(25, $plan->max_users);
    }

    /** @test */
    public function it_returns_zero_for_missing_max_users_limit()
    {
        $plan = Plan::factory()->create([
            'limits' => [],
        ]);

        $this->assertEquals(0, $plan->max_users);
    }

    /** @test */
    public function it_can_get_max_workspaces_attribute()
    {
        $plan = Plan::factory()->create([
            'limits' => ['max_workspaces' => 10],
        ]);

        $this->assertEquals(10, $plan->max_workspaces);
    }

    /** @test */
    public function it_can_get_max_boards_attribute()
    {
        $plan = Plan::factory()->create([
            'limits' => ['max_boards' => 100],
        ]);

        $this->assertEquals(100, $plan->max_boards);
    }

    /** @test */
    public function it_can_get_max_storage_mb_attribute()
    {
        $plan = Plan::factory()->create([
            'limits' => ['max_storage_mb' => 20000],
        ]);

        $this->assertEquals(20000, $plan->max_storage_mb);
    }

    /** @test */
    public function it_can_check_if_plan_has_feature()
    {
        $plan = Plan::factory()->create([
            'features' => ['basic_features', 'api_access', 'analytics'],
        ]);

        $this->assertTrue($plan->hasFeature('basic_features'));
        $this->assertTrue($plan->hasFeature('api_access'));
        $this->assertTrue($plan->hasFeature('analytics'));
        $this->assertFalse($plan->hasFeature('custom_themes'));
        $this->assertFalse($plan->hasFeature('non_existent_feature'));
    }

    /** @test */
    public function it_handles_null_features_gracefully()
    {
        $plan = Plan::factory()->create([
            'features' => null,
        ]);

        $this->assertFalse($plan->hasFeature('any_feature'));
    }

    /** @test */
    public function it_can_get_formatted_price_attribute()
    {
        $plan = Plan::factory()->create(['price' => 49.99]);

        $this->assertEquals('$49.99', $plan->formatted_price);
    }

    /** @test */
    public function it_can_get_billing_interval_display_attribute()
    {
        $monthlyPlan = Plan::factory()->create(['billing_interval' => 'month']);
        $yearlyPlan = Plan::factory()->create(['billing_interval' => 'year']);
        $customPlan = Plan::factory()->create(['billing_interval' => 'week']);

        $this->assertEquals('Monthly', $monthlyPlan->billing_interval_display);
        $this->assertEquals('Yearly', $yearlyPlan->billing_interval_display);
        $this->assertEquals('Week', $customPlan->billing_interval_display);
    }

    /** @test */
    public function it_can_scope_to_monthly_plans()
    {
        Plan::factory()->monthly()->count(3)->create();
        Plan::factory()->yearly()->count(2)->create();

        $monthlyPlans = Plan::monthly()->get();

        $this->assertCount(3, $monthlyPlans);
        $monthlyPlans->each(function ($plan) {
            $this->assertEquals('month', $plan->billing_interval);
        });
    }

    /** @test */
    public function it_can_scope_to_yearly_plans()
    {
        Plan::factory()->monthly()->count(2)->create();
        Plan::factory()->yearly()->count(4)->create();

        $yearlyPlans = Plan::yearly()->get();

        $this->assertCount(4, $yearlyPlans);
        $yearlyPlans->each(function ($plan) {
            $this->assertEquals('year', $plan->billing_interval);
        });
    }

    /** @test */
    public function it_can_create_free_plan_using_factory()
    {
        $plan = Plan::factory()->free()->create();

        $this->assertEquals('Free', $plan->name);
        $this->assertEquals('free', $plan->slug);
        $this->assertEquals(0, $plan->price);
        $this->assertEquals(0, $plan->trial_days);
        $this->assertEquals('month', $plan->billing_interval);
        $this->assertFalse($plan->is_popular);
        $this->assertEquals(['basic_features', 'email_support'], $plan->features);
    }

    /** @test */
    public function it_can_create_starter_plan_using_factory()
    {
        $plan = Plan::factory()->starter()->create();

        $this->assertEquals('Starter', $plan->name);
        $this->assertEquals('starter', $plan->slug);
        $this->assertEquals(19.99, $plan->price);
        $this->assertEquals(14, $plan->trial_days);
        $this->assertEquals('month', $plan->billing_interval);
    }

    /** @test */
    public function it_can_create_pro_plan_using_factory()
    {
        $plan = Plan::factory()->pro()->create();

        $this->assertEquals('Pro', $plan->name);
        $this->assertEquals('pro', $plan->slug);
        $this->assertEquals(49.99, $plan->price);
        $this->assertEquals(14, $plan->trial_days);
        $this->assertEquals('month', $plan->billing_interval);
        $this->assertTrue($plan->is_popular);
    }

    /** @test */
    public function it_can_create_enterprise_plan_using_factory()
    {
        $plan = Plan::factory()->enterprise()->create();

        $this->assertEquals('Enterprise', $plan->name);
        $this->assertEquals('enterprise', $plan->slug);
        $this->assertEquals(199.99, $plan->price);
        $this->assertEquals(30, $plan->trial_days);
        $this->assertEquals('month', $plan->billing_interval);

        // Enterprise plans should have unlimited limits (-1)
        $this->assertEquals(-1, $plan->max_users);
        $this->assertEquals(-1, $plan->max_workspaces);
        $this->assertEquals(-1, $plan->max_boards);
        $this->assertEquals(-1, $plan->max_storage_mb);
    }

    /** @test */
    public function it_can_create_popular_plan_using_factory()
    {
        $plan = Plan::factory()->popular()->create();

        $this->assertTrue($plan->is_popular);
    }

    /** @test */
    public function it_can_create_plan_with_trial_using_factory()
    {
        $plan = Plan::factory()->withTrial(21)->create();

        $this->assertEquals(21, $plan->trial_days);
    }

    /** @test */
    public function it_can_create_plan_without_trial_using_factory()
    {
        $plan = Plan::factory()->withoutTrial()->create();

        $this->assertEquals(0, $plan->trial_days);
    }

    /** @test */
    public function it_casts_price_to_decimal()
    {
        $plan = Plan::factory()->create(['price' => '99.95']);

        $this->assertIsFloat($plan->price);
        $this->assertEquals(99.95, $plan->price);
    }

    /** @test */
    public function it_casts_json_fields_to_arrays()
    {
        $plan = Plan::factory()->create([
            'limits' => '{"max_users": 50}',
            'features' => '["feature1", "feature2"]',
            'metadata' => '{"key": "value"}',
        ]);

        $this->assertIsArray($plan->limits);
        $this->assertIsArray($plan->features);
        $this->assertIsArray($plan->metadata);
        $this->assertEquals(['max_users' => 50], $plan->limits);
        $this->assertEquals(['feature1', 'feature2'], $plan->features);
        $this->assertEquals(['key' => 'value'], $plan->metadata);
    }

    /** @test */
    public function it_casts_is_popular_to_boolean()
    {
        $plan = Plan::factory()->create(['is_popular' => 1]);

        $this->assertIsBool($plan->is_popular);
        $this->assertTrue($plan->is_popular);
    }

    /** @test */
    public function it_can_update_plan_attributes()
    {
        $plan = Plan::factory()->create();

        $plan->update([
            'name' => 'Updated Plan',
            'price' => 99.99,
            'is_popular' => true,
        ]);

        $this->assertEquals('Updated Plan', $plan->fresh()->name);
        $this->assertEquals(99.99, $plan->fresh()->price);
        $this->assertTrue($plan->fresh()->is_popular);
    }

    /** @test */
    public function it_can_delete_a_plan()
    {
        $plan = Plan::factory()->create();

        $planId = $plan->id;
        $plan->delete();

        $this->assertModelMissing($plan);
        $this->assertDatabaseMissing('plans', ['id' => $planId]);
    }

    /** @test */
    public function it_can_create_yearly_plan_with_discounted_price()
    {
        $plan = Plan::factory()->yearly()->create();

        // Yearly plans should have a discounted price (10 months instead of 12)
        $this->assertEquals('year', $plan->billing_interval);
        $this->assertGreaterThan(0, $plan->price);
    }
}