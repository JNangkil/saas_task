<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class WorkspaceRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = auth()->user();
        
        // For create requests, check if user can create workspaces in tenant
        if ($this->isMethod('POST')) {
            $tenantId = $this->route('tenant');
            if (!$tenantId) {
                return false;
            }
            
            // Check if user belongs to the tenant
            $tenant = $user->tenants()->find($tenantId);
            if (!$tenant) {
                return false;
            }
            
            return $user->can('createInTenant', $tenantId);
        }

        // For update/delete requests, check if user can manage the workspace
        $workspace = $this->route('workspace');
        if (!$workspace) {
            return false;
        }

        return $user->can('update', $workspace);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        $workspaceId = $this->route('workspace')?->id;
        $tenantId = $this->route('tenant') ?? $this->route('workspace')?->tenant_id;
        
        $rules = [
            'name' => [
                'required',
                'string',
                'max:255',
                'min:2',
                Rule::unique('workspaces', 'name')
                    ->where('tenant_id', $tenantId)
                    ->ignore($workspaceId),
            ],
            'description' => 'nullable|string|max:1000',
            'color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'icon' => 'nullable|string|max:50|emoji',
            'is_default' => 'sometimes|boolean',
            'is_archived' => 'sometimes|boolean',
            'settings' => 'sometimes|array',
            'settings.theme' => 'sometimes|string|in:light,dark',
            'settings.allow_guest_access' => 'sometimes|boolean',
            'settings.default_board_view' => 'sometimes|string|in:list,board,calendar',
            'settings.task_auto_archive' => 'sometimes|boolean',
            'settings.task_auto_archive_days' => 'sometimes|integer|min:1|max:365',
        ];

        // Additional validation for setting default workspace
        if ($this->isMethod('PUT') && $this->boolean('is_default')) {
            // Will be validated in withValidator method
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
            'name.min' => 'Workspace name must be at least 2 characters',
            'name.max' => 'Workspace name may not be greater than 255 characters',
            'name.unique' => 'Workspace name has already been taken in this tenant',
            'description.max' => 'Description may not be greater than 1000 characters',
            'color.regex' => 'Color must be a valid hex color code (e.g., #3B82F6)',
            'icon.max' => 'Icon may not be greater than 50 characters',
            'icon.emoji' => 'Icon must be a valid emoji character',
            'is_default.boolean' => 'Is default must be a boolean value',
            'is_archived.boolean' => 'Is archived must be a boolean value',
            'settings.theme.in' => 'Theme must be either light or dark',
            'settings.allow_guest_access.boolean' => 'Allow guest access must be a boolean value',
            'settings.default_board_view.in' => 'Default board view must be one of: list, board, calendar',
            'settings.task_auto_archive.boolean' => 'Task auto archive must be a boolean value',
            'settings.task_auto_archive_days.min' => 'Task auto archive days must be at least 1',
            'settings.task_auto_archive_days.max' => 'Task auto archive days may not be greater than 365',
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
            'is_archived' => 'is archived',
            'settings' => 'settings',
            'settings.theme' => 'theme setting',
            'settings.allow_guest_access' => 'allow guest access setting',
            'settings.default_board_view' => 'default board view setting',
            'settings.task_auto_archive' => 'task auto archive setting',
            'settings.task_auto_archive_days' => 'task auto archive days setting',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Convert empty strings to null for nullable fields
        $this->merge([
            'description' => $this->description === '' ? null : $this->description,
            'color' => $this->color === '' ? null : $this->color,
            'icon' => $this->icon === '' ? null : $this->icon,
        ]);

        // Sanitize color format
        if ($this->has('color') && $this->color) {
            $this->merge([
                'color' => strtoupper($this->color),
            ]);
        }
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            // Additional validation for default workspace
            if ($this->isMethod('PUT') && $this->boolean('is_default')) {
                $workspace = $this->route('workspace');
                if ($workspace && $workspace->is_default) {
                    // Already default, no validation needed
                    return;
                }
                
                // Check if there's already a default workspace in the tenant
                $tenantId = $workspace->tenant_id ?? $this->route('tenant');
                if ($tenantId) {
                    $existingDefault = \App\Models\Workspace::where('tenant_id', $tenantId)
                        ->where('is_default', true)
                        ->where('id', '!=', $workspace->id ?? 0)
                        ->first();
                    
                    if ($existingDefault) {
                        $validator->errors()->add('is_default', 'There is already a default workspace in this tenant. Please unset the default status first.');
                    }
                }
            }

            // Additional validation for archiving default workspace
            if ($this->isMethod('PUT') && $this->boolean('is_archived')) {
                $workspace = $this->route('workspace');
                if ($workspace && $workspace->is_default) {
                    $validator->errors()->add('is_archived', 'Cannot archive the default workspace. Please set another workspace as default first.');
                }
            }

            // Validation for task auto archive settings
            if ($this->boolean('settings.task_auto_archive') && !$this->has('settings.task_auto_archive_days')) {
                $validator->errors()->add('settings.task_auto_archive_days', 'Task auto archive days is required when task auto archive is enabled.');
            }

            // Check workspace limits for tenant
            if ($this->isMethod('POST')) {
                $tenantId = $this->route('tenant');
                $user = auth()->user();
                
                if ($tenantId && $user) {
                    $tenant = $user->tenants()->find($tenantId);
                    if ($tenant) {
                        $workspaceCount = $tenant->workspaces()->count();
                        $planLimits = $tenant->getPlanLimits();
                        
                        if (isset($planLimits['max_workspaces']) && $workspaceCount >= $planLimits['max_workspaces']) {
                            $validator->errors()->add('name', 'You have reached the maximum number of workspaces allowed for your plan.');
                        }
                    }
                }
            }
        });
    }
}