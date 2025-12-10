<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MfaEnableRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'code' => 'required|string|digits:6',
        ];
    }

    /**
     * Get custom error messages for validation rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'code.required' => 'The verification code is required.',
            'code.string' => 'The verification code must be a string.',
            'code.digits' => 'The verification code must be 6 digits.',
        ];
    }
}
