<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class UserNotificationPreference extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'preferences',
    ];

    protected $casts = [
        'preferences' => 'array',
    ];

    /**
     * Get the user that owns the notification preferences.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the default notification preferences.
     */
    public static function getDefaultPreferences(): array
    {
        return [
            'task_assigned' => [
                'in_app' => true,
                'email' => true,
            ],
            'mention_in_comment' => [
                'in_app' => true,
                'email' => true,
            ],
            'task_due_soon' => [
                'in_app' => true,
                'email' => true,
            ],
            'task_overdue' => [
                'in_app' => true,
                'email' => true,
            ],
            'task_completed' => [
                'in_app' => false,
                'email' => false,
            ],
            'task_updated' => [
                'in_app' => false,
                'email' => false,
            ],
            'workspace_invitation' => [
                'in_app' => true,
                'email' => true,
            ],
        ];
    }

    /**
     * Check if user has enabled a specific notification type and channel.
     */
    public function isEnabled(string $type, string $channel = 'in_app'): bool
    {
        $preferences = $this->preferences ?? self::getDefaultPreferences();

        return $preferences[$type][$channel] ?? true;
    }

    /**
     * Update a specific notification preference.
     */
    public function updatePreference(string $type, string $channel, bool $enabled): void
    {
        $preferences = $this->preferences ?? self::getDefaultPreferences();
        $preferences[$type][$channel] = $enabled;

        $this->update(['preferences' => $preferences]);
    }

    /**
     * Get preferences for a specific channel.
     */
    public function getChannelPreferences(string $channel): array
    {
        $preferences = $this->preferences ?? self::getDefaultPreferences();

        return array_filter($preferences, function ($pref) use ($channel) {
            return isset($pref[$channel]);
        });
    }
}