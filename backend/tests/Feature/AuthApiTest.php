<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_and_receive_token(): void
    {
        $payload = [
            'name' => 'Jane Doe',
            'company_name' => 'Acme Inc',
            'email' => 'jane@example.com',
            'password' => 'Secure123',
            'password_confirmation' => 'Secure123',
            'locale' => 'en',
        ];

        $response = $this->postJson('/api/auth/register', $payload);

        $response->assertCreated()
            ->assertJsonStructure(['token', 'user' => ['id', 'email', 'displayName', 'roles']]);

        $this->assertDatabaseHas('users', [
            'email' => 'jane@example.com',
            'company_name' => 'Acme Inc',
        ]);
    }

    public function test_user_can_login_and_receive_token(): void
    {
        $user = User::factory()->create([
            'email' => 'john@example.com',
            'password' => Hash::make('Secure123'),
            'roles' => ['Owner'],
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'Secure123',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'email']]);
    }
}
