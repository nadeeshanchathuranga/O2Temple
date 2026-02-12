<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\MembershipPackage;
use App\Models\InvoicePayment;
use App\Models\AdvancePayment;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Validation\Rule;

class CustomerController extends Controller
{
    /**
     * Display a listing of the customers.
     */
    public function index(Request $request)
    {
        $search = $request->get('search');
        $activeOnly = $request->boolean('active_only', false);

        // Get regular customers
        $customers = Customer::query()
            ->when($search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                      ->orWhere('phone', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
            })
            ->orderBy('name')
            ->get();

        // Get membership packages as pseudo-customers
        $membershipCustomers = MembershipPackage::with('package')
            ->when($search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                      ->orWhere('phone', 'like', "%{$search}%");
            })
            ->when($activeOnly, function ($query) {
                $query->where('status', 'active');
            })
            ->orderBy('name')
            ->get()
            ->map(function ($membership) {
                return [
                    'id' => 'membership_' . $membership->id,
                    'membership_id' => $membership->id,
                    'name' => $membership->name,
                    'phone' => $membership->phone,
                    'email' => null,
                    'type' => 'membership',
                    'membership_status' => $membership->status,
                    'remaining_sessions' => $membership->remaining_sessions,
                    'package_name' => $membership->package->name ?? 'N/A',
                    'created_at' => $membership->created_at,
                ];
            });

        // Combine and paginate manually
        $allCustomers = collect($customers->toArray())
            ->map(function ($customer) {
                $customer['type'] = 'regular';
                return $customer;
            })
            ->merge($membershipCustomers)
            ->sortBy('name')
            ->values();

        // Manual pagination
        $perPage = 15;
        $currentPage = $request->get('page', 1);
        $total = $allCustomers->count();
        $items = $allCustomers->forPage($currentPage, $perPage);

        $paginatedCustomers = new \Illuminate\Pagination\LengthAwarePaginator(
            $items->values(), // Ensure array indexes are reset
            $total,
            $perPage,
            $currentPage,
            ['path' => $request->url(), 'query' => $request->query()]
        );

