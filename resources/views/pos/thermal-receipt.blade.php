<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Receipt - {{ $invoice->id }}</title>
    <style>
        @page {
            size: 80mm auto;
            margin: 0;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            font-size: 12px;
            line-height: 1.1;
            margin: 0;
            padding: 3mm 2mm;
            width: 76mm;
            color: #000;
            background: #fff;
        }
        
        .receipt-header {
            text-align: center;
            margin-bottom: 6px;
            border-bottom: 1px dashed #000;
            padding-bottom: 3px;
        }
        
        .logo {
            width: 80px;
            height: 80px;
        }
        
        .business-name {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 1px;
        }
        
        .business-info {
            font-size: 10px;
            line-height: 1.0;
            margin-bottom: 1px;
        }
        
        .receipt-title {
            font-size: 13px;
            font-weight: bold;
            margin: 4px 0 3px 0;
            text-align: center;
        }
        
        .receipt-info {
            margin-bottom: 4px;
            font-size: 11px;
        }
        
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 1px;
            word-break: break-word;
        }
        
        .items-header {
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            padding: 2px 0;
            margin: 3px 0;
            font-weight: bold;
            font-size: 11px;
        }
        
        .item {
            margin-bottom: 2px;
            font-size: 11px;
        }
        
        .item-name {
            font-weight: bold;
        }
        
        .item-details {
            display: flex;
            justify-content: space-between;
            margin-top: 1px;
        }
        
        .totals {
            border-top: 1px dashed #000;
            padding-top: 5px;
            margin-top: 8px;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 1px;
            font-size: 11px;
        }
        
        .grand-total {
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 2px 0;
            margin: 2px 0;
            font-weight: bold;
            font-size: 12px;
        }
        
        .payment-info {
            margin-top: 4px;
            border-top: 1px dashed #000;
            padding-top: 3px;
        }
        
        .receipt-footer {
            text-align: center;
            margin-top: 5px;
            border-top: 1px dashed #000;
            padding-top: 3px;
            font-size: 10px;
        }
        
        .center {
            text-align: center;
        }
        
        .bold {
            font-weight: bold;
        }
        
        @media print {
            body {
                -webkit-print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <div class="receipt-header">
        <img src="{{ asset('images/logo1.png') }}" alt="O2Temple Logo" class="logo">
        <div class="business-name">O2TEMPLE</div>
        <div class="business-info">
            133/11/C Gothami place,<br>
            Rajagiriya, Sri Lanka<br>
            Tel: +94 71 155 0750
        </div>
    </div>

    <div class="receipt-title">BILL RECEIPT</div>

    <div class="receipt-info">
        <div class="info-row">
            <span>Bill #:</span>
            <span class="bold">{{ $invoice->id }}</span>
        </div>
        @if($invoice->allocation)
        <div class="info-row">
            <span>Booking #:</span>
            <span>{{ $invoice->allocation->booking_number }}</span>
        </div>
        @endif
        <div class="info-row">
            <span>Date:</span>
            <span>{{ $invoice->created_at->format('d/m/Y H:i') }}</span>
        </div>
        <div class="info-row">
            <span>Customer:</span>
            <span>{{ $invoice->customer->name }}</span>
        </div>
        <div class="info-row">
            <span>Phone:</span>
            <span>{{ $invoice->customer->phone }}</span>
        </div>
        @if($invoice->allocation && $invoice->allocation->bed)
        <div class="info-row">
            <span>Bed:</span>
            <span>{{ $invoice->allocation->bed->bed_number }}</span>
        </div>
        @endif
        @if($invoice->allocation && $invoice->allocation->package)
        <div class="info-row">
            <span>Service:</span>
            <span>{{ $invoice->allocation->package->name }}</span>
        </div>
        <div class="info-row">
            <span>Duration:</span>
            <span>{{ $invoice->allocation->package->duration_minutes }} min</span>
        </div>
        <div class="info-row">
            <span>Time:</span>
            <span>{{ $invoice->allocation->start_time->format('H:i') }} - {{ $invoice->allocation->end_time->format('H:i') }}</span>
        </div>
        @endif
    </div>

    <div class="items-header">
        ITEMS
    </div>

    @php
        $hasAdvancePayment = isset($totalAdvancePaid) && $totalAdvancePaid > 0;
    @endphp

    @if($hasAdvancePayment && $originalPackagePrice > 0)
        {{-- Show original package price for bookings with advance payment --}}
        <div class="item">
            <div class="item-name">{{ $invoice->allocation->package->name ?? 'Package' }}</div>
            <div class="item-details">
                <span>1x {{ number_format($originalPackagePrice, 2) }}</span>
                <span>{{ number_format($originalPackagePrice, 2) }}</span>
            </div>
        </div>
    @else
        {{-- Normal item display --}}
        @foreach($invoice->items as $item)
        <div class="item">
            <div class="item-name">{{ $item->item_name }}</div>
            <div class="item-details">
                <span>{{ $item->quantity }}x {{ number_format($item->unit_price, 2) }}</span>
                <span>{{ number_format($item->quantity * $item->unit_price, 2) }}</span>
            </div>
            @if($item->discount_amount > 0)
            <div class="item-details">
                <span>Discount</span>
                <span>-{{ number_format($item->discount_amount, 2) }}</span>
            </div>
            @endif
        </div>
        @endforeach
    @endif

    <div class="totals">
        @if($membershipPackage)
            {{-- Membership Package - Show session info instead of totals --}}
            <div class="total-row" style="font-weight: bold;">
                <span>Membership Package</span>
                <span></span>
            </div>
            <div class="total-row">
                <span>Total Sessions:</span>
                <span>{{ $membershipPackage->num_of_sessions }}</span>
            </div>
            <div class="total-row">
                <span>Sessions Used:</span>
                <span>{{ $membershipPackage->sessions_used }}</span>
            </div>
            <div class="total-row" style="font-weight: bold;">
                <span>Remaining Sessions:</span>
                <span>{{ $membershipPackage->remaining_sessions }}</span>
            </div>
            @if($membershipPackage->remaining_balance > 0)
            <div class="total-row" style="margin-top: 4px; border-top: 1px dashed #000; padding-top: 2px;">
                <span>Package Balance:</span>
                <span>LKR {{ number_format($membershipPackage->remaining_balance, 2) }}</span>
            </div>
            @endif
        @elseif($hasAdvancePayment && $originalPackagePrice > 0)
            <div class="total-row">
                <span>Package Price:</span>
                <span>LKR {{ number_format($originalPackagePrice, 2) }}</span>
            </div>
            <div class="total-row" style="color: #0066cc;">
                <span>Advance Paid:</span>
                <span>-LKR {{ number_format($totalAdvancePaid, 2) }}</span>
            </div>
            <div class="total-row">
                <span>Balance Due:</span>
                <span>LKR {{ number_format($originalPackagePrice - $totalAdvancePaid, 2) }}</span>
            </div>
        @else
            <div class="total-row">
                <span>Subtotal:</span>
                <span>LKR {{ number_format($invoice->subtotal, 2) }}</span>
            </div>
        @endif
        
        @if(!$membershipPackage)
            @if($invoice->discount_amount > 0)
            <div class="total-row">
                <span>Discount:</span>
                <span>-LKR {{ number_format($invoice->discount_amount, 2) }}</span>
            </div>
            @endif
            @if($invoice->service_charge > 0)
            <div class="total-row">
                <span>Service Charge:</span>
                <span>LKR {{ number_format($invoice->service_charge, 2) }}</span>
            </div>
            @endif
            @if($invoice->tax_amount > 0)
            <div class="total-row">
                <span>Tax:</span>
                <span>LKR {{ number_format($invoice->tax_amount, 2) }}</span>
            </div>
            @endif
            
            <div class="total-row grand-total">
                <span>TOTAL:</span>
                <span>LKR {{ number_format($hasAdvancePayment ? $originalPackagePrice : $invoice->total_amount, 2) }}</span>
            </div>
        @endif
    </div>

    @if($hasAdvancePayment && isset($advancePayments) && $advancePayments->count() > 0)
    <div class="payment-info">
        <div class="bold center">ADVANCE PAYMENTS</div>
        @foreach($advancePayments as $advPayment)
        <div class="total-row">
            <span>{{ ucfirst($advPayment->payment_method) }}:</span>
            <span>LKR {{ number_format($advPayment->amount, 2) }}</span>
        </div>
        @endforeach
    </div>
    @endif

    @if(!$membershipPackage && $invoice->payments->isNotEmpty())
    <div class="payment-info">
        <div class="bold center">{{ $hasAdvancePayment ? 'BALANCE PAYMENTS' : 'PAYMENTS' }}</div>
        @foreach($invoice->payments as $payment)
        <div class="total-row">
            <span>{{ ucfirst($payment->payment_method) }}:</span>
            <span>LKR {{ number_format($payment->amount, 2) }}</span>
        </div>
        @endforeach
        
        <div class="total-row grand-total">
            <span>BALANCE:</span>
            <span>LKR {{ number_format($invoice->balance_amount, 2) }}</span>
        </div>
    </div>
    @endif

    <div class="receipt-footer">
        <div>Thank you for visiting!</div>
        <div>{{ now()->format('d/m/Y H:i:s') }}</div>
        <div style="margin-top: 5px;">
            {{ $invoice->creator ? 'Served by: ' . $invoice->creator->name : '' }}
        </div>
    </div>

    <script>
        window.onload = function() {
            window.print();
        }
    </script>
</body>
</html>