<?php

namespace App\Services\BillingProviders;

use Illuminate\Support\Facades\Log;
use Exception;

/**
 * Factory for creating billing provider instances.
 * 
 * This factory provides a centralized way to create billing provider
 * instances based on configuration. It's designed to be extensible
 * to support multiple billing providers in the future.
 */
class BillingProviderFactory
{
    /**
     * Create a billing provider instance.
     *
     * @param string|null $provider The name of the provider to create
     * @return BillingProviderInterface The billing provider instance
     * @throws Exception If the provider is not supported
     */
    public static function create(?string $provider = null): BillingProviderInterface
    {
        $providerName = $provider ?? config('billing.default_provider', 'stripe');

        return match ($providerName) {
            'stripe' => self::createStripeProvider(),
            default => throw new Exception("Unsupported billing provider: {$providerName}"),
        };
    }

    /**
     * Create a Stripe billing provider instance.
     *
     * @return StripeBillingProvider The Stripe billing provider
     * @throws Exception If Stripe is not properly configured
     */
    private static function createStripeProvider(): StripeBillingProvider
    {
        // Check if Stripe is properly configured
        $secretKey = config('services.stripe.secret');
        if (empty($secretKey)) {
            Log::error('Stripe billing provider cannot be created: API key not configured');
            throw new Exception('Stripe is not properly configured. Please set STRIPE_SECRET in your environment.');
        }

        return new StripeBillingProvider();
    }

    /**
     * Get a list of supported billing providers.
     *
     * @return array<string, string> Array of provider names and their display names
     */
    public static function getSupportedProviders(): array
    {
        return [
            'stripe' => 'Stripe',
        ];
    }

    /**
     * Check if a billing provider is supported.
     *
     * @param string $provider The provider name to check
     * @return bool True if the provider is supported, false otherwise
     */
    public static function isSupported(string $provider): bool
    {
        return array_key_exists($provider, self::getSupportedProviders());
    }

    /**
     * Get the default billing provider.
     *
     * @return string The name of the default provider
     */
    public static function getDefaultProvider(): string
    {
        return config('billing.default_provider', 'stripe');
    }
}