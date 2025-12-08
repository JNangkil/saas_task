<?php

namespace App\Http\Requests;

use App\Models\Board;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Subscription Update Request
 * 
 * Validates requests for updating subscriptions (upgrading/downgrading plans).
 * Ensures proper plan selection and billing parameters for subscription changes.
 */
class SubscriptionUpdateRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // User must be authenticated and have access to the tenant
        return $this->user() && $this->attributes->get('tenant');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'plan_id' => [
                'required',
                'integer',
                'exists:plans,id',
            ],
            'billing_interval' => [
                'required',
                'string',
                'in:month,year',
            ],
            'proration_behavior' => [
                'sometimes',
                'string',
                'in:create_prorations,none,always_invoice',
            ],
            'effective_when' => [
                'sometimes',
                'string',
                'in:immediately,period_end',
            ],
            'billing_cycle_anchor' => [
                'sometimes',
                'date',
                'after:today',
            ],
            'metadata' => [
                'sometimes',
                'array',
            ],
            'metadata.*' => [
                'string',
                'max:255',
            ],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'plan_id.required' => 'Plan ID is required',
            'plan_id.integer' => 'Plan ID must be a valid integer',
            'plan_id.exists' => 'Selected plan does not exist',
            
            'billing_interval.required' => 'Billing interval is required',
            'billing_interval.in' => 'Billing interval must be either month or year',
            
            'proration_behavior.in' => 'Proration behavior must be one of: create_prorations, none, always_invoice',
            
            'effective_when.in' => 'Effective when must be either immediately or period_end',
            
            'billing_cycle_anchor.date' => 'Billing cycle anchor must be a valid date',
            'billing_cycle_anchor.after' => 'Billing cycle anchor must be a future date',
            
            'metadata.array' => 'Metadata must be an array',
            'metadata.*.string' => 'Metadata values must be strings',
            'metadata.*.max' => 'Metadata values may not be greater than 255 characters',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'plan_id' => 'plan ID',
            'billing_interval' => 'billing interval',
            'proration_behavior' => 'proration behavior',
            'effective_when' => 'effective when',
            'billing_cycle_anchor' => 'billing cycle anchor',
            'metadata' => 'metadata',
        ];
    }

    /**
     * Configure the validator instance.
     *
     * @param  \Illuminate\Validation\Validator  $validator
     * @return void
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            // Validate that the plan exists with the specified billing interval
            if ($this->has('plan_id') && $this->has('billing_interval')) {
                $planExists = \App\Models\Plan::where('id', $this->plan_id)
                    ->where('billing_interval', $this->billing_interval)
                    ->exists();

                if (!$planExists) {
                    $validator->errors()->add('plan_id', 'The selected plan does not exist with the specified billing interval.');
                }
            }

            // Validate billing cycle anchor with effective_when
            if ($this->has('billing_cycle_anchor') && $this->has('effective_when')) {
                if ($this->effective_when === 'period_end') {
                    $validator->errors()->add('billing_cycle_anchor', 'Billing cycle anchor cannot be set when effective_when is period_end.');
                }
            }

            // Validate that the new plan is different from current plan
            $tenant = $this->attributes->get('tenant');
            if ($tenant && $this->has('plan_id')) {
                $currentSubscription = $tenant->activeSubscription()->first();
                if ($currentSubscription && $currentSubscription->plan_id == $this->plan_id) {
                    $validator->errors()->add('plan_id', 'New plan must be different from the current plan.');
                }
            }

            // Validate upgrade/downgrade logic
            if ($tenant && $this->has('plan_id') && $this->has('billing_interval')) {
                $currentSubscription = $tenant->activeSubscription()->with('plan')->first();
                if ($currentSubscription) {
                    $newPlan = \App\Models\Plan::where('id', $this->plan_id)
                        ->where('billing_interval', $this->billing_interval)
                        ->first();

                    if ($newPlan) {
                        // Check if this is actually a downgrade to a plan with lower limits
                        $currentLimits = $currentSubscription->plan->limits ?? [];
                        $newLimits = $newPlan->limits ?? [];

                        foreach (['max_users', 'max_workspaces', 'max_boards'] as $limit) {
                            $currentValue = $currentLimits[$limit] ?? 0;
                            $newValue = $newLimits[$limit] ?? 0;

                            if ($newValue > 0 && $currentValue > $newValue) {
                                // This is a potential downgrade, check current usage
                                $currentUsage = $this->getCurrentUsage($tenant);
                                $usageKey = str_replace('max_', '', $limit);
                                $currentUsageValue = $currentUsage[$usageKey] ?? 0;

                                if ($currentUsageValue > $newValue) {
                                    $validator->errors()->add('plan_id', 
                                        "Cannot downgrade to this plan. Current {$usageKey} usage ({$currentUsageValue}) exceeds new plan limit ({$newValue})."
                                    );
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Get the validated data with additional processing.
     *
     * @return array
     */
    public function validated(): array
    {
        $validated = parent::validated();
        
        // Set default proration behavior if not provided
        if (!isset($validated['proration_behavior'])) {
            $validated['proration_behavior'] = 'create_prorations';
        }
        
        // Set default effective timing if not provided
        if (!isset($validated['effective_when'])) {
            $validated['effective_when'] = 'immediately';
        }
        
        return $validated;
    }

    /**
     * Get current usage statistics for validation.
     */
    private function getCurrentUsage($tenant): array
    {
        return [
            'users' => $tenant->users()->count(),
            'workspaces' => $tenant->workspaces()->count(),
            'boards' => $tenant->boards()->count(),
        ];
    }
}