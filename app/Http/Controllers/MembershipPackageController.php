<?php

namespace App\Http\Controllers;

use App\Models\MembershipPackage;
use App\Models\Package;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MembershipPackageController extends Controller
{
    /**
     * Display a listing of the membership packages.
     */
    public function index(Request $request)
    {
        $query = MembershipPackage::with('package');

        // Apply filters
        if ($request->has('type') && $request->type !== 'all') {
            $query->where('type', $request->type);
        }

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->has('search') && $request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('phone', 'like', '%' . $request->search . '%')
                  ->orWhere('nic', 'like', '%' . $request->search . '%');
            });
        }

        $packages = $query->latest()->paginate(12);
        $availablePackages = Package::all();

        return Inertia::render('MembershipPackages/Index', [
            'packages' => $packages,
            'availablePackages' => $availablePackages,
            'filters' => [
                'type' => $request->type ?? 'all',
                'status' => $request->status ?? 'all',
                'search' => $request->search ?? '',
            ],
        ]);
    }

    /**
     * Store a newly created membership package.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'package_id' => 'required|exists:packages,id',
            'type' => 'required|in:individual,company',
            'name' => 'required|string|max:255',
            'address' => 'required|string',
            'birthday' => 'nullable|date|required_if:type,individual',
            'nic' => 'nullable|string|max:20',
            'phone' => 'required|string|max:20',
            'num_of_sessions' => 'required|integer|min:1',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
            'full_payment' => 'required|numeric|min:0',
            'advance_payment' => 'nullable|numeric|min:0',
        ]);

        // Set defaults
        $validated['discount_percentage'] = $validated['discount_percentage'] ?? 0;
        $validated['advance_payment'] = $validated['advance_payment'] ?? 0;
        $validated['status'] = 'active';

        $package = MembershipPackage::create($validated);

        return redirect()->route('membership-packages.index')
            ->with('success', 'Membership package created successfully.');
    }

    /**
     * Display the specified membership package.
     */
    public function show(MembershipPackage $membershipPackage)
    {
        return Inertia::render('MembershipPackages/Show', [
            'package' => $membershipPackage,
        ]);
    }

    /**
     * Update the specified membership package.
     */
    public function update(Request $request, MembershipPackage $membershipPackage)
    {
        $validated = $request->validate([
            'package_id' => 'required|exists:packages,id',
            'type' => 'required|in:individual,company',
            'name' => 'required|string|max:255',
            'address' => 'required|string',
            'birthday' => 'nullable|date|required_if:type,individual',
            'nic' => 'nullable|string|max:20',
            'phone' => 'required|string|max:20',
            'num_of_sessions' => 'required|integer|min:1',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
            'full_payment' => 'required|numeric|min:0',
            'advance_payment' => 'nullable|numeric|min:0',
            'status' => 'required|in:active,inactive,expired',
        ]);

        $validated['discount_percentage'] = $validated['discount_percentage'] ?? 0;
        $validated['advance_payment'] = $validated['advance_payment'] ?? 0;

        $membershipPackage->update($validated);

        return redirect()->route('membership-packages.index')
            ->with('success', 'Membership package updated successfully.');
    }

    /**
     * Remove the specified membership package.
     */
    public function destroy(MembershipPackage $membershipPackage)
    {
        $membershipPackage->delete();

        return redirect()->route('membership-packages.index')
            ->with('success', 'Membership package deleted successfully.');
    }

    /**
     * Use a session from the package
     */
    public function useSession(MembershipPackage $membershipPackage)
    {
        if ($membershipPackage->useSession()) {
            return response()->json([
                'success' => true,
                'message' => 'Session used successfully.',
                'remaining_sessions' => $membershipPackage->remaining_sessions,
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Unable to use session. Package may be inactive or expired.',
        ], 400);
    }

    /**
     * Settle payment for the membership package
     */
    public function settlePayment(Request $request, MembershipPackage $membershipPackage)
    {
        $validated = $request->validate([
            'payment_amount' => 'required|numeric|min:0.01',
        ]);

        $paymentAmount = $validated['payment_amount'];
        
        // Check if payment amount doesn't exceed remaining balance
        if ($paymentAmount > $membershipPackage->remaining_balance) {
            return redirect()->back()
                ->with('error', 'Payment amount cannot exceed remaining balance.');
        }

        // Update the advance payment
        $membershipPackage->advance_payment += $paymentAmount;
        $membershipPackage->save();

        return redirect()->route('membership-packages.index')
            ->with('success', 'Payment settled successfully. Rs ' . number_format($paymentAmount, 2) . ' received.');
    }
}
