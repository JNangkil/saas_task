<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class WorkspaceRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // For create requests, check if user can create workspaces in tenant
        if ($this->isMethod('POST')) {
            $tenantId = $this->route('tenant');
            if (!$tenantId) {
                return false;
            }
            
            return auth()->user()->can('create-workspaces');
        }

        // For update/delete requests, check if user can manage the workspace
        $workspace = $this->route('workspace');
        if (!$workspace) {
            return false;
        }

        return $workspace->canUserManage(auth()->user());
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
            'description' => 'nullable|string|max:1000',
            'color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'icon' => 'nullable|string|max:50',
            'is_default' => 'sometimes|boolean',
        ];

        // Add unique name rule for create requests
        if ($this->isMethod('POST')) {
            $tenantId = $this->route('tenant');
            $rules['name'] = 'required|string|max:255|unique:workspaces,name,NULL,tenant_id,' . $tenantId;
        } else {
            // For update requests, ensure unique name within the same tenant
            $workspaceId = $this->route('workspace');
            $rules['name'] = 'required|string|max:255|unique:workspaces,name,' . $workspaceId . ',id,tenant_id';
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
            'name.required' => 'Workspace name is required',
            'name.max' => 'Workspace name may not be greater than 255 characters',
            'name.unique' => 'Workspace name has already been taken in this tenant',
            'description.max' => 'Description may not be greater than 1000 characters',
            'color.regex' => 'Color must be a valid hex color code (e.g., #3B82F6)',
            'icon.max' => 'Icon may not be greater than 50 characters',
            'is_default.boolean' => 'Is default must be a boolean value',
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
            'name' => 'workspace name',
            'description' => 'description',
            'color' => 'color',
            'icon' => 'icon',
            'is_default' => 'is default',
        ];
    }
}