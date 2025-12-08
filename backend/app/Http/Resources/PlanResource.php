<?php

namespace App\Http\Resources;

use App\Models\Plan;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlanResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $data = [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'price' => (string) $this->price,
            'formatted_price' => $this->formatted_price,
            'billing_interval' => $this->billing_interval,
            'billing_interval_display' => $this->billing_interval_display,
            'trial_days' => $this->trial_days,
            'features' => $this->features ?? [],
            'limits' => $this->limits ?? [],
            'is_popular' => $this->is_popular ?? false,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];

        // Add metadata if it exists
        if (isset($this->metadata)) {
            $data['metadata'] = $this->metadata;
        } else {
            $data['metadata'] = [];
        }

        // Add description if it exists in metadata
        if (isset($this->metadata['description'])) {
            $data['description'] = $this->metadata['description'];
        } else {
            // Generate a default description based on plan name
            $data['description'] = $this->generateDefaultDescription();
        }

        // Add promotional message if it exists in metadata
        if (isset($this->metadata['promotional_message'])) {
            $data['promotional_message'] = $this->metadata['promotional_message'];
        } else {
            // Generate a default promotional message
            $data['promotional_message'] = $this->generatePromotionalMessage();
        }

        // Add currency information (defaulting to USD)
        $data['currency'] = $this->metadata['currency'] ?? 'USD';
        $data['currency_symbol'] = $this->metadata['currency_symbol'] ?? '$';

        // Add yearly discount information if applicable
        if ($this->billing_interval === 'year') {
            $monthlyEquivalent = Plan::where('name', $this->name)
                ->where('billing_interval', 'month')
                ->first();
                
            if ($monthlyEquivalent) {
                $monthlyPrice = $monthlyEquivalent->price;
                $yearlyMonthlyEquivalent = $this->price / 12;
                $discount = (($monthlyPrice - $yearlyMonthlyEquivalent) / $monthlyPrice) * 100;
                
                $data['yearly_discount_percentage'] = round($discount, 0);
                $data['monthly_equivalent'] = (string) $yearlyMonthlyEquivalent;
                $data['monthly_equivalent_formatted'] = '$' . number_format($yearlyMonthlyEquivalent, 2);
            }
        }

        // Add feature highlights (first 3 features)
        $data['feature_highlights'] = array_slice($this->features ?? [], 0, 3);

        // Add limit highlights (key limits)
        $data['limit_highlights'] = $this->getLimitHighlights();

        return $data;
    }

    /**
     * Generate a default description based on the plan name.
     */
    private function generateDefaultDescription(): string
    {
        $descriptions = [
            'starter' => 'Perfect for individuals and small teams getting started',
            'basic' => 'Great for small teams looking to grow',
            'professional' => 'Ideal for growing businesses that need more power',
            'business' => 'Designed for established businesses with advanced needs',
            'enterprise' => 'Comprehensive solution for large organizations',
            'team' => 'Collaboration-focused plan for productive teams',
            'scale' => 'Built for businesses that are scaling rapidly',
        ];

        $planName = strtolower($this->name);
        
        foreach ($descriptions as $key => $description) {
            if (str_contains($planName, $key)) {
                return $description;
            }
        }

        // Default description if no match found
        return 'Flexible plan designed to meet your business needs';
    }

    /**
     * Generate a default promotional message based on plan characteristics.
     */
    private function generatePromotionalMessage(): string
    {
        if ($this->trial_days > 0) {
            return "Start with {$this->trial_days}-day free trial";
        }

        if ($this->billing_interval === 'year') {
            return 'Save 20% with yearly billing';
        }

        if ($this->is_popular) {
            return 'Most popular choice';
        }

        return 'Flexible pricing to fit your budget';
    }

    /**
     * Get key limits to highlight for the plan.
     */
    private function getLimitHighlights(): array
    {
        $highlights = [];
        $limits = $this->limits ?? [];

        // Add user limit if it exists
        if (isset($limits['max_users'])) {
            $highlights[] = $limits['max_users'] === -1 
                ? 'Unlimited users' 
                : "Up to {$limits['max_users']} users";
        }

        // Add workspace limit if it exists
        if (isset($limits['max_workspaces'])) {
            $highlights[] = $limits['max_workspaces'] === -1 
                ? 'Unlimited workspaces' 
                : "Up to {$limits['max_workspaces']} workspaces";
        }

        // Add storage limit if it exists
        if (isset($limits['max_storage_mb'])) {
            if ($limits['max_storage_mb'] >= 1024) {
                $gb = round($limits['max_storage_mb'] / 1024, 1);
                $highlights[] = $limits['max_storage_mb'] === -1 
                    ? 'Unlimited storage' 
                    : "{$gb}GB storage";
            } else {
                $highlights[] = "{$limits['max_storage_mb']}MB storage";
            }
        }

        // Add board limit if it exists
        if (isset($limits['max_boards'])) {
            $highlights[] = $limits['max_boards'] === -1 
                ? 'Unlimited boards' 
                : "Up to {$limits['max_boards']} boards";
        }

        return $highlights;
    }
}