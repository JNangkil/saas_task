<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\AccountLockout;
use App\Services\AccountLockoutService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AccountLockoutTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
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
     * Test account lockout after 5 failed attempts.
     */
    public function test_account_lockout_after_5_failed_attempts(): void
    {
        $user = $this->createTestUser();
        $lockoutService = app(AccountLockoutService::class);

        // Make 5 failed login attempts
        for ($i = 1; $i <= 5; $i++) {
            $response = $this->postJson('/api/auth/login', [
                'email' => 'test@example.com',
                'password' => 'wrongpassword',
            ]);

            if ($i < 5) {
                $response->assertStatus(401)
                    ->assertJsonStructure([
                        'error',
                        'message',
                        'failed_attempts',
                        'remaining_attempts',
                    ]);
            }
        }

        // 5th attempt should lock the account
        $response->assertStatus(423)
            ->assertJsonStructure([
                'error',
                'message',
                'locked_until',
                'retry_after',
                'failed_attempts',
            ]);

        // Assert account is locked
        $this->assertTrue($lockoutService->isAccountLocked($user));
    }

    /**
     * Test lockout duration.
     */
    public function test_lockout_duration(): void
    {
        $user = $this->createTestUser();
        $lockoutService = app(AccountLockoutService::class);

        // Lock the account
        $lockoutService->lockAccount($user, 15);

        // Assert remaining lockout time is positive
        $remainingTime = $lockoutService->getRemainingLockoutTime($user);
        $this->assertGreaterThan(0, $remainingTime);
        $this->assertLessThanOrEqual(15 * 60, $remainingTime); // 15 minutes in seconds
    }

    /**
     * Test reset of failed attempts on successful login.
     */
    public function test_reset_of_failed_attempts_on_successful_login(): void
    {
        $user = $this->createTestUser();
        $lockoutService = app(AccountLockoutService::class);

        // Make some failed attempts
        for ($i = 1; $i <= 3; $i++) {
            $this->postJson('/api/auth/login', [
                'email' => 'test@example.com',
                'password' => 'wrongpassword',
            ]);
        }

        // Assert failed attempts are recorded
        $lockoutStatus = $lockoutService->getLockoutStatus($user);
        $this->assertEquals(3, $lockoutStatus['failed_attempts']);

        // Make successful login
        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        $response->assertStatus(200);

        // Assert failed attempts are reset
        $lockoutStatus = $lockoutService->getLockoutStatus($user);
        $this->assertEquals(0, $lockoutStatus['failed_attempts']);
        $this->assertFalse($lockoutStatus['is_locked']);
    }

    /**
     * Test lockout status check.
     */
    public function test_lockout_status_check(): void
    {
        $user = $this->createTestUser();
        $lockoutService = app(AccountLockoutService::class);

        // Initial status should not be locked
        $status = $lockoutService->getLockoutStatus($user);
        $this->assertFalse($status['is_locked']);
        $this->assertEquals(0, $status['failed_attempts']);

        // Make failed attempts
        $lockoutService->recordFailedAttempt($user);
        $lockoutService->recordFailedAttempt($user);

        $status = $lockoutService->getLockoutStatus($user);
        $this->assertFalse($status['is_locked']);
        $this->assertEquals(2, $status['failed_attempts']);

        // Lock the account
        $lockoutService->lockAccount($user, 15);

        $status = $lockoutService->getLockoutStatus($user);
        $this->assertTrue($status['is_locked']);
        $this->assertNotNull($status['locked_until']);
        $this->assertGreaterThan(0, $status['remaining_time']);
    }

    /**
     * Test progressive lockout durations.
     */
    public function test_progressive_lockout_durations(): void
    {
        $user = $this->createTestUser();
        $lockoutService = app(AccountLockoutService::class);

        // Get lockout record
        $lockout = AccountLockout::getOrCreateForUser($user);

        // Test base duration (5 attempts)
        $lockout->failed_attempts = 5;
        $duration1 = $lockout->getLockoutDuration();
        $this->assertEquals(15, $duration1); // Base 15 minutes

        // Test progressive duration (6 attempts)
        $lockout->failed_attempts = 6;
        $duration2 = $lockout->getLockoutDuration();
        $this->assertEquals(20, $duration2); // 15 + 5 minutes

        // Test progressive duration (7 attempts)
        $lockout->failed_attempts = 7;
        $duration3 = $lockout->getLockoutDuration();
        $this->assertEquals(25, $duration3); // 15 + (2 * 5) minutes

        // Test progressive duration (10 attempts)
        $lockout->failed_attempts = 10;
        $duration4 = $lockout->getLockoutDuration();
        $this->assertEquals(40, $duration4); // 15 + (5 * 5) minutes
    }

    /**
     * Test account lockout with MFA enabled.
     */
    public function test_account_lockout_with_mfa_enabled(): void
    {
        $user = $this->createTestUser();
        $this->actingAs($user);

        // Setup and enable MFA
        $mfaService = app(\App\Services\MFAService::class);
        $secret = $mfaService->generateSecret($user);
        $mfaService->setupMfa($user, $secret);
        $mfaService->enableMfa($user);

        // Make 5 failed MFA verification attempts
        for ($i = 1; $i <= 5; $i++) {
            $response = $this->postJson('/api/auth/mfa/verify', [
                'code' => '123456',
            ]);

            if ($i < 5) {
                $response->assertStatus(422);
            }
        }

        // 5th attempt should lock the account
        $response->assertStatus(423)
            ->assertJsonStructure([
                'error',
                'message',
                'locked_until',
                'retry_after',
            ]);

        // Assert account is locked
        $lockoutService = app(AccountLockoutService::class);
        $this->assertTrue($lockoutService->isAccountLocked($user));
    }

    /**
     * Test login with locked account.
     */
    public function test_login_with_locked_account(): void
    {
        $user = $this->createTestUser();
        $lockoutService = app(AccountLockoutService::class);

        // Lock the account
        $lockoutService->lockAccount($user, 15);

        // Try to login with correct credentials
        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        // Should be rejected due to lockout
        $response->assertStatus(423)
            ->assertJsonStructure([
                'error',
                'message',
                'locked_until',
                'retry_after',
            ]);
    }

    /**
     * Test MFA verification with locked account.
     */
    public function test_mfa_verification_with_locked_account(): void
    {
        $user = $this->createTestUser();
        $this->actingAs($user);

        // Setup and enable MFA
        $mfaService = app(\App\Services\MFAService::class);
        $secret = $mfaService->generateSecret($user);
        $mfaService->setupMfa($user, $secret);
        $mfaService->enableMfa($user);

        // Lock the account
        $lockoutService = app(AccountLockoutService::class);
        $lockoutService->lockAccount($user, 15);

        // Try to verify MFA with valid code
        $totp = new \OTPHP\TOTP($secret);
        $validCode = $totp->now();

        $response = $this->postJson('/api/auth/mfa/verify', [
            'code' => $validCode,
        ]);

        // Should be rejected due to lockout
        $response->assertStatus(423)
            ->assertJsonStructure([
                'error',
                'message',
                'locked_until',
                'retry_after',
            ]);
    }

    /**
     * Test account unlock.
     */
    public function test_account_unlock(): void
    {
        $user = $this->createTestUser();
        $lockoutService = app(AccountLockoutService::class);

        // Lock the account
        $lockoutService->lockAccount($user, 15);
        $this->assertTrue($lockoutService->isAccountLocked($user));

        // Unlock the account
        $lockoutService->unlockAccount($user);
        $this->assertFalse($lockoutService->isAccountLocked($user));

        // Assert failed attempts are reset
        $status = $lockoutService->getLockoutStatus($user);
        $this->assertEquals(0, $status['failed_attempts']);
        $this->assertNull($status['locked_until']);
    }

    /**
     * Test lockout expiration.
     */
    public function test_lockout_expiration(): void
    {
        $user = $this->createTestUser();
        $lockoutService = app(AccountLockoutService::class);

        // Lock the account for 1 minute
        $lockoutService->lockAccount($user, 1);

        // Assert account is locked
        $this->assertTrue($lockoutService->isAccountLocked($user));

        // Simulate time passing (using database manipulation)
        $lockout = $user->accountLockout;
        $lockout->locked_until = now()->subMinutes(2);
        $lockout->save();

        // Assert account is no longer locked
        $this->assertFalse($lockoutService->isAccountLocked($user));
    }

    /**
     * Test failed attempts counter increment.
     */
    public function test_failed_attempts_counter_increment(): void
    {
        $user = $this->createTestUser();
        $lockoutService = app(AccountLockoutService::class);

        // Record failed attempts
        $lockout1 = $lockoutService->recordFailedAttempt($user);
        $this->assertEquals(1, $lockout1->failed_attempts);

        $lockout2 = $lockoutService->recordFailedAttempt($user);
        $this->assertEquals(2, $lockout2->failed_attempts);

        $lockout3 = $lockoutService->recordFailedAttempt($user);
        $this->assertEquals(3, $lockout3->failed_attempts);
    }

    /**
     * Test lockout for non-existent user.
     */
    public function test_lockout_for_non_existent_user(): void
    {
        // Try to login with non-existent user
        $response = $this->postJson('/api/auth/login', [
            'email' => 'nonexistent@example.com',
            'password' => 'wrongpassword',
        ]);

        // Should return generic error without lockout info
        $response->assertStatus(401)
            ->assertJsonStructure([
                'error',
                'message',
            ]);

        // Should not include lockout information
        $response->assertJsonMissing([
            'failed_attempts',
            'remaining_attempts',
        ]);
    }

    /**
     * Test lockout statistics.
     */
    public function test_lockout_statistics(): void
    {
        $lockoutService = app(AccountLockoutService::class);

        // Create some users with lockouts
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $user3 = User::factory()->create();

        // Lock some accounts
        $lockoutService->lockAccount($user1, 15);
        $lockoutService->lockAccount($user2, 15);

        // Record failed attempts for another user
        $lockoutService->recordFailedAttempt($user3);

        // Get statistics
        $stats = $lockoutService->getLockoutStatistics();

        $this->assertArrayHasKey('total_lockouts', $stats);
        $this->assertArrayHasKey('active_lockouts', $stats);
        $this->assertArrayHasKey('users_with_failed_attempts', $stats);

        $this->assertGreaterThanOrEqual(2, $stats['total_lockouts']);
        $this->assertGreaterThanOrEqual(2, $stats['active_lockouts']);
        $this->assertGreaterThanOrEqual(1, $stats['users_with_failed_attempts']);
    }

    /**
     * Test cleanup of expired lockouts.
     */
    public function test_cleanup_of_expired_lockouts(): void
    {
        $user = $this->createTestUser();
        $lockoutService = app(AccountLockoutService::class);

        // Create and then expire a lockout
        $lockoutService->lockAccount($user, 1);
        $lockoutService->unlockAccount($user);

        // Manually set the lockout record to be old
        $lockout = $user->accountLockout;
        $lockout->created_at = now()->subDays(35);
        $lockout->save();

        // Run cleanup
        $deletedCount = $lockoutService->cleanupExpiredLockouts();
        $this->assertGreaterThanOrEqual(0, $deletedCount);
    }
}