<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Jobs\GracePeriodJob;
use App\Jobs\DueDateReminderJob;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule the grace period job to run daily at 9 AM
Schedule::job(new GracePeriodJob())
    ->dailyAt('09:00')
    ->description('Check subscription grace periods and send notifications')
    ->withoutOverlapping();

// Schedule the due date reminder job to run daily at 8 AM
Schedule::job(new DueDateReminderJob())
    ->dailyAt('08:00')
    ->description('Send due date and overdue task notifications')
    ->withoutOverlapping();
