<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttachmentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'filename' => $this->filename,
            'original_filename' => $this->original_filename,
            'mime_type' => $this->mime_type,
            'size' => $this->size,
            'human_readable_size' => $this->getHumanReadableSize(),
            'url' => route('attachments.download', [
                'tenant' => $this->tenant_id,
                'workspace' => $this->task ? $this->task->workspace_id : null,
                'attachment' => $this->id
            ]),
            'is_image' => $this->isImage(),
            'is_pdf' => $this->isPdf(),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'user' => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ],
        ];
    }
}