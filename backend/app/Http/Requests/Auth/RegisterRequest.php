<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'company_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email:filter', 'max:255', 'unique:users,email'],
            'password' => [
                'required',
                'string',
                'min:8',
                'max:255',
                'regex:/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/',
                'confirmed',
            ],
            'locale' => ['sometimes', 'string', 'in:en,es,fr'],
        ];
    }

    /**
     * Custom messages for specific rule failures.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'password.regex' => 'Password must include at least one uppercase letter, one lowercase letter, and one number.',
        ];
    }
}
