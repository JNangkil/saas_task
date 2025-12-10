<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\PasswordResetToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;
use App\Mail\PasswordReset as PasswordResetMail;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Disable mail catching for these tests
        Mail::fake();
    }

    /**
     * Test password reset request with valid email.
     */
    public function test_password_reset_request_with_valid_email(): void
    {
        // Create a test user
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => Hash::make('password'),
        ]);

        // Request password reset
        $response = $this->postJson('/api/auth/password/forgot', [
            'email' => 'test@example.com',
        ]);

        // Assert successful response
        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Password reset link has been sent to your email.',
            ]);

        // Assert password reset token was created
        $this->assertDatabaseHas('password_reset_tokens', [
            'user_id' => $user->id,
        ]);

        // Assert email was sent
        Mail::assertSent(PasswordResetMail::class, function ($mail) use ($user) {
            return $mail->resetToken->user->id === $user->id;
        });
    }

    /**
     * Test password reset request with invalid email (should still return success).
     */
    public function test_password_reset_request_with_invalid_email(): void
    {
        // Request password reset with non-existent email
        $response = $this->postJson('/api/auth/password/forgot', [
            'email' => 'nonexistent@example.com',
        ]);

        // Should still return success to prevent email enumeration
        $response->assertStatus(200)
            ->assertJson([
                'message' => 'If an account exists with this email, a password reset link has been sent.',
            ]);

        // Assert no password reset token was created
        $this->assertDatabaseMissing('password_reset_tokens', [
            'user_id' => null,
        ]);

        // Assert no email was sent
        Mail::assertNotSent(PasswordResetMail::class);
    }

    /**
     * Test password reset with valid token.
     */
    public function test_password_reset_with_valid_token(): void
    {
        // Create a test user
        $user = User::factory()->create([
            'password' => Hash::make('oldpassword'),
        ]);

        // Create a password reset token
        $resetToken = PasswordResetToken::createForUser($user, 60);

        // Reset password with valid token
        $response = $this->postJson('/api/auth/password/reset', [
            'email' => $user->email,
            'token' => $resetToken->token,
            'password' => 'newpassword',
            'password_confirmation' => 'newpassword',
        ]);

        // Assert successful response
        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Password has been successfully reset. Please log in with your new password.',
            ]);

        // Assert password was updated
        $this->assertTrue(Hash::check('newpassword', $user->fresh()->password));

        // Assert token was marked as used
        $this->assertTrue($resetToken->fresh()->isUsed());
    }

    /**
     * Test password reset with invalid token.
     */
    public function test_password_reset_with_invalid_token(): void
    {
        // Create a test user
        $user = User::factory()->create([
            'password' => Hash::make('oldpassword'),
        ]);

        // Reset password with invalid token
        $response = $this->postJson('/api/auth/password/reset', [
            'email' => $user->email,
            'token' => 'invalid-token',
            'password' => 'newpassword',
            'password_confirmation' => 'newpassword',
        ]);

        // Assert error response
        $response->assertStatus(400)
            ->assertJson([
                'error' => 'Invalid token',
                'message' => 'The reset token is invalid or has expired.',
            ]);

        // Assert password was not updated
        $this->assertTrue(Hash::check('oldpassword', $user->fresh()->password));
    }

    /**
     * Test password reset token expiration.
     */
    public function test_password_reset_token_expiration(): void
    {
        // Create a test user
        $user = User::factory()->create([
            'password' => Hash::make('oldpassword'),
        ]);

        // Create an expired password reset token
        $resetToken = PasswordResetToken::createForUser($user, -60); // Already expired

        // Reset password with expired token
        $response = $this->postJson('/api/auth/password/reset', [
            'email' => $user->email,
            'token' => $resetToken->token,
            'password' => 'newpassword',
            'password_confirmation' => 'newpassword',
        ]);

        // Assert error response
        $response->assertStatus(400)
            ->assertJson([
                'error' => 'Invalid token',
                'message' => 'The reset token is invalid or has expired.',
            ]);

        // Assert password was not updated
        $this->assertTrue(Hash::check('oldpassword', $user->fresh()->password));
    }

    /**
     * Test password reset with used token.
     */
    public function test_password_reset_with_used_token(): void
    {
        // Create a test user
        $user = User::factory()->create([
            'password' => Hash::make('oldpassword'),
        ]);

        // Create and use a password reset token
        $resetToken = PasswordResetToken::createForUser($user, 60);
        $resetToken->markAsUsed();

        // Reset password with used token
        $response = $this->postJson('/api/auth/password/reset', [
            'email' => $user->email,
            'token' => $resetToken->token,
            'password' => 'newpassword',
            'password_confirmation' => 'newpassword',
        ]);

        // Assert error response
        $response->assertStatus(400)
            ->assertJson([
                'error' => 'Invalid token',
                'message' => 'The reset token is invalid or has expired.',
            ]);

        // Assert password was not updated
        $this->assertTrue(Hash::check('oldpassword', $user->fresh()->password));
    }

    /**
     * Test password reset with mismatched email.
     */
    public function test_password_reset_with_mismatched_email(): void
    {
        // Create two test users
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        // Create a password reset token for user1
        $resetToken = PasswordResetToken::createForUser($user1, 60);

        // Reset password with user2's email but user1's token
        $response = $this->postJson('/api/auth/password/reset', [
            'email' => $user2->email,
            'token' => $resetToken->token,
            'password' => 'newpassword',
            'password_confirmation' => 'newpassword',
        ]);

        // Assert error response
        $response->assertStatus(400)
            ->assertJson([
                'error' => 'Invalid token',
                'message' => 'The reset token is invalid or has expired.',
            ]);
    }

    /**
     * Test password reset with invalid password confirmation.
     */
    public function test_password_reset_with_invalid_confirmation(): void
    {
        // Create a test user
        $user = User::factory()->create();

        // Create a password reset token
        $resetToken = PasswordResetToken::createForUser($user, 60);

        // Reset password with mismatched confirmation
        $response = $this->postJson('/api/auth/password/reset', [
            'email' => $user->email,
            'token' => $resetToken->token,
            'password' => 'newpassword',
            'password_confirmation' => 'differentpassword',
        ]);

        // Assert validation error
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    /**
     * Test password reset with short password.
     */
    public function test_password_reset_with_short_password(): void
    {
        // Create a test user
        $user = User::factory()->create();

        // Create a password reset token
        $resetToken = PasswordResetToken::createForUser($user, 60);

        // Reset password with short password
        $response = $this->postJson('/api/auth/password/reset', [
            'email' => $user->email,
            'token' => $resetToken->token,
            'password' => 'short',
            'password_confirmation' => 'short',
        ]);

        // Assert validation error
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    /**
     * Test password reset token verification.
     */
    public function test_verify_reset_token(): void
    {
        // Create a test user
        $user = User::factory()->create();

        // Create a password reset token
        $resetToken = PasswordResetToken::createForUser($user, 60);

        // Verify valid token
        $response = $this->getJson('/api/auth/password/verify?token=' . $resetToken->token);

        // Assert valid response
        $response->assertStatus(200)
            ->assertJson([
                'valid' => true,
                'message' => 'Token is valid.',
            ]);
    }

    /**
     * Test password reset token verification with invalid token.
     */
    public function test_verify_invalid_reset_token(): void
    {
        // Verify invalid token
        $response = $this->getJson('/api/auth/password/verify?token=invalid-token');

        // Assert invalid response
        $response->assertStatus(200)
            ->assertJson([
                'valid' => false,
                'message' => 'Token is invalid or has expired.',
            ]);
    }

    /**
     * Test that only one active token exists per user.
     */
    public function test_only_one_active_token_per_user(): void
    {
        // Create a test user
        $user = User::factory()->create();

        // Create first password reset token
        $firstToken = PasswordResetToken::createForUser($user, 60);

        // Create second password reset token
        $secondToken = PasswordResetToken::createForUser($user, 60);

        // Assert first token was marked as used
        $this->assertTrue($firstToken->fresh()->isUsed());

        // Assert second token is valid
        $this->assertTrue($secondToken->isValid());

        // Assert only one valid token exists
        $validTokens = PasswordResetToken::where('user_id', $user->id)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->count();
        $this->assertEquals(1, $validTokens);
    }

    /**
     * Test password reset revokes all existing tokens.
     */
    public function test_password_reset_revokes_all_tokens(): void
    {
        // Create a test user
        $user = User::factory()->create();

        // Create multiple tokens for the user
        $token1 = PasswordResetToken::createForUser($user, 60);
        $token2 = PasswordResetToken::createForUser($user, 60);
        $token3 = PasswordResetToken::createForUser($user, 60);

        // Reset password with the latest token
        $response = $this->postJson('/api/auth/password/reset', [
            'email' => $user->email,
            'token' => $token3->token,
            'password' => 'newpassword',
            'password_confirmation' => 'newpassword',
        ]);

        // Assert successful response
        $response->assertStatus(200);

        // Assert all tokens are marked as used
        $this->assertTrue($token1->fresh()->isUsed());
        $this->assertTrue($token2->fresh()->isUsed());
        $this->assertTrue($token3->fresh()->isUsed());
    }
}