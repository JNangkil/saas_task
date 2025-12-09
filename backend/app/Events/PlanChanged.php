<?php

namespace App\Events;

use App\Models\Plan;
use App\Models\Subscription;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PlanChanged
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(
        public Subscription $subscription,
        public Plan $oldPlan,
        public Plan $newPlan,
        public array $data = []
    ) {
        $this->data = array_merge([
            'change_reason' => 'user_initiated', // user_initiated, admin_change, auto_upgrade, downgrade_limits
            'change_type' => $this->determineChangeType($oldPlan, $newPlan), // upgrade, downgrade, lateral
            'prorated' => false,
            'proration_amount' => 0,
            'effective_immediately' => false,
            'billing_cycle_change' => false,
            'old_price' => $oldPlan->price,
            'new_price' => $newPlan->price,
            'price_difference' => $newPlan->price - $oldPlan->price,
            'limits_changed' => $this->getChangedLimits($oldPlan, $newPlan),
        ], $data);
    }

    /**
     * Determine the type of change (upgrade, downgrade, or lateral).
     */
    private function determineChangeType(Plan $oldPlan, Plan $newPlan): string
    {
        if ($newPlan->price > $oldPlan->price) {
            return 'upgrade';
        } elseif ($newPlan->price < $oldPlan->price) {
            return 'downgrade';
        }

        return 'lateral';
    }

    /**
     * Get the limits that changed between plans.
     */
    private function getChangedLimits(Plan $oldPlan, Plan $newPlan): array
    {
        $changed = [];
        $limits = ['max_users', 'max_workspaces', 'max_boards', 'max_storage_mb'];

        foreach ($limits as $limit) {
            $oldValue = $oldPlan->limits[$limit] ?? 0;
            $newValue = $newPlan->limits[$limit] ?? 0;

            if ($oldValue !== $newValue) {
                $changed[$limit] = [
                    'from' => $oldValue,
                    'to' => $newValue,
                ];
            }
        }

        return $changed;
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
        return 'plan.changed';
    }
}