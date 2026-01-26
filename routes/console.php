<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Services\BedAvailabilityService;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Update bed allocation and bed table statuses every minute
Artisan::command('bookings:update-status', function () {
    $service = new BedAvailabilityService();
    $service->updateBedStatuses();
    $this->info('Bed allocation and bed statuses updated successfully.');
})->purpose('Update bed allocation statuses and bed table statuses: mark ended bookings as completed, start in-progress bookings, auto-cancel unpaid bookings after 15 minutes, and update bed status (available/occupied/booked_soon) based on paid allocations');

// Schedule the command to run every minute
// This will automatically update bed statuses based on booking time periods
Schedule::command('bookings:update-status')->everyMinute();

