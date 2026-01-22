<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\BedManagementController;

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

// Resource Routes
Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('customers', CustomerController::class)->except(['create', 'edit']);
    Route::resource('beds', BedManagementController::class);
});

require __DIR__.'/settings.php';
