<?php

namespace App\Events;

use App\Models\Subscription;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SubscriptionRenewed
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(
        public Subscription $subscription,
        public array $data = []
    ) {
        $this->data = array_merge([
            'renewal_count' => 1,
            'auto_renewed' => true,
            'next_billing_date' => $this->subscription->billing_period_end,
            'renewal_period' => 'month', // month, year
            'payment_successful' => true,
            'payment_method' => 'card',
            'loyalty_discount_applied' => false,
            'loyalty_discount_percentage' => 0,
            'price_locked' => false,
            'grace_period_used' => false,
            'warnings_sent' => 0,
        ], $data);
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('tenant.' . $this->subscription->tenant_id),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'subscription.renewed';
    }
}