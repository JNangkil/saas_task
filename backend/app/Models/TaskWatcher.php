<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class TaskWatcher extends Pivot
{
    protected $table = 'task_watchers';

    protected $fillable = [
        'task_id',
        'user_id',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];
}
