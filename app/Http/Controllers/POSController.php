<?php

namespace App\Http\Controllers;

use App\Models\Bed;
use App\Models\BedAllocation;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\InvoicePayment;
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
     */
    public function index(Request $request)
    {
        // Use the optimized method to get beds with status
        $beds = $this->getBedsWithStatus();

        $packages = Package::orderBy('name')->get();
        $customers = Customer::orderBy('name')->get();

        // Get active invoice for selected bed if any
        $selectedBedId = $request->get('bed_id');
        $activeInvoice = null;
        
        if ($selectedBedId) {
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
            'activeInvoice' => $activeInvoice,
            'selectedBedId' => $selectedBedId,
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
     * Search for a booking by booking number.
     */
    public function searchBooking(Request $request)
    {
        $query = $request->get('query');

        if (empty($query)) {
            return response()->json(['bookings' => []]);
        }

        $bookings = BedAllocation::where('booking_number', 'like', "%{$query}%")
            ->orWhereHas('customer', function ($q) use ($query) {
                $q->where('name', 'like', "%{$query}%")
                  ->orWhere('phone', 'like', "%{$query}%");
            })
            ->where('status', '!=', 'cancelled')
            ->with(['customer', 'bed', 'package'])
            ->orderBy('start_time', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($booking) {
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
        
        // Use server's current time if start_now is true, otherwise parse the provided time
        if ($request->get('start_now', false)) {
            $startTime = now();
        } else {
            $startTime = Carbon::parse($validated['start_time'] ?? now());
        }
        
        // Calculate end time from package duration if not provided
        $endTime = isset($validated['end_time']) 
            ? Carbon::parse($validated['end_time']) 
            : $startTime->copy()->addMinutes($package->duration_minutes);

        // Check for conflicts
        $hasConflict = BedAllocation::conflictsWith(
            $validated['bed_id'],
            $startTime,
            $endTime
        )->exists();

        if ($hasConflict) {
            return back()->withErrors(['error' => 'This time slot is already booked for the selected bed.']);
        }

        $package = Package::findOrFail($validated['package_id']);

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
            // Check for existing draft invoice
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
            $allocation = BedAllocation::with('package')->find($validated['allocation_id']);
            if ($allocation && $allocation->package) {
                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'package_id' => $allocation->package->id,
                    'item_type' => 'package',
                    'item_name' => $allocation->package->name,
                    'description' => "Duration: {$allocation->package->duration_minutes} minutes",
                    'quantity' => 1,
                    'unit_price' => $allocation->package->price,
                    'total_price' => $allocation->package->price,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'invoice' => $invoice->load(['items', 'payments', 'customer', 'allocation']),
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

            // If fully paid, mark invoice and booking as completed
            if ($invoice->balance_amount <= 0) {
                $invoice->markAsCompleted(auth()->id());
                
                \Log::info("Invoice #{$invoice->id} marked as completed");

                if ($invoice->allocation) {
                    $allocationId = $invoice->allocation->id;
                    $bedId = $invoice->allocation->bed_id;
                    
                    // Update allocation status
                    $invoice->allocation->update([
                        'payment_status' => 'paid',
                        'status' => 'in_progress',
                    ]);
                    
                    \Log::info("Allocation #{$allocationId} updated: payment_status=paid, status=in_progress");
                    \Log::info("Allocation details: start_time={$invoice->allocation->start_time}, end_time={$invoice->allocation->end_time}");
                    
                    // Update bed status in database immediately
                    $this->updateBedStatus($bedId);
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
            $invoice->allocation->update([
                'status' => 'completed',
                'payment_status' => 'paid',
            ]);
            
            // Update bed status in database immediately
            $this->updateBedStatus($invoice->allocation->bed_id);
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
        $invoice->load(['items', 'payments', 'customer', 'allocation.bed', 'allocation.package', 'creator']);

        return response()->json([
            'success' => true,
            'invoice' => $invoice,
        ]);
    }

    /**
     * Create a quick walk-in customer.
     */
    public function createQuickCustomer(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20',
            'email' => 'nullable|email|max:255',
        ]);

        $customer = Customer::firstOrCreate(
            ['phone' => $validated['phone']],
            [
                'name' => $validated['name'],
                'email' => $validated['email'] ?? null,
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
                    'status' => $status,
                    'payment_status' => $booking->payment_status,
                    'time_remaining' => $booking->end_time->diffForHumans($now, true),
                    'is_active' => $booking->start_time <= $now && $booking->end_time >= $now,
                ];
            });

        return response()->json([
            'bookings' => $bookings,
            'timestamp' => now()->format('Y-m-d H:i:s'),
        ]);
    }

    /**
     * Get all beds with their current status.
     */
    private function getBedsWithStatus()
    {
        // Get all current allocations in one query to avoid N+1
        // Only consider allocations with paid payment status
        $now = now();
        $currentAllocations = BedAllocation::with(['customer', 'package'])
            ->where('start_time', '<=', $now)
            ->where('end_time', '>=', $now)
            ->whereIn('status', ['confirmed', 'in_progress'])
            ->where('payment_status', 'paid')
            ->get()
            ->keyBy('bed_id');
        
        $upcomingAllocations = BedAllocation::with(['customer', 'package'])
            ->where('start_time', '>', $now)
            ->where('start_time', '<=', $now->copy()->addMinutes(30))
            ->whereIn('status', ['confirmed', 'in_progress'])
            ->where('payment_status', 'paid')
            ->get()
            ->keyBy('bed_id');
        
        return Bed::orderByGrid()->get()->map(function ($bed) use ($currentAllocations, $upcomingAllocations, $now) {
            $currentAllocation = $currentAllocations->get($bed->id);
            $upcomingAllocation = $upcomingAllocations->get($bed->id);
            
            // Determine status
            $status = 'available';
            if ($bed->status === 'maintenance') {
                $status = 'maintenance';
            } elseif ($currentAllocation) {
                $status = 'occupied';
            } elseif ($upcomingAllocation) {
                $status = 'booked_soon';
            }
            
            return [
                'id' => $bed->id,
                'bed_number' => $bed->bed_number,
                'display_name' => $bed->display_name ?? 'Bed ' . $bed->bed_number,
                'grid_row' => $bed->grid_row,
                'grid_col' => $bed->grid_col,
                'bed_type' => $bed->bed_type,
                'status' => $status,
                'current_allocation' => $currentAllocation ? [
                    'id' => $currentAllocation->id,
                    'booking_number' => $currentAllocation->booking_number,
                    'customer' => $currentAllocation->customer ? [
                        'id' => $currentAllocation->customer->id,
                        'name' => $currentAllocation->customer->name,
                        'phone' => $currentAllocation->customer->phone,
                    ] : null,
                    'package' => $currentAllocation->package ? [
                        'id' => $currentAllocation->package->id,
                        'name' => $currentAllocation->package->name,
                    ] : null,
                    'start_time' => $currentAllocation->start_time->format('H:i'),
                    'end_time' => $currentAllocation->end_time->format('H:i'),
                    'time_remaining' => $currentAllocation->end_time->diffForHumans($now, ['parts' => 1]),
                ] : null,
            ];
        });
    }
    
    /**
     * Update a single bed's status in the database based on its allocations.
     */
    private function updateBedStatus(int $bedId): void
    {
        $bed = Bed::find($bedId);
        if (!$bed || $bed->status === 'maintenance') {
            return;
        }
        
        $now = now();
        
        // Log for debugging
        \Log::info("updateBedStatus called for bed {$bedId} at {$now}");
        
        // Check for current paid allocation (booking time includes current time)
        $currentAllocation = BedAllocation::where('bed_id', $bedId)
            ->where('start_time', '<=', $now)
            ->where('end_time', '>=', $now)
            ->whereIn('status', ['confirmed', 'in_progress'])
            ->where('payment_status', 'paid')
            ->first();
        
        if ($currentAllocation) {
            \Log::info("Bed {$bedId} has current allocation #{$currentAllocation->id}, setting to occupied");
            $bed->update(['status' => 'occupied']);
            return;
        }
        
        // Check for upcoming paid allocation (within 30 minutes)
        $upcomingAllocation = BedAllocation::where('bed_id', $bedId)
            ->where('start_time', '>', $now)
            ->where('start_time', '<=', $now->copy()->addMinutes(30))
            ->whereIn('status', ['confirmed', 'in_progress'])
            ->where('payment_status', 'paid')
            ->first();
        
        if ($upcomingAllocation) {
            \Log::info("Bed {$bedId} has upcoming allocation #{$upcomingAllocation->id}, setting to booked_soon");
            $bed->update(['status' => 'booked_soon']);
            return;
        }
        
        // No paid allocations - set to available
        \Log::info("Bed {$bedId} has no paid allocations, setting to available");
        $bed->update(['status' => 'available']);
    }
}
