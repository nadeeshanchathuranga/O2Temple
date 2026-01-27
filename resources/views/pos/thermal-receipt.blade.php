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
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.2;
            margin: 0;
            padding: 5mm;
            width: 70mm;
            color: #000;
            background: #fff;
        }
        
        .receipt-header {
            text-align: center;
            margin-bottom: 10px;
            border-bottom: 1px dashed #000;
            padding-bottom: 5px;
        }
        
        .business-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 2px;
        }
        
        .business-info {
            font-size: 10px;
            line-height: 1.1;
        }
        
        .receipt-title {
            font-size: 14px;
            font-weight: bold;
            margin: 8px 0;
            text-align: center;
        }
        
        .receipt-info {
            margin-bottom: 8px;
            font-size: 11px;
        }
        
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
        }
        
        .items-header {
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            padding: 3px 0;
            margin: 8px 0;
            font-weight: bold;
            font-size: 11px;
        }
        
        .item {
            margin-bottom: 3px;
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
            margin-bottom: 2px;
            font-size: 11px;
        }
        
        .grand-total {
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 3px 0;
            margin: 3px 0;
            font-weight: bold;
            font-size: 12px;
        }
        
        .payment-info {
            margin-top: 8px;
            border-top: 1px dashed #000;
            padding-top: 5px;
        }
        
        .receipt-footer {
            text-align: center;
            margin-top: 10px;
            border-top: 1px dashed #000;
            padding-top: 5px;
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

    <div class="totals">
        <div class="total-row">
            <span>Subtotal:</span>
            <span>LKR {{ number_format($invoice->subtotal, 2) }}</span>
        </div>
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
            <span>LKR {{ number_format($invoice->total_amount, 2) }}</span>
        </div>
    </div>

    @if($invoice->payments->isNotEmpty())
    <div class="payment-info">
        <div class="bold center">PAYMENTS</div>
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