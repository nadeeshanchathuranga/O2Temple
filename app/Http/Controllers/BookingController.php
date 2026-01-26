<?php

namespace App\Http\Controllers;

use App\Models\BedAllocation;
use App\Models\Bed;
use App\Models\Package;
use App\Models\Customer;
use App\Services\BedAvailabilityService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;

class BookingController extends Controller
{
    /**
     * Display a listing of bookings.
     */
    public function index(Request $request)
    {
        $query = BedAllocation::with(['customer', 'bed', 'package'])
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

        return Inertia::render('BookingManagement/Create', [
            'beds' => $beds,
            'packages' => $packages,
            'customers' => $customers,
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
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'bed_id' => 'required|exists:beds,id',
            'package_id' => 'required|exists:packages,id',
            'start_time' => 'required|date|after:now',
            'end_time' => 'required|date|after:start_time',
        ]);

        // Check for conflicts
        $hasConflict = BedAllocation::where('bed_id', $validated['bed_id'])
            ->where('status', '!=', 'cancelled')
            ->where(function ($query) use ($validated) {
                $query->whereBetween('start_time', [$validated['start_time'], $validated['end_time']])
                    ->orWhereBetween('end_time', [$validated['start_time'], $validated['end_time']])
                    ->orWhere(function ($q) use ($validated) {
                        $q->where('start_time', '<=', $validated['start_time'])
                          ->where('end_time', '>=', $validated['end_time']);
                    });
            })
            ->exists();

        if ($hasConflict) {
            return back()->withErrors(['error' => 'This time slot is already booked.']);
        }

        $booking = BedAllocation::create([
            'customer_id' => $validated['customer_id'],
            'bed_id' => $validated['bed_id'],
            'package_id' => $validated['package_id'],
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'status' => 'pending', // Bookings from Booking Management start as pending
            'payment_status' => 'pending',
        ]);

        return redirect()->route('bookings.index')->with('success', 'Booking created successfully!');
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
}
