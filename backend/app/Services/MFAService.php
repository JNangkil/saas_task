<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserMFA;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use OTPHP\TOTP;

class MFAService
{
    /**
     * Generate a new TOTP secret for a user.
     */
    public function generateSecret(User $user): string
    {
        $totp = TOTP::create(
            secret: null,
            name: $user->email,
            issuer: config('app.name', 'SaaS Application')
        );

        return $totp->getSecret();
    }

    /**
     * Generate a QR code for the TOTP secret.
     */
    public function generateQrCode(User $user, string $secret): string
    {
        $totp = TOTP::create(
            secret: $secret,
            name: $user->email,
            issuer: config('app.name', 'SaaS Application')
        );

        $qrCodeUri = $totp->getQrCodeUri();

        $renderer = new ImageRenderer(
            new RendererStyle(200),
            new SvgImageBackEnd()
        );

        $writer = new Writer($renderer);

        return $writer->writeString($qrCodeUri);
    }

    /**
     * Verify a TOTP code against the user's secret.
     */
    public function verifyCode(User $user, string $code): bool
    {
        if (!$user->mfa || !$user->mfa->isEnabled()) {
            return false;
        }

        try {
            $totp = TOTP::create(
                secret: $user->mfa->secret,
                name: $user->email,
                issuer: config('app.name', 'SaaS Application')
            );

            return $totp->verify($code);
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Generate recovery codes for a user.
     */
    public function generateRecoveryCodes(): array
    {
        return UserMFA::generateRecoveryCodes();
    }

    /**
     * Setup MFA for a user (create or update MFA record).
     */
    public function setupMfa(User $user, string $secret): UserMFA
    {
        $recoveryCodes = $this->generateRecoveryCodes();

        $userMfa = $user->mfa ?? new UserMFA();
        $userMfa->user_id = $user->id;
        $userMfa->secret = $secret;
        $userMfa->recovery_codes = $recoveryCodes;
        $userMfa->save();

        return $userMfa;
    }

    /**
     * Enable MFA for a user after successful verification.
     */
    public function enableMfa(User $user): bool
    {
        if (!$user->mfa) {
            return false;
        }

        $user->mfa->enable();
        return true;
    }

    /**
     * Disable MFA for a user.
     */
    public function disableMfa(User $user): bool
    {
        if (!$user->mfa) {
            return false;
        }

        $user->mfa->disable();
        return true;
    }

    /**
     * Verify a recovery code for a user.
     */
    public function verifyRecoveryCode(User $user, string $code): bool
    {
        if (!$user->mfa || !$user->mfa->isEnabled()) {
            return false;
        }

        return $user->mfa->verifyRecoveryCode($code);
    }

    /**
     * Get the current TOTP object for a user.
     */
    protected function getTotpForUser(User $user): ?TOTP
    {
        if (!$user->mfa) {
            return null;
        }

        return TOTP::create(
            secret: $user->mfa->secret,
            name: $user->email,
            issuer: config('app.name', 'SaaS Application')
        );
    }

    /**
     * Get the provisioning URI for a user's TOTP.
     */
    public function getProvisioningUri(User $user): ?string
    {
        $totp = $this->getTotpForUser($user);
        
        return $totp?->getProvisioningUri();
    }
}