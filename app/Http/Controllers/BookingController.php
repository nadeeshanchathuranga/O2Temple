<?php

namespace App\Http\Controllers;

use App\Models\BedAllocation;
use App\Models\Bed;
use App\Models\Package;
use App\Models\Customer;
use App\Models\MembershipPackage;
use App\Services\BedAvailabilityService;
use App\Models\AdvancePayment;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class BookingController extends Controller
{
    /**
     * Display a listing of bookings.
     */
    public function index(Request $request)
    {
        // Auto-complete bookings whose end_time has passed
        BedAllocation::whereIn('status', ['confirmed', 'in_progress'])
            ->where('end_time', '<', now())
            ->update(['status' => 'completed']);

        $query = BedAllocation::with(['customer', 'bed', 'package', 'advancePayments'])
            ->orderBy('start_time', 'desc');

        // Apply filters
        if ($request->search) {
            $query->whereHas('customer', function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('phone', 'like', "%{$request->search}%");
            });
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }

        if ($request->date) {
            $query->whereDate('start_time', $request->date);
        }

        $bookings = $query->paginate(15);

        return Inertia::render('BookingManagement/Index', [
            'bookings' => $bookings,
            'filters' => [
                'search' => $request->search,
                'status' => $request->status,
                'date' => $request->date,
            ],
        ]);
    }

    /**
     * Show the form for creating a new booking.
     */
    public function create()
    {
        // Get all beds that are not under maintenance
        $beds = Bed::where('status', '!=', 'maintenance')->get();
        $packages = Package::orderBy('duration_minutes')->get();
        $customers = Customer::orderBy('name')->get();
        
        // Get active membership packages
        $membershipPackages = MembershipPackage::with('package')
            ->where('status', 'active')
            ->orderBy('name')
            ->get();

        return Inertia::render('BookingManagement/Create', [
            'beds' => $beds,
            'packages' => $packages,
            'customers' => $customers,
            'membershipPackages' => $membershipPackages,
        ]);
    }

    /**
     * Get available time slots for a specific bed and date.
     */
    public function getAvailableSlots(Request $request)
    {
        $bedId = $request->bed_id;
        $date = Carbon::parse($request->date);
        $packageDuration = (int) $request->package_duration; // in minutes

        // Get all bookings for the selected bed on the selected date
        $existingBookings = BedAllocation::where('bed_id', $bedId)
            ->whereDate('start_time', $date)
            ->where('status', '!=', 'cancelled')
            ->get(['start_time', 'end_time']);

        // Define business hours (8 AM to 10 PM)
        $businessStart = $date->copy()->setTime(8, 0);
        $businessEnd = $date->copy()->setTime(22, 0);

        $availableSlots = [];
        $currentTime = $businessStart->copy();

        while ($currentTime->copy()->addMinutes($packageDuration) <= $businessEnd) {
            $slotStart = $currentTime->copy();
            $slotEnd = $currentTime->copy()->addMinutes($packageDuration);

            // Check if this slot conflicts with any existing booking
            $hasConflict = $existingBookings->contains(function ($booking) use ($slotStart, $slotEnd) {
                return (
                    $slotStart->lt($booking->end_time) && 
                    $slotEnd->gt($booking->start_time)
                );
            });

            if (!$hasConflict && $slotStart->gte(now())) {
                $availableSlots[] = [
                    'start_time' => $slotStart->format('Y-m-d H:i:s'),
                    'end_time' => $slotEnd->format('Y-m-d H:i:s'),
                    'display_time' => $slotStart->format('h:i A') . ' - ' . $slotEnd->format('h:i A'),
                ];
            }

            // Move to next 30-minute interval
            $currentTime->addMinutes(30);
        }

        return response()->json([
            'slots' => $availableSlots,
        ]);
    }

    /**
     * Store a newly created booking.
     * 
     * 15-minute pre-booking lock system:
     * - Bookings can be made for future times
     * - Until 15 minutes before start time, the bed remains AVAILABLE
     * - At 15 minutes before, bed becomes "Booked Soon" and blocks new bookings
     * 
     * Validation rules:
     * 1. Check if requested time overlaps with any existing booking
     * 2. Check if bed is within 15-minute lock window of another booking
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'membership_package_id' => 'nullable|exists:membership_packages,id',
            'bed_id' => 'required|exists:beds,id',
            'package_id' => 'required|exists:packages,id',
            'start_time' => 'required|date|after:now',
            'end_time' => 'required|date|after:start_time',
            'advance_payment' => 'nullable|numeric|min:0',
            'payment_method' => 'required_with:advance_payment|in:cash,card,bank_transfer',
            'payment_reference' => 'nullable|string|max:255',
        ]);
        
        // Validate that either customer_id or membership_package_id is provided
        if (empty($validated['customer_id']) && empty($validated['membership_package_id'])) {
            return back()->withErrors(['customer_id' => 'Please select either a customer or a membership package.']);
        }
        
        // If membership package is selected, use its session
        if ($validated['membership_package_id']) {
            $membershipPackage = MembershipPackage::findOrFail($validated['membership_package_id']);
            
            // Check if membership package has remaining sessions
            if ($membershipPackage->sessions_used >= $membershipPackage->num_of_sessions) {
                return back()->withErrors(['membership_package_id' => 'This membership package has no remaining sessions.']);
            }
            
            // Check if membership package is active
            if ($membershipPackage->status !== 'active') {
                return back()->withErrors(['membership_package_id' => 'This membership package is not active.']);
            }
        }

        $now = now();
        $requestedStart = Carbon::parse($validated['start_time']);
        $requestedEnd = Carbon::parse($validated['end_time']);
        
        // Check 1: Is there any existing booking that overlaps with the requested time?
        $hasOverlap = BedAllocation::where('bed_id', $validated['bed_id'])
            ->where('status', '!=', 'cancelled')
            ->where(function ($query) use ($requestedStart, $requestedEnd) {
                $query->where('start_time', '<', $requestedEnd)
                      ->where('end_time', '>', $requestedStart);
            })
            ->exists();

        if ($hasOverlap) {
            return back()->withErrors(['error' => 'This time slot already has a booking for the selected bed. Please choose a different time or bed.']);
        }
        
        // Check 2: Is the bed within 15-minute lock window of another booking?
        // If a booking starts within 15 minutes, the bed is locked
        $isInLockWindow = BedAllocation::where('bed_id', $validated['bed_id'])
            ->where('status', '!=', 'cancelled')
            ->where('start_time', '>', $now)
            ->where('start_time', '<=', $now->copy()->addMinutes(15))
            // Check if our requested time would conflict with this locked period
            ->where(function ($query) use ($requestedStart, $requestedEnd) {
                $query->where('start_time', '<', $requestedEnd)
                      ->where('end_time', '>', $requestedStart);
            })
            ->exists();
            
        if ($isInLockWindow) {
            return back()->withErrors(['error' => 'This bed is currently locked for an upcoming booking (within 15 minutes). Please choose a different bed or time.']);
        }

        // Get package for pricing
        $package = Package::findOrFail($validated['package_id']);
        
        // Validate advance payment doesn't exceed package price
        $advanceAmount = floatval($validated['advance_payment'] ?? 0);
        if ($advanceAmount > $package->price) {
            return back()->withErrors(['advance_payment' => 'Advance payment cannot exceed the package price.']);
        }

        DB::beginTransaction();
        try {
            // Determine customer ID
            $customerId = $validated['customer_id'];
            if ($validated['membership_package_id']) {
                $membershipPackage = MembershipPackage::findOrFail($validated['membership_package_id']);
                
                // Create a customer record if using membership package
                $customer = Customer::firstOrCreate(
                    ['phone' => $membershipPackage->phone],
                    [
                        'name' => $membershipPackage->name,
                        'email' => null,
                    ]
                );
                $customerId = $customer->id;
            }
            
            // Create booking with pending status (no payment yet)
            $booking = BedAllocation::create([
                'customer_id' => $customerId,
                'membership_package_id' => $validated['membership_package_id'] ?? null,
                'bed_id' => $validated['bed_id'],
                'package_id' => $validated['package_id'],
                'start_time' => $validated['start_time'],
                'end_time' => $validated['end_time'],
                'status' => 'pending', // Booking without payment starts as pending
                'payment_status' => 'pending', // Will be updated based on advance payment
                'total_amount' => $package->price,
                'final_amount' => $package->price,
                'created_by' => auth()->id(),
            ]);

            // Create advance payment if provided
            if ($advanceAmount > 0) {
                AdvancePayment::create([
                    'allocation_id' => $booking->id,
                    'customer_id' => $customerId,
                    'amount' => $advanceAmount,
                    'payment_method' => $validated['payment_method'] ?? 'cash',
                    'reference_number' => $validated['payment_reference'] ?? null,
                    'received_by' => auth()->id(),
                ]);
                
                // Update booking status based on payment
                $booking->update([
                    'status' => 'confirmed', // Confirmed if advance paid
                    'payment_status' => $advanceAmount >= $package->price ? 'paid' : 'pending',
                ]);
            }

            DB::commit();

            // Update bed status dynamically using the service
            $bedAvailabilityService = new BedAvailabilityService();
            $bedAvailabilityService->updateBedTableStatuses();

            $successMessage = 'Booking created successfully!';
            if ($validated['membership_package_id']) {
                $membershipPackage = MembershipPackage::find($validated['membership_package_id']);
                $remainingSessions = $membershipPackage->num_of_sessions - $membershipPackage->sessions_used;
                $successMessage .= " Session will be deducted when payment is completed via POS. {$remainingSessions} sessions remaining.";
            }
            if ($advanceAmount > 0) {
                $successMessage .= ' Advance payment of LKR ' . number_format($advanceAmount, 2) . ' recorded.';
            }
            $successMessage .= ' The bed will be locked 15 minutes before the booking time.';

            return redirect()->route('bookings.index')->with('success', $successMessage);
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Failed to create booking: ' . $e->getMessage()]);
        }
    }

    /**
     * Update the specified booking status.
     */
    public function updateStatus(Request $request, BedAllocation $booking)
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,confirmed,in_progress,completed,cancelled',
        ]);

        $booking->update(['status' => $validated['status']]);
        
        // Update bed status in database immediately
        $bedAvailabilityService = new BedAvailabilityService();
        $bedAvailabilityService->updateBedTableStatuses();

        return back()->with('success', 'Booking status updated successfully!');
    }

    /**
     * Update the specified booking payment status.
     */
    public function updatePaymentStatus(Request $request, BedAllocation $booking)
    {
        $validated = $request->validate([
            'payment_status' => 'required|in:pending,paid',
        ]);

        $booking->update(['payment_status' => $validated['payment_status']]);
        
        // If paid, also update bed status in database
        if ($validated['payment_status'] === 'paid') {
            $bedAvailabilityService = new BedAvailabilityService();
            $bedAvailabilityService->updateBedTableStatuses();
        }

        return back()->with('success', 'Payment status updated successfully!');
    }

    /**
     * Remove the specified booking.
     */
    public function destroy(BedAllocation $booking)
    {
        $bedId = $booking->bed_id;
        $booking->delete();
        
        // Update bed status in database
        $bedAvailabilityService = new BedAvailabilityService();
        $bedAvailabilityService->updateBedTableStatuses();

        return back()->with('success', 'Booking deleted successfully!');
    }

    /**
     * Print advance payment receipt for a booking.
     */
    public function printAdvancePaymentReceipt(BedAllocation $booking)
    {
        $booking->load(['customer', 'bed', 'package', 'advancePayments.receivedBy']);
        
        if ($booking->advancePayments->isEmpty()) {
            return back()->with('error', 'No advance payments found for this booking.');
        }
        
        return view('bookings.advance-payment-receipt', [
            'booking' => $booking,
            'advancePayments' => $booking->advancePayments,
            'totalAdvancePaid' => $booking->advancePayments->sum('amount'),
            'balanceAmount' => max(0, ($booking->total_amount ?? $booking->package->price) - $booking->advancePayments->sum('amount')),
        ]);
    }
}
