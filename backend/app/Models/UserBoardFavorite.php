<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class UserBoardFavorite extends Pivot
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'user_board_favorites';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'board_id',
    ];

    /**
     * Indicates if the ID is auto-incrementing.
     *
     * @var bool
     */
    public $incrementing = true; // Since we added an ID column in the migration
}
