<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessStripeWebhook;
use App\Services\BillingProviders\BillingProviderFactory;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Exception;

/**
 * Webhook Controller
 * 
 * Handles payment provider webhook events for subscription management.
 * Processes Stripe webhook events asynchronously and updates subscription states.
 */
class WebhookController extends Controller
{
    /**
     * The billing provider instance.
     */
    protected $billingProvider;

    /**
     * Create a new controller instance.
     */
    public function __construct()
    {
        $this->billingProvider = BillingProviderFactory::create();
    }

    /**
     * Handle Stripe webhook events.
     * 
     * Processes incoming webhook events from Stripe, verifies signatures,
     * and updates subscription states accordingly.
     * 
     * @param Request $request The incoming webhook request
     * @return JsonResponse HTTP response indicating webhook processing status
     */
    public function handleStripeWebhook(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $signature = $request->header('Stripe-Signature');

        // Verify webhook signature
        if (!$this->billingProvider->verifyWebhookSignature($payload, $signature)) {
            Log::error('Invalid Stripe webhook signature', [
                'signature' => $signature,
                'ip' => $request->ip(),
            ]);

            return response()->json(['error' => 'Invalid signature'], 401);
        }

        // Parse the event
        $event = json_decode($payload, true);
        
        if (!$event || !isset($event['type'], $event['id'])) {
            Log::error('Malformed Stripe webhook payload', [
                'payload' => $payload,
            ]);

            return response()->json(['error' => 'Malformed payload'], 400);
        }

        // Check for idempotency to prevent duplicate processing
        $eventId = $event['id'];
        if ($this->isEventProcessed($eventId)) {
            Log::info('Stripe webhook event already processed', [
                'event_id' => $eventId,
                'event_type' => $event['type'],
            ]);

            return response()->json(['message' => 'Event already processed'], 200);
        }

        Log::info('Processing Stripe webhook event', [
            'event_id' => $eventId,
            'event_type' => $event['type'],
        ]);

        try {
            // Dispatch job for asynchronous processing
            ProcessStripeWebhook::dispatch($event);

            Log::info('Stripe webhook event dispatched for processing', [
                'event_id' => $eventId,
                'event_type' => $event['type'],
            ]);

            return response()->json(['message' => 'Webhook received and queued for processing'], 202);
        } catch (Exception $e) {
            Log::error('Failed to process Stripe webhook event', [
                'event_id' => $eventId,
                'event_type' => $event['type'],
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Return error but don't retry for certain exceptions
            $statusCode = $this->getWebhookErrorStatusCode($e);
            
            return response()->json([
                'error' => 'Webhook processing failed',
                'message' => $e->getMessage(),
            ], $statusCode);
        }
    }

    /**
     * Check if a webhook event has already been processed.
     *
     * @param string $eventId The Stripe event ID
     * @return bool True if event has been processed
     */
    protected function isEventProcessed(string $eventId): bool
    {
        return DB::table('processed_webhook_events')
            ->where('event_id', $eventId)
            ->where('provider', 'stripe')
            ->exists();
    }

    /**
     * Get the appropriate HTTP status code for webhook errors.
     *
     * @param Exception $e The exception that occurred
     * @return int HTTP status code
     */
    protected function getWebhookErrorStatusCode(Exception $e): int
    {
        // Don't retry for client errors (4xx)
        if ($e instanceof \InvalidArgumentException) {
            return 400;
        }

        // Retry for server errors (5xx)
        return 500;
    }
}