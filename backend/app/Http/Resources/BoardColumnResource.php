<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Enums\ColumnType;

class BoardColumnResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param Request $request
     * @return array
     */
    public function toArray(Request $request): array
    {
        $columnType = ColumnType::tryFrom($this->type);
        
        return [
            'id' => $this->id,
            'board_id' => $this->board_id,
            'name' => $this->name,
            'type' => $this->type,
            'type_label' => $columnType?->getLabel(),
            'type_icon' => $columnType?->getIcon(),
            'options' => $this->options,
            'position' => $this->position,
            'width' => $this->width,
            'is_pinned' => $this->is_pinned,
            'is_required' => $this->is_required,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            
            // Type-specific information
            'validation_rules' => $columnType?->getValidationRules(),
            'filter_operators' => $columnType?->getFilterOperators(),
            'frontend_component' => $columnType?->getFrontendComponent(),
            'supports_multiple_values' => $columnType?->supportsMultipleValues(),
            'database_cast' => $columnType?->getDatabaseCast(),
            'json_schema' => $columnType?->getJsonSchema(),
            
            // Computed properties
            'is_system' => $this->isSystemColumn(),
            'is_filterable' => $this->isFilterable(),
            'is_sortable' => $this->isSortable(),
            'default_value' => $this->getDefaultValue(),
            
            // Relationships
            'task_field_values_count' => $this->whenCounted('taskFieldValues'),
            
            // User-specific preferences (when available)
            'user_preferences' => $this->when($request->has('include_preferences'), function () {
                $user = auth()->user();
                if (!$user) {
                    return null;
                }

                $preference = $this->board->userBoardPreferences()
                    ->where('user_id', $user->id)
                    ->first();

                if (!$preference) {
                    return null;
                }

                return $preference->getColumnPreference($this->id);
            }),
        ];
    }

    /**
     * Determine if this is a system column.
     */
    protected function isSystemColumn(): bool
    {
        $systemColumns = ['title', 'status', 'priority', 'assignee', 'due_date'];
        return in_array($this->type, $systemColumns);
    }

    /**
     * Determine if this column is filterable.
     */
    protected function isFilterable(): bool
    {
        $columnType = ColumnType::tryFrom($this->type);
        return $columnType ? ColumnType::filterable()->contains($columnType) : false;
    }

    /**
     * Determine if this column is sortable.
     */
    protected function isSortable(): bool
    {
        $columnType = ColumnType::tryFrom($this->type);
        return $columnType ? ColumnType::sortable()->contains($columnType) : false;
    }

    /**
     * Get the default value for this column type.
     */
    protected function getDefaultValue(): mixed
    {
        $columnType = ColumnType::tryFrom($this->type);
        return $columnType?->getDefaultOptions();
    }
}