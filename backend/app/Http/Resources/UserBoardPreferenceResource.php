<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserBoardPreferenceResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param Request $request
     * @return array
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'board_id' => $this->board_id,
            'column_preferences' => $this->column_preferences,
            
            // Computed properties
            'visible_columns' => $this->getVisibleColumns(),
            'hidden_columns' => $this->getHiddenColumns(),
            'column_widths' => $this->getColumnWidths(),
            'column_positions' => $this->getColumnPositions(),
            
            // Relationships
            'user' => $this->when($request->has('include_user'), function () {
                return [
                    'id' => $this->user->id,
                    'name' => $this->user->name,
                    'email' => $this->user->email,
                ];
            }),
            
            'board' => $this->when($request->has('include_board'), function () {
                return [
                    'id' => $this->board->id,
                    'name' => $this->board->name,
                ];
            }),
            
            // Metadata
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    /**
     * Get all visible column IDs.
     */
    protected function getVisibleColumns(): array
    {
        $visible = [];
        foreach ($this->column_preferences ?? [] as $columnId => $preference) {
            if ($preference['visible'] ?? true) {
                $visible[] = (int) $columnId;
            }
        }
        return $visible;
    }

    /**
     * Get all hidden column IDs.
     */
    protected function getHiddenColumns(): array
    {
        $hidden = [];
        foreach ($this->column_preferences ?? [] as $columnId => $preference) {
            if (!($preference['visible'] ?? true)) {
                $hidden[] = (int) $columnId;
            }
        }
        return $hidden;
    }

    /**
     * Get column widths as an associative array.
     */
    protected function getColumnWidths(): array
    {
        $widths = [];
        foreach ($this->column_preferences ?? [] as $columnId => $preference) {
            if (isset($preference['width']) && $preference['width'] !== null) {
                $widths[(int) $columnId] = (float) $preference['width'];
            }
        }
        return $widths;
    }

    /**
     * Get column positions as an associative array.
     */
    protected function getColumnPositions(): array
    {
        $positions = [];
        foreach ($this->column_preferences ?? [] as $columnId => $preference) {
            if (isset($preference['position']) && $preference['position'] !== null) {
                $positions[(int) $columnId] = (int) $preference['position'];
            }
        }
        return $positions;
    }
}