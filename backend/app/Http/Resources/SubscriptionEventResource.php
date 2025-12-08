<?php

namespace App\Http\Resources;

use App\Models\SubscriptionEvent;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Subscription Event Resource
 * 
 * Transforms subscription event data for API responses, providing a consistent
 * format for subscription events and history across all endpoints.
 */
class SubscriptionEventResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var SubscriptionEvent $event */
        $event = $this->resource;
        
        $data = [
            'id' => $event->id,
            'type' => $event->type,
            'type_display' => $event->type_display,
            'data' => $event->data ?? [],
            'processed_at' => $event->processed_at,
            'created_at' => $event->created_at,
            'updated_at' => $event->updated_at,
            
            // Status flags
            'is_processed' => $event->isProcessed(),
        ];
        
        // Include subscription information if loaded
        if ($event->relationLoaded('subscription') && $event->subscription) {
            $data['subscription'] = [
                'id' => $event->subscription->id,
                'status' => $event->subscription->status,
                'plan_id' => $event->subscription->plan_id,
            ];
        }
        
        // Add type-specific data formatting
        $data = array_merge($data, $this->formatEventDataByType($event));
        
        return $data;
    }
    
    /**
     * Format event data based on the event type.
     */
    private function formatEventDataByType(SubscriptionEvent $event): array
    {
        $eventData = $event->data ?? [];
        $additional = [];
        
        switch ($event->type) {
            case SubscriptionEvent::TYPE_CREATED:
                $additional['description'] = 'Subscription was created';
                if (isset($eventData['plan_id'])) {
                    $additional['details'] = [
                        'plan_id' => $eventData['plan_id'],
                        'trial_days' => $eventData['trial_days'] ?? null,
                    ];
                }
                break;
                
            case SubscriptionEvent::TYPE_UPDATED:
                $additional['description'] = 'Subscription was updated';
                if (isset($eventData['previous_status']) && isset($eventData['new_status'])) {
                    $additional['details'] = [
                        'previous_status' => $eventData['previous_status'],
                        'new_status' => $eventData['new_status'],
                    ];
                }
                break;
                
            case SubscriptionEvent::TYPE_CANCELED:
                $additional['description'] = 'Subscription was canceled';
                if (isset($eventData['immediately'])) {
                    $additional['details'] = [
                        'immediately' => $eventData['immediately'],
                        'ends_at' => $eventData['ends_at'] ?? null,
                        'reason' => $eventData['reason'] ?? null,
                        'feedback' => $eventData['feedback'] ?? null,
                        'canceled_by' => $eventData['canceled_by'] ?? null,
                    ];
                }
                break;
                
            case SubscriptionEvent::TYPE_EXPIRED:
                $additional['description'] = 'Subscription expired';
                $additional['details'] = [
                    'previous_status' => $eventData['previous_status'] ?? null,
                ];
                break;
                
            case SubscriptionEvent::TYPE_PAYMENT_FAILED:
                $additional['description'] = 'Payment failed';
                $additional['details'] = [
                    'error_code' => $eventData['error_code'] ?? null,
                    'error_message' => $eventData['error_message'] ?? null,
                    'attempt_count' => $eventData['attempt_count'] ?? 1,
                    'next_retry_at' => $eventData['next_retry_at'] ?? null,
                ];
                $additional['severity'] = 'error';
                break;
                
            case SubscriptionEvent::TYPE_PAYMENT_SUCCEEDED:
                $additional['description'] = 'Payment succeeded';
                $additional['details'] = [
                    'amount' => $eventData['amount'] ?? null,
                    'currency' => $eventData['currency'] ?? 'USD',
                    'receipt_url' => $eventData['receipt_url'] ?? null,
                    'invoice_id' => $eventData['invoice_id'] ?? null,
                ];
                $additional['severity'] = 'success';
                break;
                
            case SubscriptionEvent::TYPE_TRIAL_STARTED:
                $additional['description'] = 'Trial period started';
                $additional['details'] = [
                    'trial_days' => $eventData['trial_days'] ?? null,
                    'trial_ends_at' => $eventData['trial_ends_at'] ?? null,
                ];
                $additional['severity'] = 'info';
                break;
                
            case SubscriptionEvent::TYPE_TRIAL_ENDED:
                $additional['description'] = 'Trial period ended';
                $additional['details'] = [
                    'converted_to' => $eventData['new_status'] ?? null,
                    'trial_duration_days' => $eventData['trial_duration_days'] ?? null,
                ];
                $additional['severity'] = 'warning';
                break;
                
            case SubscriptionEvent::TYPE_PLAN_CHANGED:
                $additional['description'] = 'Plan was changed';
                $additional['details'] = [
                    'old_plan_id' => $eventData['old_plan_id'] ?? null,
                    'new_plan_id' => $eventData['new_plan_id'] ?? null,
                    'prorated' => $eventData['prorated'] ?? false,
                    'effective_immediately' => $eventData['effective_immediately'] ?? true,
                ];
                $additional['severity'] = 'info';
                break;
                
            case SubscriptionEvent::TYPE_RENEWED:
                $additional['description'] = 'Subscription was renewed';
                $additional['details'] = [
                    'renewal_period' => $eventData['renewal_period'] ?? null,
                    'amount' => $eventData['amount'] ?? null,
                    'currency' => $eventData['currency'] ?? 'USD',
                ];
                $additional['severity'] = 'success';
                break;
        }
        
        // Add severity if not set
        if (!isset($additional['severity'])) {
            $additional['severity'] = 'info';
        }
        
        // Add human-readable timestamp
        $additional['human_readable_date'] = $event->created_at->diffForHumans();
        $additional['formatted_date'] = $event->created_at->format('M j, Y \a\t g:i A');
        
        return $additional;
    }
}