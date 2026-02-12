<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    protected $fillable = [
        'invoice_number',
        'customer_id',
        'allocation_id',
        'parent_invoice_id',
        'invoice_type',
        'subtotal',
        'discount_amount',
        'discount_percentage',
        'service_charge',
        'service_charge_percentage',
        'tax_amount',
        'tax_percentage',
        'additional_charges',
        'total_amount',
        'paid_amount',
        'balance_amount',
        'payment_status',
        'status',
        'kitchen_note',
        'notes',
        'created_by',
        'completed_by',
        'completed_at',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'discount_percentage' => 'decimal:2',
        'service_charge' => 'decimal:2',
        'service_charge_percentage' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'tax_percentage' => 'decimal:2',
        'additional_charges' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'balance_amount' => 'decimal:2',
        'completed_at' => 'datetime',
    ];

    /**
     * Boot the model and add event listeners.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->invoice_number)) {
                $model->invoice_number = self::generateInvoiceNumber();
            }
        });
    }

    /**
     * Generate a unique invoice number.
     */
    public static function generateInvoiceNumber(): string
    {
        $prefix = 'INV';
        $date = now()->format('ymd');
        $lastInvoice = self::whereDate('created_at', today())
            ->orderBy('id', 'desc')
            ->first();

        $sequence = $lastInvoice ? (int) substr($lastInvoice->invoice_number, -4) + 1 : 1;
        
        return $prefix . $date . str_pad($sequence, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Get the customer that owns the invoice.
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Get the bed allocation associated with the invoice.
     */
    public function allocation(): BelongsTo
    {
        return $this->belongsTo(BedAllocation::class, 'allocation_id');
    }

    /**
     * Get the parent invoice (for add-on invoices).
     */
    public function parentInvoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'parent_invoice_id');
    }

    /**
     * Get child invoices (add-ons).
     */
    public function childInvoices(): HasMany
    {
        return $this->hasMany(Invoice::class, 'parent_invoice_id');
    }

    /**
     * Get the invoice items.
     */
    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    /**
     * Get the payments for the invoice.
     */
    public function payments(): HasMany
    {
        return $this->hasMany(InvoicePayment::class);
    }

    /**
     * Get the user who created the invoice.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user who completed the invoice.
     */
    public function completedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by');
    }

    /**
     * Calculate and update totals.
     */
    public function calculateTotals(): void
    {
        $subtotal = $this->items()->sum('total_price') ?? 0;
        
        // Ensure percentages and amounts have default values
        $discountPercentage = $this->discount_percentage ?? 0;
        $discountAmountStored = $this->discount_amount ?? 0;
        $serviceChargePercentage = $this->service_charge_percentage ?? 0;
        $serviceChargeStored = $this->service_charge ?? 0;
        $taxPercentage = $this->tax_percentage ?? 0;
        $taxAmountStored = $this->tax_amount ?? 0;
        $additionalCharges = $this->additional_charges ?? 0;
        
        $discountAmount = $discountPercentage > 0 
            ? ($subtotal * $discountPercentage / 100) 
            : $discountAmountStored;
        
        $afterDiscount = $subtotal - $discountAmount;
        
        $serviceCharge = $serviceChargePercentage > 0 
            ? ($afterDiscount * $serviceChargePercentage / 100) 
            : $serviceChargeStored;
        
        $taxableAmount = $afterDiscount + $serviceCharge;
        $taxAmount = $taxPercentage > 0 
            ? ($taxableAmount * $taxPercentage / 100) 
            : $taxAmountStored;
        
        $totalAmount = $taxableAmount + $taxAmount + $additionalCharges;
        $paidAmount = $this->payments()->where('status', 'completed')->sum('amount') ?? 0;
        $balanceAmount = $totalAmount - $paidAmount;

        $this->update([
            'subtotal' => $subtotal,
            'discount_amount' => $discountAmount,
            'service_charge' => $serviceCharge,
            'tax_amount' => $taxAmount,
            'total_amount' => $totalAmount,
            'paid_amount' => $paidAmount,
            'balance_amount' => $balanceAmount,
            'payment_status' => $this->determinePaymentStatus($paidAmount, $totalAmount),
        ]);
    }

    /**
     * Determine payment status based on amounts.
     */
    protected function determinePaymentStatus(float $paid, float $total): string
    {
        if ($paid <= 0) {
            return 'unpaid';
        }
        if ($paid >= $total) {
            return 'paid';
        }
        return 'partial';
    }

    /**
     * Mark invoice as completed.
     */
    public function markAsCompleted(?int $userId = null): void
    {
        $this->update([
            'status' => 'completed',
            'payment_status' => 'paid',
            'completed_by' => $userId,
            'completed_at' => now(),
        ]);
    }

    /**
     * Add a payment to the invoice.
     */
    public function addPayment(float $amount, string $method, ?string $reference = null, ?int $processedBy = null): InvoicePayment
    {
        $payment = $this->payments()->create([
            'amount' => $amount,
            'payment_method' => $method,
            'reference_number' => $reference,
            'processed_by' => $processedBy,
            'payment_date' => now(),
            'status' => 'completed',
        ]);

        $this->calculateTotals();

        return $payment;
    }

    /**
     * Scope to get pending invoices.
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope to get today's invoices.
     */
    public function scopeToday($query)
    {
        return $query->whereDate('created_at', today());
    }
}
