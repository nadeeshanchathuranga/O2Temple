<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Customer;
use App\Models\BedAllocation;
use App\Models\Package;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;

class ReportsController extends Controller
{
    /**
     * Display the reports dashboard.
     */
    public function index(Request $request)
    {
        $year = $request->year ?? now()->year;
        $month = $request->month ?? now()->month;
        $day = $request->day ?? null;
        $export = $request->export ?? null;
        $customerType = $request->customer_type ?? 'all'; // all, regular, membership
        $includeCancelled = $request->boolean('include_cancelled', false);
        $includeDiscounts = $request->boolean('include_discounts', true);
        $dateFrom = $request->date_from ?? null;
        $dateTo = $request->date_to ?? null;

        // If exporting, handle the export request
        if ($export) {
            return $this->handleExport($request, $year, $month, $day, $export, $customerType, $includeCancelled, $includeDiscounts, $dateFrom, $dateTo);
        }

        // === SUMMARY CARDS ===
        
        // Base query for revenue calculations
        $revenueQuery = Invoice::where('payment_status', 'paid');
        
        // Apply customer type filter
        if ($customerType !== 'all') {
            if ($customerType === 'membership') {
                $revenueQuery->whereHas('allocation', function($q) {
                    $q->whereNotNull('membership_package_id');
                });
            } elseif ($customerType === 'regular') {
                $revenueQuery->whereHas('allocation', function($q) {
                    $q->whereNull('membership_package_id');
                });
            }
        }
        
        // Apply cancelled bookings filter
        if (!$includeCancelled) {
            $revenueQuery->whereHas('allocation', function($q) {
                $q->where('status', '!=', 'cancelled');
            });
        }
        
        // Apply discounts filter
        if (!$includeDiscounts) {
            $revenueQuery->where('discount_amount', 0);
        }
        
        // Total Revenue (filtered)
        $totalRevenue = (clone $revenueQuery)->sum('total_amount');
        
        // Apply date range or monthly filter for other calculations
        if ($dateFrom && $dateTo) {
            $revenueQuery->whereBetween('created_at', [$dateFrom, $dateTo]);
        } else {
            $revenueQuery->whereYear('created_at', $year)->whereMonth('created_at', $month);
        }
        
        $monthlyRevenue = (clone $revenueQuery)->sum('total_amount');
        
        // Today's Revenue
        $todayRevenue = Invoice::where('payment_status', 'paid')
            ->whereDate('created_at', today())
            ->sum('total_amount');
        
        // Yesterday's Revenue
        $yesterdayRevenue = Invoice::where('payment_status', 'paid')
            ->whereDate('created_at', today()->subDay())
            ->sum('total_amount');
        
        // Total Customers
        $totalCustomers = Customer::count();
        
        // New Customers This Month
        $newCustomersThisMonth = Customer::whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->count();
        
        // Total Bookings (all time)
        $totalBookings = BedAllocation::count();
        
        // Bookings This Month
        $bookingsThisMonth = BedAllocation::whereYear('start_time', $year)
            ->whereMonth('start_time', $month)
            ->count();
        
        // Pending Payments
        $pendingPayments = Invoice::where('payment_status', 'unpaid')->sum('total_amount') +
            Invoice::where('payment_status', 'partial')->sum('balance_amount');
        
        // Total Invoices
        $totalInvoices = Invoice::count();
        
        // Completed Sessions Today
        $completedSessionsToday = BedAllocation::where('status', 'completed')
            ->whereDate('end_time', today())
            ->count();

        // === SALES SUMMARY TABLE ===
        $salesQuery = Invoice::with(['customer:id,name,phone', 'allocation.package:id,name', 'allocation.membershipPackage:id,name', 'payments'])
            ->where('payment_status', 'paid');
        
        // Apply customer type filter
        if ($customerType !== 'all') {
            if ($customerType === 'membership') {
                $salesQuery->whereHas('allocation', function($q) {
                    $q->whereNotNull('membership_package_id');
                });
            } elseif ($customerType === 'regular') {
                $salesQuery->whereHas('allocation', function($q) {
                    $q->whereNull('membership_package_id');
                });
            }
        }
        
        // Apply cancelled bookings filter
        if (!$includeCancelled) {
            $salesQuery->whereHas('allocation', function($q) {
                $q->where('status', '!=', 'cancelled');
            });
        }
        
        // Apply discounts filter
        if (!$includeDiscounts) {
            $salesQuery->where('discount_amount', 0);
        }
        
        // Apply date range or monthly filter
        if ($dateFrom && $dateTo) {
            $salesQuery->whereBetween('created_at', [$dateFrom, $dateTo]);
        } else {
            $salesQuery->whereYear('created_at', $year)->whereMonth('created_at', $month);
        }
        
        // Apply day filter if provided
        if ($day && !($dateFrom && $dateTo)) {
            $salesQuery->whereDay('created_at', $day);
        }
        
        $salesSummary = $salesQuery
            ->select('id', 'invoice_number', 'customer_id', 'allocation_id', 'invoice_type', 'total_amount', 'discount_amount', 'created_at')
            ->orderBy('created_at', 'desc')
            ->paginate(20)
            ->through(function ($invoice) {
                // Get payment methods for this invoice
                $paymentMethods = $invoice->payments->pluck('payment_method')->unique()->toArray();
                $paymentMethodsText = empty($paymentMethods) ? 'N/A' : implode(', ', array_map('ucfirst', $paymentMethods));
                
                // Determine customer type
                $customerType = $invoice->allocation && $invoice->allocation->membership_package_id ? 'Membership' : 'Regular';
                
                return [
                    'id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number ?? 'INV-' . str_pad($invoice->id, 6, '0', STR_PAD_LEFT),
                    'customer_name' => $invoice->customer->name ?? 'Walk-in Customer',
                    'customer_phone' => $invoice->customer->phone ?? 'N/A',
                    'customer_type' => $customerType,
                    'package_name' => $invoice->allocation?->package?->name ?? ($invoice->allocation?->membershipPackage?->name ?? 'N/A'),
                    'invoice_type' => ucfirst(str_replace('_', ' ', $invoice->invoice_type)),
                    'payment_method' => $paymentMethodsText,
                    'amount' => $invoice->total_amount,
                    'discount_amount' => $invoice->discount_amount ?? 0,
                    'date' => $invoice->created_at->format('Y-m-d'),
                    'time' => $invoice->created_at->format('H:i'),
                ];
            });

        // === REVENUE BY INVOICE TYPE ===
        $revenueByType = Invoice::where('payment_status', 'paid')
            ->whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->select(
                'invoice_type',
                DB::raw('COUNT(*) as invoice_count'),
                DB::raw('SUM(total_amount) as revenue')
            )
            ->groupBy('invoice_type')
            ->get();

        // === TOP PACKAGES ===
        $topPackages = Package::withCount(['allocations' => function ($query) use ($year, $month) {
                $query->whereYear('start_time', $year)
                    ->whereMonth('start_time', $month);
            }])
            ->orderByDesc('allocations_count')
            ->limit(5)
            ->get();

        // === TOP CUSTOMERS ===
        $topCustomers = Customer::withSum(['invoices' => function ($query) use ($year, $month) {
                $query->where('payment_status', 'paid')
                    ->whereYear('created_at', $year)
                    ->whereMonth('created_at', $month);
            }], 'total_amount')
            ->withCount(['invoices' => function ($query) use ($year, $month) {
                $query->whereYear('created_at', $year)
                    ->whereMonth('created_at', $month);
            }])
            ->orderByDesc('invoices_sum_total_amount')
            ->limit(5)
            ->get();

        // === BOOKING STATUS SUMMARY ===
        $bookingStatusSummary = BedAllocation::whereYear('start_time', $year)
            ->whereMonth('start_time', $month)
            ->select(
                'status',
                DB::raw('COUNT(*) as count')
            )
            ->groupBy('status')
            ->get();

        // === PAYMENT STATUS SUMMARY ===
        $paymentStatusSummary = Invoice::whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->select(
                'payment_status',
                DB::raw('COUNT(*) as count'),
                DB::raw('SUM(total_amount) as total')
            )
            ->groupBy('payment_status')
            ->get();

        return Inertia::render('Reports/Index', [
            'stats' => [
                'total_revenue' => $totalRevenue,
                'monthly_revenue' => $monthlyRevenue,
                'today_revenue' => $todayRevenue,
                'yesterday_revenue' => $yesterdayRevenue,
                'total_customers' => $totalCustomers,
                'new_customers_this_month' => $newCustomersThisMonth,
                'total_bookings' => $totalBookings,
                'bookings_this_month' => $bookingsThisMonth,
                'pending_payments' => $pendingPayments,
                'total_invoices' => $totalInvoices,
                'completed_sessions_today' => $completedSessionsToday,
            ],
            'salesSummary' => $salesSummary,
            'revenueByType' => $revenueByType,
            'topPackages' => $topPackages,
            'topCustomers' => $topCustomers,
            'bookingStatusSummary' => $bookingStatusSummary,
            'paymentStatusSummary' => $paymentStatusSummary,
            'filters' => [
                'year' => (int) $year,
                'month' => (int) $month,
                'day' => $day ? (int) $day : null,
                'customer_type' => $customerType,
                'include_cancelled' => $includeCancelled,
                'include_discounts' => $includeDiscounts,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ],
        ]);
    }

