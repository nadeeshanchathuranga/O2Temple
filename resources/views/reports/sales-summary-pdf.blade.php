<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>{{ $title }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            margin: 20px;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #ddd;
            padding-bottom: 20px;
        }
        .title {
            font-size: 24px;
            font-weight: bold;
            color: #2d3748;
            margin-bottom: 10px;
        }
        .subtitle {
            font-size: 14px;
            color: #666;
            margin-bottom: 5px;
        }
        .generated-date {
            font-size: 12px;
            color: #888;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            font-size: 11px;
        }
        th {
            background-color: #f8f9fa;
            font-weight: bold;
            color: #2d3748;
        }
        .amount {
            text-align: right;
        }
        .total-row {
            font-weight: bold;
            background-color: #f0f9ff;
            border-top: 2px solid #3b82f6;
        }
        .total-row td {
            border-top: 2px solid #3b82f6;
        }
        .no-data {
            text-align: center;
            padding: 40px;
            color: #666;
            font-style: italic;
        }
        .summary-stats {
            display: table;
            width: 100%;
            margin-bottom: 20px;
        }
        .stat-item {
            display: table-cell;
            text-align: center;
            padding: 15px;
            border: 1px solid #ddd;
            background-color: #f8f9fa;
        }
        .stat-value {
            font-size: 18px;
            font-weight: bold;
            color: #2d3748;
        }
        .stat-label {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">{{ $title }}</div>
        <div class="subtitle">O2Temple POS System - Sales Report</div>
        <div class="generated-date">Generated on: {{ now()->format('F j, Y - H:i A') }}</div>
    </div>

    @if(count($data) > 0)
        <div class="summary-stats">
            <div class="stat-item">
                <div class="stat-value">{{ count($data) }}</div>
                <div class="stat-label">Total Sales</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">LKR {{ number_format(collect($data)->sum('amount'), 2) }}</div>
                <div class="stat-label">Total Revenue</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">LKR {{ number_format(collect($data)->avg('amount'), 2) }}</div>
                <div class="stat-label">Average Sale</div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width: 15%;">Invoice #</th>
                    <th style="width: 20%;">Customer</th>
                    <th style="width: 15%;">Package/Service</th>
                    <th style="width: 12%;">Type</th>
                    <th style="width: 13%;">Payment</th>
                    <th style="width: 12%;">Amount (LKR)</th>
                    <th style="width: 13%;">Date & Time</th>
                </tr>
            </thead>
            <tbody>
                @foreach($data as $row)
                    <tr>
                        <td>{{ $row['invoice_number'] }}</td>
                        <td>
                            {{ $row['customer_name'] }}<br>
                            <small style="color: #666;">{{ $row['customer_phone'] }}</small>
                        </td>
                        <td>{{ $row['package_name'] }}</td>
                        <td>{{ $row['invoice_type'] }}</td>
                        <td>{{ $row['payment_method'] }}</td>
                        <td class="amount">{{ number_format($row['amount'], 2) }}</td>
                        <td>
                            {{ $row['date'] }}<br>
                            <small style="color: #666;">{{ $row['time'] }}</small>
                        </td>
                    </tr>
                @endforeach
            </tbody>
            <tfoot>
                <tr class="total-row">
                    <td colspan="5">TOTAL ({{ count($data) }} sales)</td>
                    <td class="amount">{{ number_format(collect($data)->sum('amount'), 2) }}</td>
                    <td></td>
                </tr>
            </tfoot>
        </table>
    @else
        <div class="no-data">
            <h3>No Sales Data Available</h3>
            <p>There are no sales records for the selected period.</p>
        </div>
    @endif
</body>
</html>