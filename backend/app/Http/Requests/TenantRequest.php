<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TenantRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = auth()->user();
        
        // For create requests, check if user can create tenants
        if ($this->isMethod('POST')) {
            return $user->can('create', \App\Models\Tenant::class);
        }

        // For update/delete requests, check if user can manage the tenant
        $tenant = $this->route('tenant');
        if (!$tenant) {
            return false;
        }

        // Use policy for authorization
        return $user->can('update', $tenant);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        $tenantId = $this->route('tenant')?->id;
        
        $rules = [
            'name' => 'required|string|max:255|min:2',
            'slug' => [
                'required',
                'string',
                'max:63',
                'alpha_dash',
                Rule::unique('tenants', 'slug')->ignore($tenantId),
            ],
            'logo_url' => 'nullable|url|max:2048',
            'billing_email' => 'nullable|email|max:255',
            'settings' => 'sometimes|array',
            'settings.theme' => 'sometimes|string|in:light,dark',
            'settings.timezone' => 'sometimes|timezone',
            'settings.locale' => 'sometimes|string|max:10',
            'settings.features' => 'sometimes|array',
            'settings.features.*' => 'string',
            'status' => 'sometimes|string|in:active,deactivated,suspended',
            'locale' => 'nullable|string|max:10',
            'timezone' => 'nullable|timezone',
        ];

        // Additional validation for create requests
        if ($this->isMethod('POST')) {
            $rules['name'][] = 'unique:tenants,name,NULL,id';
        }

        return $rules;
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Tenant name is required',
            'name.min' => 'Tenant name must be at least 2 characters',
            'name.max' => 'Tenant name may not be greater than 255 characters',
            'name.unique' => 'Tenant name has already been taken',
            'slug.required' => 'Tenant slug is required',
            'slug.max' => 'Tenant slug may not be greater than 63 characters',
            'slug.alpha_dash' => 'Tenant slug may only contain letters, numbers, dashes, and underscores',
            'slug.unique' => 'Tenant slug has already been taken',
            'logo_url.url' => 'Logo URL must be a valid URL',
            'logo_url.max' => 'Logo URL may not be greater than 2048 characters',
            'billing_email.email' => 'Billing email must be a valid email address',
            'billing_email.max' => 'Billing email may not be greater than 255 characters',
            'settings.theme.in' => 'Theme must be either light or dark',
            'settings.timezone.timezone' => 'Settings timezone must be a valid timezone',
            'settings.locale.max' => 'Settings locale may not be greater than 10 characters',
            'status.in' => 'Status must be one of: active, deactivated, suspended',
            'locale.max' => 'Locale may not be greater than 10 characters',
            'timezone.timezone' => 'Timezone must be a valid timezone',
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
            'name' => 'tenant name',
            'slug' => 'tenant slug',
            'logo_url' => 'logo URL',
            'billing_email' => 'billing email',
            'settings' => 'settings',
            'settings.theme' => 'theme setting',
            'settings.timezone' => 'timezone setting',
            'settings.locale' => 'locale setting',
            'settings.features' => 'feature settings',
            'status' => 'tenant status',
            'locale' => 'locale',
            'timezone' => 'timezone',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Convert empty strings to null for nullable fields
        $this->merge([
            'logo_url' => $this->logo_url === '' ? null : $this->logo_url,
            'billing_email' => $this->billing_email === '' ? null : $this->billing_email,
            'locale' => $this->locale === '' ? null : $this->locale,
            'timezone' => $this->timezone === '' ? null : $this->timezone,
        ]);

        // Sanitize slug
        if ($this->has('slug')) {
            $this->merge([
                'slug' => strtolower($this->slug),
            ]);
        }
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            // Additional validation logic can be added here
            if ($this->isMethod('POST') && auth()->user()->tenants()->count() >= 5) {
                $validator->errors()->add('name', 'You have reached the maximum number of tenants allowed.');
            }
        });
    }
}