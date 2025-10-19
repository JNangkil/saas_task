<?php

namespace App\Http\Requests\Onboarding;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CompleteOnboardingRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'company_name' => ['required', 'string', 'max:120'],
            'team_size' => ['required', Rule::in(['1-5', '6-15', '16-50', '51+'])],
            'work_style' => ['required', Rule::in(['remote', 'hybrid', 'in-office'])],
            'invites' => ['nullable', 'array'],
            'invites.*' => ['required_with:invites', 'email'],
            'plan' => ['required', Rule::in(['starter', 'growth', 'scale'])],
        ];
    }
}
