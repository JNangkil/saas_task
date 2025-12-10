<?php

namespace App\Mail;

use App\Models\AccountLockout;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AccountLockoutNotification extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     */
    public function __construct(
        public User $user,
        public AccountLockout $accountLockout
    ) {}

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Account Locked - Security Alert',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.account-lockout',
            with: [
                'user' => $this->user,
                'accountLockout' => $this->accountLockout,
                'lockoutDuration' => $this->accountLockout->getLockoutDuration(),
                'lockedUntil' => $this->accountLockout->locked_until,
                'failedAttempts' => $this->accountLockout->failed_attempts,
                'lastFailedAt' => $this->accountLockout->last_failed_at,
                'supportEmail' => config('mail.support_address', 'support@example.com'),
            ]
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}