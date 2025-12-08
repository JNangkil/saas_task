<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Checkout Session Request
 * 
 * Validates requests for creating checkout sessions for new subscriptions.
 * Ensures proper plan selection and billing parameters.
 */
class CheckoutSessionRequest extends FormRequest
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
            'success_url' => [
                'sometimes',
                'url',
                'max:2048',
            ],
            'cancel_url' => [
                'sometimes',
                'url',
                'max:2048',
            ],
            'customer_email' => [
                'sometimes',
                'email',
                'max:255',
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
            
            'success_url.url' => 'Success URL must be a valid URL',
            'success_url.max' => 'Success URL may not be greater than 2048 characters',
            
            'cancel_url.url' => 'Cancel URL must be a valid URL',
            'cancel_url.max' => 'Cancel URL may not be greater than 2048 characters',
            
            'customer_email.email' => 'Customer email must be a valid email address',
            'customer_email.max' => 'Customer email may not be greater than 255 characters',
            
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
            'success_url' => 'success URL',
            'cancel_url' => 'cancel URL',
            'customer_email' => 'customer email',
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

            // Validate success and cancel URLs if both are provided
            if ($this->has('success_url') && $this->has('cancel_url')) {
                if ($this->success_url === $this->cancel_url) {
                    $validator->errors()->add('cancel_url', 'Success and cancel URLs must be different.');
                }
            }

            // Validate customer email against tenant if tenant has billing email
            $tenant = $this->attributes->get('tenant');
            if ($tenant && $tenant->billing_email && $this->has('customer_email')) {
                if ($this->customer_email !== $tenant->billing_email) {
                    $validator->errors()->add('customer_email', 'Customer email must match the tenant billing email.');
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
        
        // Add default URLs if not provided
        if (!isset($validated['success_url'])) {
            $validated['success_url'] = config('app.url') . '/billing/success?session_id={CHECKOUT_SESSION_ID}';
        }
        
        if (!isset($validated['cancel_url'])) {
            $validated['cancel_url'] = config('app.url') . '/billing/cancel';
        }
        
        // Use tenant billing email if no customer email provided
        $tenant = $this->attributes->get('tenant');
        if ($tenant && !isset($validated['customer_email']) && $tenant->billing_email) {
            $validated['customer_email'] = $tenant->billing_email;
        }
        
        return $validated;
    }
}