<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\BedManagementController;
use App\Http\Controllers\PackageController;
use App\Http\Controllers\MembershipPackageController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\POSController;
use App\Http\Controllers\PaymentHistoryController;
use App\Http\Controllers\ReportsController;
use App\Http\Controllers\UserManagementController;

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
    Route::get('bookings/{booking}/advance-payment-receipt', [\App\Http\Controllers\BookingController::class, 'printAdvancePaymentReceipt'])->name('bookings.advance-payment-receipt');
    Route::patch('bookings/{booking}/status', [\App\Http\Controllers\BookingController::class, 'updateStatus'])->name('bookings.update-status');
    Route::patch('bookings/{booking}/payment-status', [\App\Http\Controllers\BookingController::class, 'updatePaymentStatus'])->name('bookings.update-payment-status');
    Route::delete('bookings/{booking}', [\App\Http\Controllers\BookingController::class, 'destroy'])->name('bookings.destroy');
});

// POS Billing Routes
Route::middleware(['auth', 'verified'])->prefix('pos')->group(function () {
    Route::get('/', [POSController::class, 'index'])->name('pos.index');
    
    // Bed Availability
    Route::get('/beds/availability', [POSController::class, 'getBedAvailability'])->name('pos.beds.availability');
    Route::get('/beds/live', [POSController::class, 'getLiveBookings'])->name('pos.beds.live');
    
    // Booking Search
    Route::get('/bookings/search', [POSController::class, 'searchBooking'])->name('pos.bookings.search');
    Route::get('/bookings/{booking}', [POSController::class, 'getBooking'])->name('pos.bookings.show');
    Route::post('/bookings', [POSController::class, 'createBooking'])->name('pos.bookings.store');
    
    // Invoice Management
    Route::get('/invoices/{invoice}', [POSController::class, 'getInvoice'])->name('pos.invoices.show');
    Route::post('/invoices', [POSController::class, 'createInvoice'])->name('pos.invoices.store');
    Route::put('/invoices/{invoice}', [POSController::class, 'updateInvoice'])->name('pos.invoices.update');
    Route::post('/invoices/{invoice}/items', [POSController::class, 'addInvoiceItem'])->name('pos.invoices.items.store');
    Route::put('/invoices/{invoice}/items/{item}', [POSController::class, 'updateInvoiceItem'])->name('pos.invoices.items.update');
    Route::delete('/invoices/{invoice}/items/{item}', [POSController::class, 'removeInvoiceItem'])->name('pos.invoices.items.destroy');
    Route::post('/invoices/{invoice}/complete', [POSController::class, 'completeInvoice'])->name('pos.invoices.complete');
    Route::post('/invoices/{invoice}/void', [POSController::class, 'voidInvoice'])->name('pos.invoices.void');
    Route::get('/invoices/{invoice}/print', [POSController::class, 'printInvoice'])->name('pos.invoices.print');
    
    // Payment Processing
    Route::post('/invoices/{invoice}/payments', [POSController::class, 'processPayment'])->name('pos.invoices.payments');
    
    // Quick Customer Creation
    Route::post('/customers/quick', [POSController::class, 'createQuickCustomer'])->name('pos.customers.quick');
});


// Payment History Routes
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('payment-history', [PaymentHistoryController::class, 'index'])->name('payment-history.index');
    Route::get('payment-history/{invoice}', [PaymentHistoryController::class, 'show'])->name('payment-history.show');
});

// Reports Routes
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('reports', [ReportsController::class, 'index'])->name('reports.index');
});

// Resource Routes
Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('customers', CustomerController::class)->except(['create', 'edit']);
    Route::resource('beds', BedManagementController::class);
    Route::resource('packages', PackageController::class);
    
    // Membership Packages Routes
    Route::resource('membership-packages', MembershipPackageController::class)->except(['create', 'edit']);
    Route::post('membership-packages/{membershipPackage}/use-session', [MembershipPackageController::class, 'useSession'])
        ->name('membership-packages.use-session');
    Route::post('membership-packages/{membershipPackage}/settle-payment', [MembershipPackageController::class, 'settlePayment'])
        ->name('membership-packages.settle-payment');
});

// User Management Routes (Admin only)
Route::middleware(['auth', 'verified', 'role:Admin'])->group(function () {
    Route::resource('users', UserManagementController::class)->except(['create', 'edit', 'show']);
});

require __DIR__.'/settings.php';