    /**
     * Handle export requests
     */
    private function handleExport(Request $request, $year, $month, $day, $format, $customerType, $includeCancelled, $includeDiscounts, $dateFrom, $dateTo)
    {
        // Get sales data for export
        $salesQuery = Invoice::with(['customer:id,name,phone', 'allocation.package:id,name', 'allocation.membershipPackage:id,name', 'payments'])
            ->where('payment_status', 'paid');
        
        // Apply customer type filter
        if ($customerType !== 'all') {
            if ($customerType === 'membership') {
                $salesQuery->whereHas('allocation', function($q) {
                    $q->whereNotNull('membership_package_id');
                });
            } elseif ($customerType === 'regular') {
                $salesQuery->whereHas('allocation', function($q) {
                    $q->whereNull('membership_package_id');
                });
            }
        }
        
        // Apply cancelled bookings filter
        if (!$includeCancelled) {
            $salesQuery->whereHas('allocation', function($q) {
                $q->where('status', '!=', 'cancelled');
            });
        }
        
        // Apply discounts filter
        if (!$includeDiscounts) {
            $salesQuery->where('discount_amount', 0);
        }
        
        // Apply date range or monthly filter
        if ($dateFrom && $dateTo) {
            $salesQuery->whereBetween('created_at', [$dateFrom, $dateTo]);
        } else {
            $salesQuery->whereYear('created_at', $year)->whereMonth('created_at', $month);
        }
        
        if ($day && !($dateFrom && $dateTo)) {
            $salesQuery->whereDay('created_at', $day);
        }
        
        $salesData = $salesQuery
            ->select('id', 'invoice_number', 'customer_id', 'allocation_id', 'invoice_type', 'total_amount', 'created_at')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($invoice) {
                $paymentMethods = $invoice->payments->pluck('payment_method')->unique()->toArray();
                $paymentMethodsText = empty($paymentMethods) ? 'N/A' : implode(', ', array_map('ucfirst', $paymentMethods));
                
                return [
                    'invoice_number' => $invoice->invoice_number ?? 'INV-' . str_pad($invoice->id, 6, '0', STR_PAD_LEFT),
                    'customer_name' => $invoice->customer->name ?? 'Walk-in Customer',
                    'customer_phone' => $invoice->customer->phone ?? 'N/A',
                    'package_name' => $invoice->allocation?->package?->name ?? 'N/A',
                    'invoice_type' => ucfirst(str_replace('_', ' ', $invoice->invoice_type)),
                    'payment_method' => $paymentMethodsText,
                    'amount' => $invoice->total_amount,
                    'date' => $invoice->created_at->format('Y-m-d'),
                    'time' => $invoice->created_at->format('H:i'),
                ];
            });
        
