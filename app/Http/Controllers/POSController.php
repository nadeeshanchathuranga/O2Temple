<?php

namespace App\Http\Controllers;

use App\Models\Bed;
use App\Models\BedAllocation;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\InvoicePayment;
use App\Models\MembershipPackage;
use App\Models\Package;
use App\Models\Product;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class POSController extends Controller
{
    /**
     * Display the POS main interface.
     * Supports loading a specific booking via ?load_booking=ID parameter
     */
    public function index(Request $request)
    {
        // Use the optimized method to get beds with status
        $beds = $this->getBedsWithStatus();

        $packages = Package::orderBy('name')->get();
        $customers = Customer::orderBy('name')->get();
        $membershipPackages = MembershipPackage::with('package')
            ->where('status', 'active')
            ->orderBy('name')
            ->get();

        // Get active invoice for selected bed if any
        $selectedBedId = $request->get('bed_id');
        $activeInvoice = null;
        $loadedBooking = null;
        
        // Check if we need to load a specific booking (from Booking Management)
        $loadBookingId = $request->get('load_booking');
        if ($loadBookingId) {
            $booking = BedAllocation::with(['customer', 'bed', 'package', 'advancePayments'])
                ->where('id', $loadBookingId)
                ->where('payment_status', 'pending')
                ->where('status', '!=', 'cancelled')
                ->first();
            
            if ($booking) {
                // Calculate total advance paid and balance
                $totalAdvancePaid = $booking->advancePayments->sum('amount');
                $balanceAmount = max(0, ($booking->package->price ?? $booking->total_amount ?? 0) - $totalAdvancePaid);
                
                $loadedBooking = [
                    'id' => $booking->id,
                    'booking_number' => $booking->booking_number,
                    'customer' => [
                        'id' => $booking->customer->id,
                        'name' => $booking->customer->name,
                        'phone' => $booking->customer->phone,
                        'email' => $booking->customer->email,
                    ],
                    'bed' => [
                        'id' => $booking->bed->id,
                        'bed_number' => $booking->bed->bed_number,
                        'display_name' => $booking->bed->display_name ?? 'Bed ' . $booking->bed->bed_number,
                    ],
                    'package' => [
                        'id' => $booking->package->id,
                        'name' => $booking->package->name,
                        'price' => $booking->package->price,
                        'duration_minutes' => $booking->package->duration_minutes,
                    ],
                    'start_time' => $booking->start_time->format('Y-m-d H:i'),
                    'end_time' => $booking->end_time->format('Y-m-d H:i'),
                    'status' => $booking->status,
                    'payment_status' => $booking->payment_status,
                    'total_amount' => $booking->total_amount ?? $booking->package->price,
                    'final_amount' => $balanceAmount, // Use balance as final_amount to pay
                    'advance_paid' => $totalAdvancePaid,
                    'balance_amount' => $balanceAmount,
                ];
                
                // Also create/load the invoice for this booking directly
                // Delete any existing draft invoice to recalculate with advance payment
                Invoice::where('status', 'draft')
                    ->where('allocation_id', $booking->id)
                    ->delete();
                
                // Create fresh invoice with correct balance
                $activeInvoice = Invoice::create([
                    'customer_id' => $booking->customer->id,
                    'allocation_id' => $booking->id,
                    'invoice_type' => 'booking',
                    'status' => 'draft',
                    'created_by' => auth()->id(),
                ]);
                
                // Add package as invoice item with balance amount
                InvoiceItem::create([
                    'invoice_id' => $activeInvoice->id,
                    'package_id' => $booking->package->id,
                    'item_type' => 'package',
                    'item_name' => $booking->package->name,
                    'description' => "Duration: {$booking->package->duration_minutes} minutes" . 
                        ($totalAdvancePaid > 0 ? " (Advance paid: LKR " . number_format($totalAdvancePaid, 2) . ")" : ""),
                    'quantity' => 1,
                    'unit_price' => $balanceAmount,
                    'total_price' => $balanceAmount,
                ]);
                
                // Calculate totals
                $activeInvoice->calculateTotals();
                $activeInvoice = $activeInvoice->fresh()->load(['items', 'payments', 'customer', 'allocation.bed', 'allocation.package']);
                
                // Set selected bed
                $selectedBedId = $booking->bed->id;
            }
        }
        
        if ($selectedBedId && !$activeInvoice) {
            $activeInvoice = Invoice::where('status', 'draft')
                ->whereHas('allocation', function ($q) use ($selectedBedId) {
                    $q->where('bed_id', $selectedBedId);
                })
                ->with(['items', 'payments', 'customer', 'allocation.bed', 'allocation.package'])
                ->first();
        }

        return Inertia::render('POS/Index', [
            'beds' => $beds,
            'packages' => $packages,
            'customers' => $customers,
            'membershipPackages' => $membershipPackages,
            'activeInvoice' => $activeInvoice,
            'selectedBedId' => $selectedBedId,
            'loadedBooking' => $loadedBooking,
        ]);
    }

    /**
     * Get real-time bed availability for a specific date and time range.
     */
    public function getBedAvailability(Request $request)
    {
        $date = $request->get('date', today()->format('Y-m-d'));
        $startTime = $request->get('start_time');
        $endTime = $request->get('end_time');
        $packageId = $request->get('package_id');

        $beds = Bed::available()->orderByGrid()->get();

        // If package is selected, calculate end time based on duration
        if ($packageId && $startTime && !$endTime) {
            $package = Package::find($packageId);
            if ($package) {
                $startDateTime = Carbon::parse($date . ' ' . $startTime);
                $endTime = $startDateTime->copy()->addMinutes($package->duration_minutes)->format('H:i');
            }
        }

        $bedsWithAvailability = $beds->map(function ($bed) use ($date, $startTime, $endTime) {
            $availability = [
                'id' => $bed->id,
                'bed_number' => $bed->bed_number,
                'display_name' => $bed->display_name ?? 'Table ' . $bed->bed_number,
                'grid_row' => $bed->grid_row,
                'grid_col' => $bed->grid_col,
                'bed_type' => $bed->bed_type,
                'current_status' => $bed->getAvailabilityStatus(),
                'is_available' => true,
                'conflicting_bookings' => [],
            ];

            if ($startTime && $endTime) {
                $start = Carbon::parse($date . ' ' . $startTime);
                $end = Carbon::parse($date . ' ' . $endTime);

                $conflicts = BedAllocation::where('bed_id', $bed->id)
                    ->where('status', '!=', 'cancelled')
                    ->where(function ($q) use ($start, $end) {
                        $q->where('start_time', '<', $end)
                          ->where('end_time', '>', $start);
                    })
                    ->with(['customer', 'package'])
                    ->get();

                $availability['is_available'] = $conflicts->isEmpty();
                $availability['conflicting_bookings'] = $conflicts->map(function ($booking) {
                    return [
                        'id' => $booking->id,
                        'booking_number' => $booking->booking_number,
                        'customer_name' => $booking->customer->name ?? 'Unknown',
                        'start_time' => $booking->start_time->format('H:i'),
                        'end_time' => $booking->end_time->format('H:i'),
                    ];
                });
            }

            // Get all bookings for the day to show on grid
            $dayBookings = $bed->getAllocationsForDate(Carbon::parse($date));
            $availability['day_bookings'] = $dayBookings->map(function ($booking) {
                return [
                    'id' => $booking->id,
                    'booking_number' => $booking->booking_number,
                    'customer_name' => $booking->customer->name ?? 'Unknown',
                    'start_time' => $booking->start_time->format('H:i'),
                    'end_time' => $booking->end_time->format('H:i'),
                    'status' => $booking->status,
                ];
            });

            return $availability;
        });

        return response()->json([
            'beds' => $bedsWithAvailability,
            'date' => $date,
            'start_time' => $startTime,
            'end_time' => $endTime,
        ]);
    }

    /**
     * Search for a booking by booking number, customer name, or phone.
     * Prioritizes pending bookings (awaiting payment) for POS billing workflow.
     */
    public function searchBooking(Request $request)
    {
        $query = $request->get('query');

        if (empty($query)) {
            return response()->json(['bookings' => []]);
        }

        $bookings = BedAllocation::where(function ($q) use ($query) {
                $q->where('booking_number', 'like', "%{$query}%")
                  ->orWhereHas('customer', function ($cq) use ($query) {
                      $cq->where('name', 'like', "%{$query}%")
                        ->orWhere('phone', 'like', "%{$query}%");
                  });
            })
            ->where('status', '!=', 'cancelled')
            ->where('end_time', '>=', now()) // Only non-expired bookings
            ->with(['customer', 'bed', 'package', 'advancePayments'])
            // Order by: pending (unpaid) first, then by start_time
            ->orderByRaw("CASE WHEN payment_status = 'pending' THEN 0 ELSE 1 END")
            ->orderBy('start_time', 'desc')
            ->limit(15)
            ->get()
            ->map(function ($booking) {
                $totalAdvancePaid = $booking->advancePayments->sum('amount');
                $packagePrice = $booking->package->price ?? $booking->total_amount ?? 0;
                $balanceAmount = max(0, $packagePrice - $totalAdvancePaid);
                
                return [
                    'id' => $booking->id,
                    'booking_number' => $booking->booking_number,
                    'customer' => [
                        'id' => $booking->customer->id,
                        'name' => $booking->customer->name,
                        'phone' => $booking->customer->phone,
                        'email' => $booking->customer->email,
                    ],
                    'bed' => [
                        'id' => $booking->bed->id,
                        'bed_number' => $booking->bed->bed_number,
                        'display_name' => $booking->bed->display_name ?? 'Table ' . $booking->bed->bed_number,
                    ],
                    'package' => [
                        'id' => $booking->package->id,
                        'name' => $booking->package->name,
                        'price' => $booking->package->price,
                        'duration_minutes' => $booking->package->duration_minutes,
                    ],
                    'start_time' => $booking->start_time->format('Y-m-d H:i'),
                    'end_time' => $booking->end_time->format('Y-m-d H:i'),
                    'status' => $booking->status,
                    'payment_status' => $booking->payment_status,
                    'total_amount' => $booking->total_amount ?? $booking->package->price,
                    'final_amount' => $balanceAmount, // Balance to pay
                    'advance_paid' => $totalAdvancePaid,
                    'balance_amount' => $balanceAmount,
                ];
            });

        return response()->json(['bookings' => $bookings]);
    }

    /**
     * Get booking details by ID.
     */
    public function getBooking(BedAllocation $booking)
    {
        $booking->load(['customer', 'bed', 'package', 'invoices.items', 'invoices.payments']);

        return response()->json([
            'booking' => [
                'id' => $booking->id,
                'booking_number' => $booking->booking_number,
                'customer' => $booking->customer,
                'bed' => $booking->bed,
                'package' => $booking->package,
                'start_time' => $booking->start_time->format('Y-m-d H:i'),
                'end_time' => $booking->end_time->format('Y-m-d H:i'),
                'status' => $booking->status,
                'payment_status' => $booking->payment_status,
                'invoices' => $booking->invoices,
            ],
        ]);
    }

    /**
     * Create a new booking with optional invoice.
     * Checks for ALL existing bookings (not just paid) to prevent double booking.
     */
    public function createBooking(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'bed_id' => 'required|exists:beds,id',
            'package_id' => 'required|exists:packages,id',
            'start_time' => 'nullable|date',
            'end_time' => 'nullable|date|after:start_time',
            'start_now' => 'boolean', // If true, use server's current time
            'notes' => 'nullable|string',
            'create_invoice' => 'boolean',
        ]);

        $package = Package::findOrFail($validated['package_id']);
        $now = now();
        
        // Use server's current time if start_now is true, otherwise parse the provided time
        if ($request->get('start_now', false)) {
            $startTime = $now->copy();
        } else {
            $startTime = Carbon::parse($validated['start_time'] ?? $now);
        }
        
        // Calculate end time from package duration if not provided
        $endTime = isset($validated['end_time']) 
            ? Carbon::parse($validated['end_time']) 
            : $startTime->copy()->addMinutes($package->duration_minutes);

        // Check 1: Is there any existing booking that overlaps with the requested time?
        $hasOverlap = BedAllocation::where('bed_id', $validated['bed_id'])
            ->where('status', '!=', 'cancelled')
            ->where(function ($q) use ($startTime, $endTime) {
                $q->where('start_time', '<', $endTime)
                  ->where('end_time', '>', $startTime);
            })
            ->exists();

        if ($hasOverlap) {
            return response()->json([
                'success' => false,
                'message' => 'This time slot already has a booking for the selected bed. Please choose a different time or bed.',
            ], 422);
        }
        
        // Check 2: Is the bed within 15-minute lock window of another booking?
        $isInLockWindow = BedAllocation::where('bed_id', $validated['bed_id'])
            ->where('status', '!=', 'cancelled')
            ->where('start_time', '>', $now)
            ->where('start_time', '<=', $now->copy()->addMinutes(15))
            ->where(function ($q) use ($startTime, $endTime) {
                $q->where('start_time', '<', $endTime)
                  ->where('end_time', '>', $startTime);
            })
            ->exists();
            
        if ($isInLockWindow) {
            return response()->json([
                'success' => false,
                'message' => 'This bed is currently locked for an upcoming booking (within 15 minutes). Please choose a different bed.',
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Create booking
            $booking = BedAllocation::create([
                'customer_id' => $validated['customer_id'],
                'bed_id' => $validated['bed_id'],
                'package_id' => $validated['package_id'],
                'start_time' => $startTime,
                'end_time' => $endTime,
                'status' => 'confirmed',
                'payment_status' => 'pending',
                'total_amount' => $package->price,
                'final_amount' => $package->price,
                'notes' => $validated['notes'] ?? null,
                'created_by' => auth()->id(),
            ]);
            
            \Log::info("Booking created: #{$booking->id}, bed={$booking->bed_id}, start={$startTime}, end={$endTime}");

            // Create invoice if requested
            if ($request->get('create_invoice', false)) {
                $invoice = Invoice::create([
                    'customer_id' => $validated['customer_id'],
                    'allocation_id' => $booking->id,
                    'invoice_type' => 'booking',
                    'status' => 'draft',
                    'created_by' => auth()->id(),
                ]);

                // Add package as invoice item
                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'package_id' => $package->id,
                    'item_type' => 'package',
                    'item_name' => $package->name,
                    'description' => "Duration: {$package->duration_minutes} minutes",
                    'quantity' => 1,
                    'unit_price' => $package->price,
                    'total_price' => $package->price,
                ]);
            }

            DB::commit();

            // Get updated beds list with status
            $beds = $this->getBedsWithStatus();

            return response()->json([
                'success' => true,
                'message' => 'Booking created successfully!',
                'allocation' => $booking->load(['customer', 'bed', 'package']),
                'beds' => $beds,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create booking: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get invoice by ID.
     */
    public function getInvoice(Invoice $invoice)
    {
        return response()->json([
            'success' => true,
            'invoice' => $invoice->load(['items', 'payments', 'customer', 'allocation']),
        ]);
    }

    /**
     * Create or get invoice for a bed/booking.
     */
    public function createInvoice(Request $request)
    {
        $validated = $request->validate([
            'bed_id' => 'nullable|exists:beds,id',
            'allocation_id' => 'nullable|exists:bed_allocations,id',
            'customer_id' => 'nullable|exists:customers,id',
            'invoice_type' => 'required|in:walk_in,booking,pos_sale,addon',
            'parent_invoice_id' => 'nullable|exists:invoices,id',
        ]);

        // For addon invoices, don't check for existing draft - always create new
        if ($validated['invoice_type'] !== 'addon') {
            // Check if booking has advance payments - if so, delete old invoice to recalculate balance
            if ($validated['allocation_id']) {
                $allocation = BedAllocation::with('advancePayments')->find($validated['allocation_id']);
                $hasAdvancePayment = $allocation && $allocation->advancePayments->count() > 0;
                
                // If has advance payment, delete old invoice to create fresh one with correct balance
                if ($hasAdvancePayment) {
                    Invoice::where('status', 'draft')
                        ->where('allocation_id', $validated['allocation_id'])
                        ->delete();
                } else {
                    // Check for existing draft invoice only if no advance payment
                    $existingInvoice = Invoice::where('status', 'draft')
                        ->when($validated['allocation_id'] ?? null, function ($q, $allocationId) {
                            $q->where('allocation_id', $allocationId);
                        })
                        ->first();

                    if ($existingInvoice) {
                        return response()->json([
                            'success' => true,
                            'invoice' => $existingInvoice->load(['items', 'payments', 'customer', 'allocation']),
                        ]);
                    }
                }
            }
        }

        $invoice = Invoice::create([
            'customer_id' => $validated['customer_id'] ?? null,
            'allocation_id' => $validated['allocation_id'] ?? null,
            'invoice_type' => $validated['invoice_type'],
            'parent_invoice_id' => $validated['parent_invoice_id'] ?? null,
            'status' => 'draft',
            'created_by' => auth()->id(),
        ]);

        // If booking invoice, add package as first item
        if ($validated['allocation_id']) {
            $allocation = BedAllocation::with(['package', 'advancePayments'])->find($validated['allocation_id']);
            if ($allocation && $allocation->package) {
                // Calculate the price to charge (balance amount if advance payment exists)
                $totalAdvancePaid = $allocation->advancePayments->sum('amount');
                $balanceAmount = max(0, $allocation->package->price - $totalAdvancePaid);
                
                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'package_id' => $allocation->package->id,
                    'item_type' => 'package',
                    'item_name' => $allocation->package->name,
                    'description' => "Duration: {$allocation->package->duration_minutes} minutes",
                    'quantity' => 1,
                    'unit_price' => $balanceAmount, // Use balance amount as unit price
                    'total_price' => $balanceAmount,
                ]);
            }
        }

        // Calculate invoice totals after adding items
        $invoice->calculateTotals();

        return response()->json([
            'success' => true,
            'invoice' => $invoice->fresh()->load(['items', 'payments', 'customer', 'allocation']),
        ]);
    }

    /**
     * Add item to invoice.
     */
    public function addInvoiceItem(Request $request, Invoice $invoice)
    {
        $validated = $request->validate([
            'item_type' => 'required|in:package,product,service,custom',
            'package_id' => 'required_if:item_type,package|exists:packages,id',
            'product_id' => 'required_if:item_type,product|exists:products,id',
            'item_name' => 'required_if:item_type,custom,service|string',
            'description' => 'nullable|string',
            'quantity' => 'required|integer|min:1',
            'unit_price' => 'required_if:item_type,custom,service|numeric|min:0',
        ]);

        $itemName = $validated['item_name'] ?? '';
        $unitPrice = $validated['unit_price'] ?? 0;
        $description = $validated['description'] ?? '';

        if ($validated['item_type'] === 'package' && isset($validated['package_id'])) {
            $package = Package::find($validated['package_id']);
            $itemName = $package->name;
            $unitPrice = $package->price;
            $description = "Duration: {$package->duration_minutes} minutes";
        } elseif ($validated['item_type'] === 'product' && isset($validated['product_id'])) {
            $product = Product::find($validated['product_id']);
            $itemName = $product->name;
            $unitPrice = $product->price;
            $description = $product->description ?? '';
        }

        $item = InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'package_id' => $validated['package_id'] ?? null,
            'product_id' => $validated['product_id'] ?? null,
            'item_type' => $validated['item_type'],
            'item_name' => $itemName,
            'description' => $description,
            'quantity' => $validated['quantity'],
            'unit_price' => $unitPrice,
            'total_price' => $unitPrice * $validated['quantity'],
        ]);

        $invoice->calculateTotals();

        return response()->json([
            'success' => true,
            'item' => $item,
            'invoice' => $invoice->fresh()->load(['items', 'payments']),
        ]);
    }

    /**
     * Update invoice item.
     */
    public function updateInvoiceItem(Request $request, Invoice $invoice, InvoiceItem $item)
    {
        $validated = $request->validate([
            'quantity' => 'required|integer|min:1',
            'unit_price' => 'required|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
        ]);

        $item->update([
            'quantity' => $validated['quantity'],
            'unit_price' => $validated['unit_price'],
            'discount_amount' => $validated['discount_amount'] ?? 0,
        ]);

        return response()->json([
            'success' => true,
            'item' => $item->fresh(),
            'invoice' => $invoice->fresh()->load(['items', 'payments']),
        ]);
    }

    /**
     * Remove item from invoice.
     */
    public function removeInvoiceItem(Invoice $invoice, InvoiceItem $item)
    {
        $item->delete();

        return response()->json([
            'success' => true,
            'invoice' => $invoice->fresh()->load(['items', 'payments']),
        ]);
    }

    /**
     * Update invoice (service charge, discount, etc.).
     */
    public function updateInvoice(Request $request, Invoice $invoice)
    {
        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'discount_amount' => 'nullable|numeric|min:0',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
            'service_charge' => 'nullable|numeric|min:0',
            'service_charge_percentage' => 'nullable|numeric|min:0|max:100',
            'tax_percentage' => 'nullable|numeric|min:0|max:100',
            'additional_charges' => 'nullable|numeric|min:0',
            'kitchen_note' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $invoice->update($validated);
        $invoice->calculateTotals();

        return response()->json([
            'success' => true,
            'invoice' => $invoice->fresh()->load(['items', 'payments', 'customer']),
        ]);
    }

    /**
     * Process payment for invoice.
     * 
     * After successful payment:
     * - Invoice payment_status: pending -> paid (if fully paid)
     * - BedAllocation payment_status: pending -> paid
     * - BedAllocation status: pending -> in_progress (or confirmed if not started)
     * - Bed status: booked_soon -> occupied (if booking time is current)
     */
    public function processPayment(Request $request, Invoice $invoice)
    {
        $validated = $request->validate([
            'payments' => 'required|array|min:1',
            'payments.*.amount' => 'required|numeric|min:0.01',
            'payments.*.payment_method' => 'required|in:cash,card,upi,bank_transfer,other',
            'payments.*.reference_number' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            foreach ($validated['payments'] as $paymentData) {
                $invoice->addPayment(
                    $paymentData['amount'],
                    $paymentData['payment_method'],
                    $paymentData['reference_number'] ?? null,
                    auth()->id()
                );
            }

            // Refresh the invoice to get updated balance_amount after payments
            $invoice->refresh();
            
            // Load the allocation relationship
            $invoice->load('allocation');
            
            \Log::info("Payment processed for invoice #{$invoice->id}, balance: {$invoice->balance_amount}");

            // If fully paid, update invoice, booking, and bed statuses
            if ($invoice->balance_amount <= 0) {
                $invoice->markAsCompleted(auth()->id());
                
                \Log::info("Invoice #{$invoice->id} marked as completed");

                if ($invoice->allocation) {
                    $allocation = $invoice->allocation;
                    $allocationId = $allocation->id;
                    $bedId = $allocation->bed_id;
                    $now = now();
                    
                    // Check if this booking used a membership package - if so, deduct a session
                    if ($allocation->membership_package_id) {
                        $membershipPackage = MembershipPackage::find($allocation->membership_package_id);
                        if ($membershipPackage && $membershipPackage->isActive()) {
                            $membershipPackage->useSession();
                            \Log::info("Session deducted from membership package #{$membershipPackage->id} for allocation #{$allocationId}");
                        }
                    }
                    
                    // Determine new booking status based on timing
                    // If booking start_time <= now <= end_time, it's in_progress
                    // If booking hasn't started yet, it's confirmed (will start later)
                    $newStatus = 'confirmed';
                    if ($allocation->start_time <= $now && $allocation->end_time >= $now) {
                        $newStatus = 'in_progress';
                    }
                    
                    // Update allocation: payment_status pending -> paid, status pending -> in_progress/confirmed
                    $allocation->update([
                        'payment_status' => 'paid',
                        'status' => $newStatus,
                    ]);
                    
                    \Log::info("Allocation #{$allocationId} updated: payment_status=paid, status={$newStatus}");
                    \Log::info("Allocation details: start_time={$allocation->start_time}, end_time={$allocation->end_time}");
                    
                    // Update bed status:
                    // - If booking is current (in_progress), bed becomes 'occupied'
                    // - If booking is future (confirmed), bed becomes 'booked_soon'
                    $this->updateBedStatusAfterPayment($bedId, $newStatus);
                } else {
                    \Log::warning("Invoice #{$invoice->id} has no allocation linked");
                }
            }

            DB::commit();

            // Get updated beds list with status
            $beds = $this->getBedsWithStatus();

            return response()->json([
                'success' => true,
                'message' => 'Payment processed successfully!',
                'invoice' => $invoice->fresh()->load(['items', 'payments', 'customer', 'allocation']),
                'beds' => $beds,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to process payment: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Complete/finalize invoice.
     */
    public function completeInvoice(Invoice $invoice)
    {
        // Refresh invoice to get latest balance
        $invoice->refresh();
        $invoice->load('allocation');
        
        if ($invoice->balance_amount > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot complete invoice with outstanding balance.',
            ], 400);
        }

        $invoice->markAsCompleted(auth()->id());

        if ($invoice->allocation) {
            $allocation = $invoice->allocation;
            $bedId = $allocation->bed_id;
            $now = now();
            
            // Check if this booking used a membership package - if so, deduct a session
            if ($allocation->membership_package_id) {
                $membershipPackage = MembershipPackage::find($allocation->membership_package_id);
                if ($membershipPackage && $membershipPackage->isActive()) {
                    $membershipPackage->useSession();
                    \Log::info("Session deducted from membership package #{$membershipPackage->id} for allocation #{$allocation->id}");
                }
            }
            
            // Determine new booking status based on timing (same logic as processPayment)
            // If booking start_time <= now <= end_time, it's in_progress
            // If booking hasn't started yet, it's confirmed (will start later)
            $newStatus = 'confirmed';
            if ($allocation->start_time <= $now && $allocation->end_time >= $now) {
                $newStatus = 'in_progress';
            }
            
            // Update allocation: payment_status -> paid, status based on timing
            $allocation->update([
                'status' => $newStatus,
                'payment_status' => 'paid',
            ]);
            
            // Update bed status based on new booking status
            $this->updateBedStatusAfterPayment($bedId, $newStatus);
        }

        // Get updated beds list with status
        $beds = $this->getBedsWithStatus();

        return response()->json([
            'success' => true,
            'message' => 'Invoice completed successfully!',
            'invoice' => $invoice->fresh()->load(['items', 'payments', 'customer']),
            'beds' => $beds,
        ]);
    }

    /**
     * Void/cancel an invoice.
     */
    public function voidInvoice(Invoice $invoice)
    {
        if ($invoice->status === 'completed') {
            return response()->json([
                'success' => false,
                'message' => 'Cannot void a completed invoice.',
            ], 400);
        }

        $invoice->update(['status' => 'voided']);

        return response()->json([
            'success' => true,
            'message' => 'Invoice voided successfully!',
        ]);
    }

    /**
     * Get invoice details for printing.
     */
    public function printInvoice(Invoice $invoice)
    {
        $invoice->load(['items', 'payments', 'customer', 'allocation.bed', 'allocation.package', 'allocation.advancePayments', 'creator']);

        // Calculate advance payment totals
        $advancePayments = [];
        $totalAdvancePaid = 0;
        $originalPackagePrice = 0;
        
        if ($invoice->allocation) {
            $advancePayments = $invoice->allocation->advancePayments;
            $totalAdvancePaid = $advancePayments->sum('amount');
            $originalPackagePrice = $invoice->allocation->package->price ?? 0;
        }

        return view('pos.thermal-receipt', compact('invoice', 'advancePayments', 'totalAdvancePaid', 'originalPackagePrice'));
    }

    /**
     * Create a quick walk-in customer.
     */
    public function createQuickCustomer(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20',
            'phone_2' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'nic' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
            'age' => 'nullable|integer|min:0|max:150',
            'dob' => 'nullable|date',
            'description' => 'nullable|string|max:500',
        ]);

        $customer = Customer::firstOrCreate(
            ['phone' => $validated['phone']],
            [
                'name' => $validated['name'],
                'phone_2' => $validated['phone_2'] ?? null,
                'email' => $validated['email'] ?? null,
                'nic' => $validated['nic'] ?? null,
                'address' => $validated['address'] ?? null,
                'age' => $validated['age'] ?? null,
                'dob' => $validated['dob'] ?? null,
                'description' => $validated['description'] ?? null,
            ]
        );

        return response()->json([
            'success' => true,
            'customer' => $customer,
        ]);
    }

    /**
     * Get live bookings for today.
     */
    public function getLiveBookings()
    {
        $bookings = BedAllocation::with(['customer', 'bed', 'package'])
            ->whereDate('start_time', today())
            ->where('status', '!=', 'cancelled')
            ->orderBy('start_time')
            ->get()
            ->map(function ($booking) {
                $now = now();
                $status = $booking->status;
                
                if ($booking->start_time <= $now && $booking->end_time >= $now && $status !== 'completed') {
                    $status = 'in_progress';
                } elseif ($booking->end_time < $now && $status !== 'completed') {
                    $status = 'overdue';
                }

                return [
                    'id' => $booking->id,
                    'booking_number' => $booking->booking_number,
                    'customer' => $booking->customer,
                    'bed' => $booking->bed,
                    'package' => $booking->package,
                    'start_time' => $booking->start_time->format('H:i'),
                    'end_time' => $booking->end_time->format('H:i'),
                    'start_datetime' => $booking->start_time->format('Y-m-d H:i:s'),
                    'end_datetime' => $booking->end_time->format('Y-m-d H:i:s'),
                    'status' => $status,
                    'payment_status' => $booking->payment_status,
                    'time_remaining' => 'Ends: ' . $booking->end_time->format('H:i'),
                    'is_active' => $booking->start_time <= $now && $booking->end_time >= $now,
                ];
            });

        return response()->json([
            'bookings' => $bookings,
            'timestamp' => now()->format('Y-m-d H:i:s'),
            'timezone' => 'Asia/Colombo',
        ]);
    }

    /**
     * Get all beds with their current status.
     * 
     * Status Logic (15-minute pre-booking lock):
     * - 'occupied': PAID booking where current time is WITHIN start_time and end_time
     * - 'booked_soon': Booking starting within 15 minutes (locks the bed)
     * - 'available': No current bookings, or future bookings more than 15 min away
     * - 'maintenance': Bed under maintenance
     * 
     * NOTE: Beds remain AVAILABLE until 15 minutes before a booking starts.
     */
    private function getBedsWithStatus()
    {
        $now = now();
        $bookedSoonThreshold = 15; // minutes before booking to lock the bed
        
        // Get PAID allocations that are CURRENTLY ACTIVE (now is between start and end)
        $currentOccupiedAllocations = BedAllocation::with(['customer', 'package'])
            ->where('start_time', '<=', $now)
            ->where('end_time', '>', $now)
            ->whereIn('status', ['confirmed', 'in_progress'])
            ->where('payment_status', 'paid')
            ->get()
            ->keyBy('bed_id');
        
        // Get allocations starting within 15 minutes (the lock window)
        $upcomingAllocations = BedAllocation::with(['customer', 'package'])
            ->where('start_time', '>', $now)
            ->where('start_time', '<=', $now->copy()->addMinutes($bookedSoonThreshold))
            ->where('status', '!=', 'cancelled')
            ->get()
            ->keyBy('bed_id');
        
        return Bed::orderByGrid()->get()->map(function ($bed) use ($currentOccupiedAllocations, $upcomingAllocations, $now) {
            $occupiedAllocation = $currentOccupiedAllocations->get($bed->id);
            $upcomingAllocation = $upcomingAllocations->get($bed->id);
            
            // Determine status priority:
            // 1. Maintenance (bed out of service)
            // 2. Occupied (paid booking currently in progress)
            // 3. Booked Soon (booking starting within 15 minutes)
            // 4. Available (no bookings in lock window)
            $status = 'available';
            $allocation = null;
            
            if ($bed->status === 'maintenance') {
                $status = 'maintenance';
            } elseif ($occupiedAllocation) {
                // Currently in use - paid and within time window
                $status = 'occupied';
                $allocation = $occupiedAllocation;
            } elseif ($upcomingAllocation) {
                // Booking starting within 15 minutes - lock the bed
                $status = 'booked_soon';
                $allocation = $upcomingAllocation;
            }
            // Note: Future bookings more than 15 min away keep bed as 'available'
            
            // Calculate time display - ALWAYS use fixed HH:MM format
            $timeDisplay = '';
            if ($allocation) {
                // Always show end time in fixed format
                $timeDisplay = 'Ends: ' . $allocation->end_time->format('H:i');
            }
            
            return [
                'id' => $bed->id,
                'bed_number' => $bed->bed_number,
                'display_name' => $bed->display_name ?? 'Bed ' . $bed->bed_number,
                'grid_row' => $bed->grid_row,
                'grid_col' => $bed->grid_col,
                'bed_type' => $bed->bed_type,
                'status' => $status,
                'current_allocation' => $allocation ? [
                    'id' => $allocation->id,
                    'booking_number' => $allocation->booking_number,
                    'customer' => $allocation->customer ? [
                        'id' => $allocation->customer->id,
                        'name' => $allocation->customer->name,
                        'phone' => $allocation->customer->phone,
                    ] : null,
                    'package' => $allocation->package ? [
                        'id' => $allocation->package->id,
                        'name' => $allocation->package->name,
                    ] : null,
                    'start_time' => $allocation->start_time->format('H:i'),
                    'end_time' => $allocation->end_time->format('H:i'),
                    'time_remaining' => $timeDisplay,
                    'start_datetime' => $allocation->start_time->format('Y-m-d H:i:s'),
                    'end_datetime' => $allocation->end_time->format('Y-m-d H:i:s'),
                    'payment_status' => $allocation->payment_status,
                    'status' => $allocation->status,
                ] : null,
            ];
        });
    }
    
    /**
     * Update a single bed's status in the database based on its allocations.
     * 
     * Logic (15-minute pre-booking lock):
     * - 'occupied': PAID booking where NOW is between start_time and end_time
     * - 'booked_soon': Booking starting within 15 minutes
     * - 'available': No bookings in lock window
     */
    private function updateBedStatus(int $bedId): void
    {
        $bed = Bed::find($bedId);
        if (!$bed || $bed->status === 'maintenance') {
            return;
        }
        
        $now = now();
        $bookedSoonThreshold = 15; // minutes
        
        \Log::info("updateBedStatus called for bed {$bedId} at {$now}");
        
        // Check for PAID allocation CURRENTLY IN PROGRESS (now between start and end)
        $currentOccupied = BedAllocation::where('bed_id', $bedId)
            ->where('start_time', '<=', $now)
            ->where('end_time', '>', $now)
            ->whereIn('status', ['confirmed', 'in_progress'])
            ->where('payment_status', 'paid')
            ->first();
        
        if ($currentOccupied) {
            \Log::info("Bed {$bedId} is OCCUPIED: allocation #{$currentOccupied->id} ({$currentOccupied->start_time} - {$currentOccupied->end_time})");
            $bed->update(['status' => 'occupied']);
            return;
        }
        
        // Check for allocation starting within 15 minutes (lock window)
        $upcomingAllocation = BedAllocation::where('bed_id', $bedId)
            ->where('start_time', '>', $now)
            ->where('start_time', '<=', $now->copy()->addMinutes($bookedSoonThreshold))
            ->where('status', '!=', 'cancelled')
            ->first();
        
        if ($upcomingAllocation) {
            \Log::info("Bed {$bedId} is BOOKED_SOON: allocation #{$upcomingAllocation->id} starts at {$upcomingAllocation->start_time}");
            $bed->update(['status' => 'booked_soon']);
            return;
        }
        
        // No active allocations in lock window - bed is available
        \Log::info("Bed {$bedId} is AVAILABLE - no allocations in 15-min lock window");
        $bed->update(['status' => 'available']);
    }
    
    /**
     * Update bed status after payment is completed.
     * 
     * @param int $bedId The bed ID to update
     * @param string $allocationStatus The new allocation status (in_progress or confirmed)
     */
    private function updateBedStatusAfterPayment(int $bedId, string $allocationStatus): void
    {
        $bed = Bed::find($bedId);
        if (!$bed || $bed->status === 'maintenance') {
            return;
        }
        
        // After payment, check if booking is currently active
        // If in_progress = booking time has started -> bed is occupied
        // If confirmed = booking time hasn't started yet -> bed is booked_soon
        if ($allocationStatus === 'in_progress') {
            \Log::info("Bed {$bedId} payment completed, session in progress - setting to occupied");
            $bed->update(['status' => 'occupied']);
        } else {
            \Log::info("Bed {$bedId} payment completed, session not started yet - setting to booked_soon");
            $bed->update(['status' => 'booked_soon']);
        }
    }
}
