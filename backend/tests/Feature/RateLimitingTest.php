<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class RateLimitingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Clear any existing rate limiters
        RateLimiter::clear('auth:login');
        RateLimiter::clear('auth:password:forgot');
        RateLimiter::clear('auth:password:reset');
        RateLimiter::clear('auth:mfa:setup');
        RateLimiter::clear('auth:mfa:verify');
    }

    /**
     * Create a test user.
     */
    protected function createTestUser(): User
    {
        return User::factory()->create([
            'email' => 'test@example.com',
            'password' => Hash::make('password'),
        ]);
    }

    /**
     * Test rate limiting on login endpoint.
     */
    public function test_rate_limiting_on_login_endpoint(): void
    {
        $user = $this->createTestUser();

        // Make 5 login attempts (within limit)
        for ($i = 1; $i <= 5; $i++) {
            $response = $this->postJson('/api/auth/login', [
                'email' => 'test@example.com',
                'password' => 'wrongpassword',
            ]);

            if ($i < 5) {
                $response->assertStatus(401);
            }
        }

        // 6th attempt should be rate limited
        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(429)
            ->assertHeader('Retry-After')
            ->assertJson([
                'message' => 'Too many attempts. Please try again later.',
            ]);
    }

    /**
     * Test rate limiting on password forgot endpoint.
     */
    public function test_rate_limiting_on_password_forgot_endpoint(): void
    {
        // Make 3 password forgot requests (within limit)
        for ($i = 1; $i <= 3; $i++) {
            $response = $this->postJson('/api/auth/password/forgot', [
                'email' => 'test@example.com',
            ]);

            if ($i < 3) {
                $response->assertStatus(200);
            }
        }

        // 4th attempt should be rate limited
        $response = $this->postJson('/api/auth/password/forgot', [
            'email' => 'test@example.com',
        ]);

        $response->assertStatus(429)
            ->assertHeader('Retry-After')
            ->assertJson([
                'message' => 'Too many attempts. Please try again later.',
            ]);
    }

    /**
     * Test rate limiting on MFA setup endpoint.
     */
    public function test_rate_limiting_on_mfa_setup_endpoint(): void
    {
        $user = $this->createTestUser();
        $this->actingAs($user);

        // Make 5 MFA setup attempts (within limit)
        for ($i = 1; $i <= 5; $i++) {
            $response = $this->postJson('/api/auth/mfa/setup', [
                'password' => 'password',
            ]);

            if ($i < 5) {
                $response->assertStatus(200);
            }
        }

        // 6th attempt should be rate limited
        $response = $this->postJson('/api/auth/mfa/setup', [
            'password' => 'password',
        ]);

        $response->assertStatus(429)
            ->assertHeader('Retry-After')
            ->assertJson([
                'message' => 'Too many attempts. Please try again later.',
            ]);
    }

    /**
     * Test rate limiting on MFA verify endpoint.
     */
    public function test_rate_limiting_on_mfa_verify_endpoint(): void
    {
        $user = $this->createTestUser();
        $this->actingAs($user);

        // Setup and enable MFA first
        $mfaService = app(\App\Services\MFAService::class);
        $secret = $mfaService->generateSecret($user);
        $mfaService->setupMfa($user, $secret);
        $mfaService->enableMfa($user);

        // Make 5 MFA verification attempts (within limit)
        for ($i = 1; $i <= 5; $i++) {
            $response = $this->postJson('/api/auth/mfa/verify', [
                'code' => '123456',
            ]);

            if ($i < 5) {
                $response->assertStatus(422);
            }
        }

        // 6th attempt should be rate limited
        $response = $this->postJson('/api/auth/mfa/verify', [
            'code' => '123456',
        ]);

        $response->assertStatus(429)
            ->assertHeader('Retry-After')
            ->assertJson([
                'message' => 'Too many attempts. Please try again later.',
            ]);
    }

    /**
     * Test rate limiting on password reset endpoint.
     */
    public function test_rate_limiting_on_password_reset_endpoint(): void
    {
        $user = $this->createTestUser();
        
        // Create a password reset token
        $resetToken = \App\Models\PasswordResetToken::createForUser($user, 60);

        // Make 5 password reset attempts (within limit)
        for ($i = 1; $i <= 5; $i++) {
            $response = $this->postJson('/api/auth/password/reset', [
                'email' => 'test@example.com',
                'token' => $resetToken->token,
                'password' => 'newpassword',
                'password_confirmation' => 'newpassword',
            ]);

            if ($i < 5) {
                $response->assertStatus(400); // Token used after first attempt
            }
        }

        // 6th attempt should be rate limited
        $response = $this->postJson('/api/auth/password/reset', [
            'email' => 'test@example.com',
            'token' => $resetToken->token,
            'password' => 'newpassword',
            'password_confirmation' => 'newpassword',
        ]);

        $response->assertStatus(429)
            ->assertHeader('Retry-After')
            ->assertJson([
                'message' => 'Too many attempts. Please try again later.',
            ]);
    }

    /**
     * Test rate limiting with different IP addresses.
     */
    public function test_rate_limiting_with_different_ip_addresses(): void
    {
        $user = $this->createTestUser();

        // Make requests from different IPs
        $ips = ['192.168.1.1', '192.168.1.2', '192.168.1.3', '192.168.1.4', '192.168.1.5'];

        foreach ($ips as $ip) {
            $response = $this->withServerVariables(['REMOTE_ADDR' => $ip])
                ->postJson('/api/auth/login', [
                    'email' => 'test@example.com',
                    'password' => 'wrongpassword',
                ]);

            $response->assertStatus(401);
        }

        // Each IP should have its own rate limit
        $response = $this->withServerVariables(['REMOTE_ADDR' => '192.168.1.1'])
            ->postJson('/api/auth/login', [
                'email' => 'test@example.com',
                'password' => 'wrongpassword',
            ]);

        $response->assertStatus(429)
            ->assertHeader('Retry-After');
    }

    /**
     * Test rate limiting with different users.
     */
    public function test_rate_limiting_with_different_users(): void
    {
        // Create multiple users
        $users = [
            User::factory()->create(['email' => 'user1@example.com']),
            User::factory()->create(['email' => 'user2@example.com']),
            User::factory()->create(['email' => 'user3@example.com']),
        ];

        // Make requests for different users
        foreach ($users as $user) {
            $response = $this->postJson('/api/auth/login', [
                'email' => $user->email,
                'password' => 'wrongpassword',
            ]);

            $response->assertStatus(401);
        }

        // Each user should have its own rate limit
        for ($i = 1; $i <= 5; $i++) {
            $response = $this->postJson('/api/auth/login', [
                'email' => 'user1@example.com',
                'password' => 'wrongpassword',
            ]);

            if ($i < 5) {
                $response->assertStatus(401);
            }
        }

        // Should be rate limited for user1
        $response = $this->postJson('/api/auth/login', [
            'email' => 'user1@example.com',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(429)
            ->assertHeader('Retry-After');
    }

    /**
     * Test rate limiting headers are present.
     */
    public function test_rate_limiting_headers_are_present(): void
    {
        $user = $this->createTestUser();

        // Make requests until rate limited
        for ($i = 1; $i <= 6; $i++) {
            $response = $this->postJson('/api/auth/login', [
                'email' => 'test@example.com',
                'password' => 'wrongpassword',
            ]);

            if ($i === 6) {
                // Check for rate limiting headers
                $response->assertHeader('Retry-After');
                $response->assertHeader('X-RateLimit-Limit');
                $response->assertHeader('X-RateLimit-Remaining');
            }
        }
    }

    /**
     * Test rate limiting reset after time window.
     */
    public function test_rate_limiting_reset_after_time_window(): void
    {
        $user = $this->createTestUser();

        // Make requests until rate limited
        for ($i = 1; $i <= 6; $i++) {
            $this->postJson('/api/auth/login', [
                'email' => 'test@example.com',
                'password' => 'wrongpassword',
            ]);
        }

        // Should be rate limited
        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(429);

        // Simulate time passing by clearing the rate limiter
        RateLimiter::clear('auth:login');

        // Should be able to make requests again
        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(401); // Not rate limited, just wrong password
    }

    /**
     * Test rate limiting with successful requests.
     */
    public function test_rate_limiting_with_successful_requests(): void
    {
        $user = $this->createTestUser();

        // Make successful login requests
        for ($i = 1; $i <= 5; $i++) {
            $response = $this->postJson('/api/auth/login', [
                'email' => 'test@example.com',
                'password' => 'password',
            ]);

            $response->assertStatus(200);
        }

        // 6th successful request should still work (no rate limit on success)
        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        $response->assertStatus(200);
    }

    /**
     * Test rate limiting on MFA disable endpoint.
     */
    public function test_rate_limiting_on_mfa_disable_endpoint(): void
    {
        $user = $this->createTestUser();
        $this->actingAs($user);

        // Setup and enable MFA first
        $mfaService = app(\App\Services\MFAService::class);
        $secret = $mfaService->generateSecret($user);
        $mfaService->setupMfa($user, $secret);
        $mfaService->enableMfa($user);

        // Make 5 MFA disable attempts (within limit)
        for ($i = 1; $i <= 5; $i++) {
            $response = $this->postJson('/api/auth/mfa/disable', [
                'password' => 'wrongpassword',
            ]);

            if ($i < 5) {
                $response->assertStatus(422);
            }
        }

        // 6th attempt should be rate limited
        $response = $this->postJson('/api/auth/mfa/disable', [
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(429)
            ->assertHeader('Retry-After')
            ->assertJson([
                'message' => 'Too many attempts. Please try again later.',
            ]);
    }

    /**
     * Test rate limiting on token refresh endpoint.
     */
    public function test_rate_limiting_on_token_refresh_endpoint(): void
    {
        $user = $this->createTestUser();

        // Login to get a token
        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        $token = $response->json('token');

        // Make 5 refresh attempts (within limit)
        for ($i = 1; $i <= 5; $i++) {
            $response = $this->postJson('/api/auth/refresh', [], [
                'Authorization' => 'Bearer ' . $token,
            ]);

            if ($i < 5) {
                $this->assertContains($response->status(), [200, 401]); // 401 if token expired
            }
        }

        // 6th attempt should be rate limited
        $response = $this->postJson('/api/auth/refresh', [], [
            'Authorization' => 'Bearer ' . $token,
        ]);

        $response->assertStatus(429)
            ->assertHeader('Retry-After')
            ->assertJson([
                'message' => 'Too many attempts. Please try again later.',
            ]);
    }

    /**
     * Test rate limiting on password verification endpoint.
     */
    public function test_rate_limiting_on_password_verify_endpoint(): void
    {
        $user = $this->createTestUser();
        
        // Create a password reset token
        $resetToken = \App\Models\PasswordResetToken::createForUser($user, 60);

        // Make 5 token verification attempts (within limit)
        for ($i = 1; $i <= 5; $i++) {
            $response = $this->getJson('/api/auth/password/verify?token=' . $resetToken->token);

            if ($i < 5) {
                $response->assertStatus(200);
            }
        }

        // 6th attempt should be rate limited
        $response = $this->getJson('/api/auth/password/verify?token=' . $resetToken->token);

        $response->assertStatus(429)
            ->assertHeader('Retry-After')
            ->assertJson([
                'message' => 'Too many attempts. Please try again later.',
            ]);
    }
}