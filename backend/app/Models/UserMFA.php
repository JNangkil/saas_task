<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserMFA extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'user_mfas';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'secret',
        'recovery_codes',
        'enabled_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'enabled_at' => 'datetime',
            'recovery_codes' => 'array',
        ];
    }

    /**
     * Get the user that owns the MFA settings.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Encrypt the TOTP secret before storing.
     */
    public function setSecretAttribute(string $value): void
    {
        $this->attributes['secret'] = Crypt::encryptString($value);
    }

    /**
     * Decrypt the TOTP secret when retrieving.
     */
    public function getSecretAttribute(): string
    {
        return Crypt::decryptString($this->attributes['secret']);
    }

    /**
     * Hash recovery codes before storing.
     */
    public function setRecoveryCodesAttribute(array $codes): void
    {
        $hashedCodes = array_map(function ($code) {
            return Hash::make($code);
        }, $codes);

        $this->attributes['recovery_codes'] = json_encode($hashedCodes);
    }

    /**
     * Generate recovery codes for the user.
     */
    public static function generateRecoveryCodes(int $count = 10): array
    {
        $codes = [];
        for ($i = 0; $i < $count; $i++) {
            $codes[] = strtoupper(Str::random(8) . '-' . Str::random(4));
        }
        return $codes;
    }

    /**
     * Verify a recovery code.
     */
    public function verifyRecoveryCode(string $code): bool
    {
        $hashedCodes = $this->recovery_codes ?? [];
        
        foreach ($hashedCodes as $index => $hashedCode) {
            if (Hash::check($code, $hashedCode)) {
                // Remove the used recovery code
                $remainingCodes = $hashedCodes;
                unset($remainingCodes[$index]);
                $this->recovery_codes = array_values($remainingCodes);
                $this->save();
                
                return true;
            }
        }
        
        return false;
    }

    /**
     * Check if MFA is enabled for the user.
     */
    public function isEnabled(): bool
    {
        return !is_null($this->enabled_at);
    }

    /**
     * Enable MFA for the user.
     */
    public function enable(): void
    {
        $this->enabled_at = now();
        $this->save();
    }

    /**
     * Disable MFA for the user.
     */
    public function disable(): void
    {
        $this->enabled_at = null;
        $this->save();
    }

    /**
     * Get remaining recovery codes count.
     */
    public function getRemainingRecoveryCodesCount(): int
    {
        return count($this->recovery_codes ?? []);
    }
}
