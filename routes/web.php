<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\BedManagementController;
use App\Http\Controllers\PackageController;
use App\Http\Controllers\BookingController;

Route::get('/', function () {
    return redirect()->route('login');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        $user = auth()->user();
        return Inertia::render('dashboard', [
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role->name ?? 'Guest',
            ]
        ]);
    })->name('dashboard');
});

// Admin Routes
Route::middleware(['auth', 'verified', 'role:Admin'])->prefix('admin')->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('admin/dashboard');
    })->name('admin.dashboard');
});

// Receptionist Routes
Route::middleware(['auth', 'verified', 'role:Receptionist'])->prefix('receptionist')->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('receptionist/dashboard');
    })->name('receptionist.dashboard');
});

// Staff Routes
Route::middleware(['auth', 'verified', 'role:Staff'])->prefix('staff')->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('staff/dashboard');
    })->name('staff.dashboard');
});

// Booking Management Routes
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('bookings', [\App\Http\Controllers\BookingController::class, 'index'])->name('bookings.index');
    Route::get('bookings/create', [\App\Http\Controllers\BookingController::class, 'create'])->name('bookings.create');
    Route::post('bookings', [\App\Http\Controllers\BookingController::class, 'store'])->name('bookings.store');
    Route::get('bookings/available-slots', [\App\Http\Controllers\BookingController::class, 'getAvailableSlots'])->name('bookings.available-slots');
    Route::patch('bookings/{booking}/status', [\App\Http\Controllers\BookingController::class, 'updateStatus'])->name('bookings.update-status');
    Route::delete('bookings/{booking}', [\App\Http\Controllers\BookingController::class, 'destroy'])->name('bookings.destroy');
});


// Resource Routes
Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('customers', CustomerController::class)->except(['create', 'edit']);
    Route::resource('beds', BedManagementController::class);
    Route::resource('packages', PackageController::class);
});

require __DIR__.'/settings.php';