        return Inertia::render('CustomerManagement/Index', [
            'customers' => $paginatedCustomers,
            'filters' => [
                'search' => $search,
                'active_only' => $activeOnly,
            ],
        ]);
    }

    /**
     * Store a newly created customer in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20|unique:customers,phone',
            'email' => 'nullable|email|max:255|unique:customers,email',
            'nic' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
            'age' => 'nullable|integer|min:0|max:150',
            'dob' => 'nullable|date',
            'description' => 'nullable|string|max:500',
        ]);

        Customer::create($validated);

        return redirect()->route('customers.index')
                        ->with('success', 'Customer created successfully.');
    }

    /**
     * Update the specified customer in storage.
     */
    public function update(Request $request, Customer $customer)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => [
                'required',
                'string',
                'max:20',
                Rule::unique('customers', 'phone')->ignore($customer->id),
            ],
            'email' => [
                'nullable',
                'email',
                'max:255',
                Rule::unique('customers', 'email')->ignore($customer->id),
            ],
            'nic' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
            'age' => 'nullable|integer|min:0|max:150',
            'dob' => 'nullable|date',
            'description' => 'nullable|string|max:500',
        ]);

        $customer->update($validated);

        return redirect()->route('customers.index')
                        ->with('success', 'Customer updated successfully.');
    }

    /**
     * Remove the specified customer from storage.
     */
    public function destroy(Customer $customer)
    {
        // Check if customer has any allocations
        if ($customer->allocations()->count() > 0) {
            return redirect()->route('customers.index')
                            ->with('error', 'Cannot delete customer with existing bed allocations.');
        }

        $customer->delete();

        return redirect()->route('customers.index')
                        ->with('success', 'Customer deleted successfully.');
    }

    /**
     * Display the specified customer.
     */
    public function show($customer)
    {
        // Handle both regular customers and membership customers
        if (str_starts_with($customer, 'membership_')) {
            // Extract membership ID
            $membershipId = str_replace('membership_', '', $customer);
            $membershipPackage = MembershipPackage::with(['package', 'allocations.bed', 'allocations.package'])
                ->findOrFail($membershipId);

            // Get payment history for membership
            $paymentHistory = [];
            
            // Get advance payments made to this membership package
            $membershipAllocations = $membershipPackage->allocations;
            foreach ($membershipAllocations as $allocation) {
                $advancePayments = $allocation->advancePayments()->with('receivedBy')->get();
                foreach ($advancePayments as $payment) {
                    $paymentHistory[] = [
                        'id' => "advance_" . $payment->id,
                        'type' => 'advance_payment',
                        'amount' => $payment->amount,
                        'payment_method' => $payment->payment_method,
                        'reference_number' => $payment->reference_number,
                        'payment_date' => $payment->payment_date,
                        'related_booking' => $allocation->booking_number ?? $allocation->id,
                        'processed_by' => $payment->receivedBy->name ?? 'System',
                        'service' => $allocation->package->name ?? 'N/A',
                    ];
                }
            }

            // Get invoice payments for membership bookings
            $invoicePayments = InvoicePayment::whereHas('invoice.allocation', function($query) use ($membershipId) {
                $query->where('membership_package_id', $membershipId);
            })->with(['invoice.allocation.package', 'processedBy'])->get();

            foreach ($invoicePayments as $payment) {
                $paymentHistory[] = [
                    'id' => "invoice_" . $payment->id,
                    'type' => 'invoice_payment',
                    'amount' => $payment->amount,
                    'payment_method' => $payment->payment_method,
                    'reference_number' => $payment->reference_number,
                    'payment_date' => $payment->payment_date,
                    'related_booking' => $payment->invoice->allocation->booking_number ?? $payment->invoice->allocation->id,
                    'processed_by' => $payment->processedBy->name ?? 'System',
                    'service' => $payment->invoice->allocation->package->name ?? 'N/A',
                ];
            }

            // Sort by payment date (newest first)
            usort($paymentHistory, function($a, $b) {
                return strtotime($b['payment_date']) - strtotime($a['payment_date']);
            });

            $customerData = [
                'id' => 'membership_' . $membershipPackage->id,
                'membership_id' => $membershipPackage->id,
                'name' => $membershipPackage->name,
                'phone' => $membershipPackage->phone,
                'email' => null,
                'nic' => $membershipPackage->nic,
                'address' => $membershipPackage->address,
                'type' => 'membership',
                'membership_status' => $membershipPackage->status,
                'total_sessions' => $membershipPackage->num_of_sessions,
                'sessions_used' => $membershipPackage->sessions_used,
                'remaining_sessions' => $membershipPackage->remaining_sessions,
                'package_name' => $membershipPackage->package->name ?? 'N/A',
                'package_price' => $membershipPackage->package->price ?? 0,
                'full_payment' => $membershipPackage->full_payment,
                'advance_payment' => $membershipPackage->advance_payment,
                'remaining_balance' => $membershipPackage->remaining_balance,
                'discount_percentage' => $membershipPackage->discount_percentage,
                'created_at' => $membershipPackage->created_at,
                'allocations' => $membershipPackage->allocations,
                'payment_history' => $paymentHistory,
            ];

        } else {
            // Regular customer
            $regularCustomer = Customer::with(['allocations.bed', 'allocations.package'])->findOrFail($customer);

            // Get payment history for regular customer
            $paymentHistory = [];

            // Get advance payments
            $advancePayments = AdvancePayment::whereHas('allocation', function($query) use ($customer) {
                $query->where('customer_id', $customer);
            })->with(['allocation.package', 'receivedBy'])->get();

            foreach ($advancePayments as $payment) {
                $paymentHistory[] = [
                    'id' => "advance_" . $payment->id,
                    'type' => 'advance_payment',
                    'amount' => $payment->amount,
                    'payment_method' => $payment->payment_method,
                    'reference_number' => $payment->reference_number,
                    'payment_date' => $payment->payment_date,
                    'related_booking' => $payment->allocation->booking_number ?? $payment->allocation->id,
                    'processed_by' => $payment->receivedBy->name ?? 'System',
                    'service' => $payment->allocation->package->name ?? 'N/A',
                ];
            }

            // Get invoice payments
            $invoicePayments = InvoicePayment::whereHas('invoice', function($query) use ($customer) {
                $query->where('customer_id', $customer);
            })->with(['invoice.allocation.package', 'processedBy'])->get();

            foreach ($invoicePayments as $payment) {
                $paymentHistory[] = [
                    'id' => "invoice_" . $payment->id,
                    'type' => 'invoice_payment', 
                    'amount' => $payment->amount,
                    'payment_method' => $payment->payment_method,
                    'reference_number' => $payment->reference_number,
                    'payment_date' => $payment->payment_date,
                    'related_booking' => $payment->invoice->allocation->booking_number ?? $payment->invoice->allocation->id,
                    'processed_by' => $payment->processedBy->name ?? 'System',
                    'service' => $payment->invoice->allocation->package->name ?? 'N/A',
                ];
            }

            // Sort by payment date (newest first)
            usort($paymentHistory, function($a, $b) {
                return strtotime($b['payment_date']) - strtotime($a['payment_date']);
            });

            $customerData = array_merge($regularCustomer->toArray(), [
                'type' => 'regular',
                'payment_history' => $paymentHistory,
            ]);
        }

        return Inertia::render('CustomerManagement/Show', [
            'customer' => $customerData,
        ]);
    }
}