        $periodText = $day ? "Daily Sales - " . Carbon::create($year, $month, $day)->format('F j, Y') : 
                     "Monthly Sales - " . Carbon::create($year, $month)->format('F Y');
        
        if ($format === 'excel') {
            return $this->exportToExcel($salesData, $periodText);
        } else {
            return $this->exportToPDF($salesData, $periodText);
        }
    }

    /**
     * Export to Excel
     */
    private function exportToExcel($data, $title)
    {
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . str_replace(' ', '_', strtolower($title)) . '.csv"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0'
        ];

        $callback = function() use ($data, $title) {
            $file = fopen('php://output', 'w');
            
            // Add BOM for UTF-8
            fputs($file, "\xEF\xBB\xBF");
            
            // Add title
            fputcsv($file, [$title]);
            fputcsv($file, []); // Empty row
            
            // Add headers
            fputcsv($file, [
                'Invoice #',
                'Customer',
                'Phone',
                'Package/Service',
                'Type',
                'Payment Method',
                'Amount (LKR)',
                'Date',
                'Time'
            ]);
            
            // Add data
            foreach ($data as $row) {
                fputcsv($file, [
                    $row['invoice_number'],
                    $row['customer_name'],
                    $row['customer_phone'],
                    $row['package_name'],
                    $row['invoice_type'],
                    $row['payment_method'],
                    number_format($row['amount'], 2),
                    $row['date'],
                    $row['time']
                ]);
            }
            
            // Add total
            fputcsv($file, []);
            fputcsv($file, [
                'TOTAL',
                '',
                '',
                '',
                '',
                '',
                number_format($data->sum('amount'), 2),
                '',
                ''
            ]);
            
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Export to PDF
     */
    private function exportToPDF($data, $title)
    {
        $pdf = Pdf::loadView('reports.sales-summary-pdf', [
            'data' => $data,
            'title' => $title
        ]);
        
        $filename = str_replace(' ', '_', strtolower($title)) . '.pdf';
        
        return $pdf->download($filename);
    }
}
