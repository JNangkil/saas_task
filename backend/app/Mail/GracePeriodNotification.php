<?php

namespace App\Mail;

use App\Models\Subscription;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Config;

/**
 * Grace Period Notification
 * 
 * This mailable handles sending grace period warning emails to users
 * when their subscription is within the grace period.
 */
class GracePeriodNotification extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * The subscription instance.
     */
    public Subscription $subscription;

    /**
     * The day number of the grace period (1, 3, or 7).
     */
    public int $dayNumber;

    /**
     * Create a new message instance.
     */
    public function __construct(Subscription $subscription, int $dayNumber)
    {
        $this->subscription = $subscription;
        $this->dayNumber = $dayNumber;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $subject = $this->getSubjectBasedOnDay();
        
        return new Envelope(
            from: [
                'address' => Config::get('billing.grace_period_from_email', config('mail.from.address')),
                'name' => Config::get('billing.grace_period_from_name', config('mail.from.name')),
            ],
            subject: $subject,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.grace-period-notification',
            with: [
                'subscription' => $this->subscription,
                'tenant' => $this->subscription->tenant,
                'plan' => $this->subscription->plan,
                'dayNumber' => $this->dayNumber,
                'daysRemaining' => $this->getDaysRemaining(),
                'gracePeriodEndsAt' => $this->getGracePeriodEndDate(),
                'urgencyLevel' => $this->getUrgencyLevel(),
                'warningMessage' => $this->getWarningMessage(),
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

    /**
     * Get the subject based on the day number.
     */
    protected function getSubjectBasedOnDay(): string
    {
        return match($this->dayNumber) {
            1 => 'Urgent: Your subscription expires tomorrow',
            3 => 'Warning: Your subscription expires in 3 days',
            7 => 'Notice: Your subscription has entered grace period',
            default => 'Your subscription grace period notification',
        };
    }

    /**
     * Get the number of days remaining in the grace period.
     */
    protected function getDaysRemaining(): int
    {
        if (!$this->subscription->ends_at) {
            return 0;
        }

        $gracePeriodDays = Config::get('billing.grace_period_days', 7);
        $gracePeriodEnd = $this->subscription->ends_at->copy()->addDays($gracePeriodDays);
        
        return max(0, now()->diffInDays($gracePeriodEnd, false));
    }

    /**
     * Get the grace period end date.
     */
    protected function getGracePeriodEndDate(): string
    {
        if (!$this->subscription->ends_at) {
            return '';
        }

        $gracePeriodDays = Config::get('billing.grace_period_days', 7);
        $gracePeriodEnd = $this->subscription->ends_at->copy()->addDays($gracePeriodDays);
        
        return $gracePeriodEnd->format('F j, Y');
    }

    /**
     * Get the urgency level based on the day number.
     */
    protected function getUrgencyLevel(): string
    {
        return match($this->dayNumber) {
            1 => 'high',
            3 => 'medium',
            7 => 'low',
            default => 'low',
        };
    }

    /**
     * Get the warning message based on the day number.
     */
    protected function getWarningMessage(): string
    {
        $planName = $this->subscription->plan?->name ?? 'Your subscription';
        $daysRemaining = $this->getDaysRemaining();
        $gracePeriodEndsAt = $this->getGracePeriodEndDate();

        return match($this->dayNumber) {
            1 => "Your {$planName} will expire tomorrow. Please update your payment information immediately to avoid service interruption.",
            3 => "Your {$planName} will expire in 3 days on {$gracePeriodEndsAt}. Please update your payment information to continue using our service.",
            7 => "Your {$planName} has been canceled and entered a 7-day grace period. You have {$daysRemaining} days left to reactivate your subscription before it expires on {$gracePeriodEndsAt}.",
            default => "Your {$planName} is in grace period and will expire in {$daysRemaining} days on {$gracePeriodEndsAt}.",
        };
    }
}