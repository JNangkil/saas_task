<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SystemSettings extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'key',
        'value',
        'description',
        'type',
        'is_public',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'value' => 'array',
            'is_public' => 'boolean',
        ];
    }

    /**
     * Get a setting value by key.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        $setting = static::where('key', $key)->first();

        if (!$setting) {
            return $default;
        }

        // Cast the value based on the type
        return match($setting->type) {
            'boolean' => (bool) $setting->value['value'],
            'number' => (float) $setting->value['value'],
            'integer' => (int) $setting->value['value'],
            'array' => $setting->value,
            default => $setting->value['value'] ?? $default,
        };
    }

    /**
     * Set a setting value by key.
     */
    public static function set(string $key, mixed $value, string $type = 'string', string $description = null, bool $isPublic = false): self
    {
        $settingValue = match($type) {
            'array' => $value,
            default => ['value' => $value],
        };

        return static::updateOrCreate(
            ['key' => $key],
            [
                'value' => $settingValue,
                'type' => $type,
                'description' => $description,
                'is_public' => $isPublic,
            ]
        );
    }

    /**
     * Check if a setting exists.
     */
    public static function has(string $key): bool
    {
        return static::where('key', $key)->exists();
    }

    /**
     * Get all public settings.
     */
    public static function getPublic(): array
    {
        return static::where('is_public', true)
            ->get()
            ->mapWithKeys(function ($setting) {
                return [
                    $setting->key => match($setting->type) {
                        'boolean' => (bool) $setting->value['value'],
                        'number' => (float) $setting->value['value'],
                        'integer' => (int) $setting->value['value'],
                        'array' => $setting->value,
                        default => $setting->value['value'] ?? null,
                    }
                ];
            })
            ->toArray();
    }

    /**
     * Get the formatted value for display.
     */
    public function getFormattedValueAttribute(): string
    {
        return match($this->type) {
            'boolean' => $this->value['value'] ? 'Yes' : 'No',
            'number', 'integer' => (string) $this->value['value'],
            'array' => json_encode($this->value),
            default => $this->value['value'] ?? '',
        };
    }
}
