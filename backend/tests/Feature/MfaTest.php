<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\UserMFA;
use App\Services\MFAService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use OTPHP\TOTP;

class MfaTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
    }

    /**
     * Create an authenticated user for testing.
     */
    protected function createAuthenticatedUser(): User
    {
        $user = User::factory()->create();
        $this->actingAs($user);
        return $user;
    }

    /**
     * Test MFA setup endpoint.
     */
    public function test_mfa_setup_endpoint(): void
    {
        $user = $this->createAuthenticatedUser();

        $response = $this->postJson('/api/auth/mfa/setup', [
            'password' => 'password',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'secret',
                'qr_code',
                'recovery_codes',
                'message',
            ]);

        // Assert MFA record was created but not enabled
        $this->assertDatabaseHas('user_mfas', [
            'user_id' => $user->id,
        ]);

        $userMfa = $user->fresh()->mfa;
        $this->assertNotNull($userMfa);
        $this->assertFalse($userMfa->isEnabled());
        $this->assertNotEmpty($userMfa->recovery_codes);
    }

    /**
     * Test MFA setup with invalid password.
     */
    public function test_mfa_setup_with_invalid_password(): void
    {
        $user = $this->createAuthenticatedUser();

        $response = $this->postJson('/api/auth/mfa/setup', [
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    /**
     * Test MFA enable with valid code.
     */
    public function test_mfa_enable_with_valid_code(): void
    {
        $user = $this->createAuthenticatedUser();
        
        // Setup MFA first
        $mfaService = app(MFAService::class);
        $secret = $mfaService->generateSecret($user);
        $mfaService->setupMfa($user, $secret);

        // Generate a valid TOTP code
        $totp = TOTP::create($secret);
        $validCode = $totp->now();

        // Enable MFA with valid code
        $response = $this->postJson('/api/auth/mfa/enable', [
            'code' => $validCode,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'MFA has been successfully enabled for your account.',
                'enabled' => true,
            ]);

        // Assert MFA is now enabled
        $userMfa = $user->fresh()->mfa;
        $this->assertTrue($userMfa->isEnabled());
    }

    /**
     * Test MFA enable with invalid code.
     */
    public function test_mfa_enable_with_invalid_code(): void
    {
        $user = $this->createAuthenticatedUser();
        
        // Setup MFA first
        $mfaService = app(MFAService::class);
        $secret = $mfaService->generateSecret($user);
        $mfaService->setupMfa($user, $secret);

        // Enable MFA with invalid code
        $response = $this->postJson('/api/auth/mfa/enable', [
            'code' => '123456',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'error' => 'Invalid code',
                'message' => 'The provided verification code is incorrect.',
            ]);

        // Assert MFA is still not enabled
        $userMfa = $user->fresh()->mfa;
        $this->assertFalse($userMfa->isEnabled());
    }

    /**
     * Test MFA enable without setup.
     */
    public function test_mfa_enable_without_setup(): void
    {
        $user = $this->createAuthenticatedUser();

        $response = $this->postJson('/api/auth/mfa/enable', [
            'code' => '123456',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'error' => 'Invalid code',
                'message' => 'The provided verification code is incorrect.',
            ]);
    }

    /**
     * Test MFA disable with password.
     */
    public function test_mfa_disable_with_password(): void
    {
        $user = $this->createAuthenticatedUser();
        
        // Setup and enable MFA
        $mfaService = app(MFAService::class);
        $secret = $mfaService->generateSecret($user);
        $mfaService->setupMfa($user, $secret);
        $mfaService->enableMfa($user);

        // Disable MFA with password
        $response = $this->postJson('/api/auth/mfa/disable', [
            'password' => 'password',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'MFA has been successfully disabled for your account.',
                'disabled' => true,
            ]);

        // Assert MFA is now disabled
        $userMfa = $user->fresh()->mfa;
        $this->assertFalse($userMfa->isEnabled());
    }

    /**
     * Test MFA disable with invalid password.
     */
    public function test_mfa_disable_with_invalid_password(): void
    {
        $user = $this->createAuthenticatedUser();
        
        // Setup and enable MFA
        $mfaService = app(MFAService::class);
        $secret = $mfaService->generateSecret($user);
        $mfaService->setupMfa($user, $secret);
        $mfaService->enableMfa($user);

        // Disable MFA with invalid password
        $response = $this->postJson('/api/auth/mfa/disable', [
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);

        // Assert MFA is still enabled
        $userMfa = $user->fresh()->mfa;
        $this->assertTrue($userMfa->isEnabled());
    }

    /**
     * Test MFA verification during login.
     */
    public function test_mfa_verification_during_login(): void
    {
        $user = User::factory()->create();
        
        // Setup and enable MFA
        $mfaService = app(MFAService::class);
        $secret = $mfaService->generateSecret($user);
        $mfaService->setupMfa($user, $secret);
        $mfaService->enableMfa($user);

        // Generate a valid TOTP code
        $totp = TOTP::create($secret);
        $validCode = $totp->now();

        // Verify MFA code
        $response = $this->postJson('/api/auth/mfa/verify', [
            'code' => $validCode,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'MFA verification successful.',
                'verified' => true,
            ]);
    }

    /**
     * Test MFA verification with invalid code during login.
     */
    public function test_mfa_verification_with_invalid_code_during_login(): void
    {
        $user = $this->createAuthenticatedUser();
        
        // Setup and enable MFA
        $mfaService = app(MFAService::class);
        $secret = $mfaService->generateSecret($user);
        $mfaService->setupMfa($user, $secret);
        $mfaService->enableMfa($user);

        // Verify MFA with invalid code
        $response = $this->postJson('/api/auth/mfa/verify', [
            'code' => '123456',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'error' => 'Invalid code',
                'message' => 'The provided verification code is incorrect.',
            ]);
    }

    /**
     * Test recovery code usage.
     */
    public function test_recovery_code_usage(): void
    {
        $user = $this->createAuthenticatedUser();
        
        // Setup and enable MFA
        $mfaService = app(MFAService::class);
        $secret = $mfaService->generateSecret($user);
        $recoveryCodes = $mfaService->generateRecoveryCodes();
        $mfaService->setupMfa($user, $secret);
        $mfaService->enableMfa($user);

        // Get the first recovery code
        $recoveryCode = $recoveryCodes[0];

        // Verify recovery code
        $response = $this->postJson('/api/auth/mfa/verify', [
            'code' => $recoveryCode,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'MFA verification successful.',
                'verified' => true,
            ]);

        // Assert recovery code was consumed
        $userMfa = $user->fresh()->mfa;
        $this->assertEquals(count($recoveryCodes) - 1, $userMfa->getRemainingRecoveryCodesCount());
    }

    /**
     * Test MFA status endpoint.
     */
    public function test_mfa_status_endpoint(): void
    {
        $user = $this->createAuthenticatedUser();

        // Test status without MFA setup
        $response = $this->getJson('/api/auth/mfa/status');
        $response->assertStatus(200)
            ->assertJson([
                'enabled' => false,
                'setup' => false,
                'recovery_codes_count' => 0,
            ]);

        // Setup MFA
        $mfaService = app(MFAService::class);
        $secret = $mfaService->generateSecret($user);
        $recoveryCodes = $mfaService->generateRecoveryCodes();
        $mfaService->setupMfa($user, $secret);

        // Test status with MFA setup but not enabled
        $response = $this->getJson('/api/auth/mfa/status');
        $response->assertStatus(200)
            ->assertJson([
                'enabled' => false,
                'setup' => true,
                'recovery_codes_count' => count($recoveryCodes),
            ]);

        // Enable MFA
        $mfaService->enableMfa($user);

        // Test status with MFA enabled
        $response = $this->getJson('/api/auth/mfa/status');
        $response->assertStatus(200)
            ->assertJson([
                'enabled' => true,
                'setup' => true,
                'recovery_codes_count' => count($recoveryCodes),
            ]);
    }

    /**
     * Test MFA without authentication.
     */
    public function test_mfa_endpoints_without_authentication(): void
    {
        // Test setup endpoint
        $this->postJson('/api/auth/mfa/setup', [
            'password' => 'password',
        ])->assertStatus(401);

        // Test enable endpoint
        $this->postJson('/api/auth/mfa/enable', [
            'code' => '123456',
        ])->assertStatus(401);

        // Test disable endpoint
        $this->postJson('/api/auth/mfa/disable', [
            'password' => 'password',
        ])->assertStatus(401);

        // Test status endpoint
        $this->getJson('/api/auth/mfa/status')->assertStatus(401);
    }

    /**
     * Test MFA secret encryption.
     */
    public function test_mfa_secret_encryption(): void
    {
        $user = $this->createAuthenticatedUser();
        
        // Setup MFA
        $mfaService = app(MFAService::class);
        $secret = $mfaService->generateSecret($user);
        $mfaService->setupMfa($user, $secret);

        // Get the raw database record
        $userMfa = UserMFA::where('user_id', $user->id)->first();
        
        // Assert secret is encrypted in database
        $this->assertNotEquals($secret, $userMfa->getAttributes()['secret']);
        
        // Assert we can still decrypt it
        $this->assertEquals($secret, $userMfa->secret);
    }

    /**
     * Test MFA recovery codes hashing.
     */
    public function test_mfa_recovery_codes_hashing(): void
    {
        $user = $this->createAuthenticatedUser();
        
        // Setup MFA
        $mfaService = app(MFAService::class);
        $secret = $mfaService->generateSecret($user);
        $recoveryCodes = $mfaService->generateRecoveryCodes();
        $mfaService->setupMfa($user, $secret);

        // Get the raw database record
        $userMfa = UserMFA::where('user_id', $user->id)->first();
        
        // Assert recovery codes are hashed in database
        $storedCodes = $userMfa->getAttributes()['recovery_codes'];
        $this->assertNotEquals(json_encode($recoveryCodes), $storedCodes);
        
        // Assert we can still verify them
        $this->assertTrue($userMfa->verifyRecoveryCode($recoveryCodes[0]));
    }

    /**
     * Test MFA with multiple recovery code usage.
     */
    public function test_multiple_recovery_code_usage(): void
    {
        $user = $this->createAuthenticatedUser();
        
        // Setup and enable MFA
        $mfaService = app(MFAService::class);
        $secret = $mfaService->generateSecret($user);
        $recoveryCodes = $mfaService->generateRecoveryCodes();
        $mfaService->setupMfa($user, $secret);
        $mfaService->enableMfa($user);

        // Use multiple recovery codes
        for ($i = 0; $i < 3; $i++) {
            $response = $this->postJson('/api/auth/mfa/verify', [
                'code' => $recoveryCodes[$i],
            ]);

            $response->assertStatus(200);
        }

        // Assert recovery codes were consumed
        $userMfa = $user->fresh()->mfa;
        $this->assertEquals(count($recoveryCodes) - 3, $userMfa->getRemainingRecoveryCodesCount());
    }

    /**
     * Test MFA with expired recovery code.
     */
    public function test_mfa_with_used_recovery_code(): void
    {
        $user = $this->createAuthenticatedUser();
        
        // Setup and enable MFA
        $mfaService = app(MFAService::class);
        $secret = $mfaService->generateSecret($user);
        $recoveryCodes = $mfaService->generateRecoveryCodes();
        $mfaService->setupMfa($user, $secret);
        $mfaService->enableMfa($user);

        // Use a recovery code
        $recoveryCode = $recoveryCodes[0];
        $userMfa = $user->mfa;
        $userMfa->verifyRecoveryCode($recoveryCode);

        // Try to use the same recovery code again
        $response = $this->postJson('/api/auth/mfa/verify', [
            'code' => $recoveryCode,
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'error' => 'Invalid code',
                'message' => 'The provided verification code is incorrect.',
            ]);
    }
}