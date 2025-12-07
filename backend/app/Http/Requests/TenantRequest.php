<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TenantRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // For create requests, allow any authenticated user
        if ($this->isMethod('POST')) {
            return true;
        }

        // For update/delete requests, check if user can manage the tenant
        $tenant = $this->route('tenant');
        if (!$tenant) {
            return false;
        }

        return $tenant->canUserManage(auth()->user());
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        $rules = [
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:63|alpha_dash|unique:tenants,slug,' . $this->route('tenant')?->id,
            'logo_url' => 'nullable|url|max:2048',
            'billing_email' => 'nullable|email|max:255',
            'settings' => 'sometimes|array',
            'locale' => 'nullable|string|max:10',
            'timezone' => 'nullable|timezone',
        ];

        // Add unique slug rule for create requests
        if ($this->isMethod('POST')) {
            $rules['slug'] = 'required|string|max:63|alpha_dash|unique:tenants,slug';
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
            'name.max' => 'Tenant name may not be greater than 255 characters',
            'slug.required' => 'Tenant slug is required',
            'slug.max' => 'Tenant slug may not be greater than 63 characters',
            'slug.alpha_dash' => 'Tenant slug may only contain letters, numbers, dashes, and underscores',
            'slug.unique' => 'Tenant slug has already been taken',
            'logo_url.url' => 'Logo URL must be a valid URL',
            'logo_url.max' => 'Logo URL may not be greater than 2048 characters',
            'billing_email.email' => 'Billing email must be a valid email address',
            'billing_email.max' => 'Billing email may not be greater than 255 characters',
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
            'locale' => 'locale',
            'timezone' => 'timezone',
        ];
    }
}