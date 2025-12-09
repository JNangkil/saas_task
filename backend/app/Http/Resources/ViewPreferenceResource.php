<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ViewPreferenceResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'preferred_view' => $this->preferred_view,
            'kanban_config' => $this->kanban_config ?? [],
            'calendar_config' => $this->calendar_config ?? [],
            'filters' => $this->filters ?? [],
            'updated_at' => $this->updated_at,
        ];
    }
}
