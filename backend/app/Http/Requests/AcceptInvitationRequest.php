<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AcceptInvitationRequest extends FormRequest
{
    /**
     * Determine if user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // This is a public endpoint, authorization will be handled in controller
        return true;
    }

    /**
     * Get validation rules that apply to request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => 'sometimes|required|string|max:255',
            'password' => 'sometimes|required|string|min:8|confirmed',
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
            'name.required' => 'Name is required when registering',
            'name.max' => 'Name must not exceed 255 characters',
            'password.required' => 'Password is required when registering',
            'password.min' => 'Password must be at least 8 characters',
            'password.confirmed' => 'Password confirmation does not match',
        ];
    }

}