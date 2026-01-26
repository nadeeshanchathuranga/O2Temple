<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;
use Carbon\CarbonInterface;

class BedAllocation extends Model
{
    protected $fillable = [
        'booking_number',
        'customer_id',
        'bed_id',
        'package_id',
        'start_time',
        'end_time',
        'status',
        'payment_status',
        'total_amount',
        'discount_amount',
        'service_charge',
        'tax_amount',
        'final_amount',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'status' => 'string',
        'payment_status' => 'string',
        'total_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'service_charge' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'final_amount' => 'decimal:2',
    ];

    /**
     * Boot the model and add event listeners.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->booking_number)) {
                $model->booking_number = self::generateBookingNumber();
            }
        });
    }

    /**
     * Generate a unique booking number.
     */
    public static function generateBookingNumber(): string
    {
        $prefix = 'BK';
        $date = now()->format('ymd');
        $lastBooking = self::whereDate('created_at', today())
            ->orderBy('id', 'desc')
            ->first();

        $sequence = $lastBooking ? (int) substr($lastBooking->booking_number, -4) + 1 : 1;
        
        return $prefix . $date . str_pad($sequence, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Get the customer that owns the allocation.
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Get the bed that owns the allocation.
     */
    public function bed(): BelongsTo
    {
        return $this->belongsTo(Bed::class);
    }

    /**
     * Get the package that owns the allocation.
     */
    public function package(): BelongsTo
    {
        return $this->belongsTo(Package::class);
    }

    /**
     * Get the payment for the allocation.
     */
    public function payment(): HasOne
    {
        return $this->hasOne(Payment::class, 'allocation_id');
    }

    /**
     * Get the invoices for the allocation.
     */
    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class, 'allocation_id');
    }

    /**
     * Get the user who created the booking.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Calculate end time based on start time and package duration
     */
    public function calculateEndTime(): Carbon
    {
        return $this->start_time->addMinutes($this->package->duration_minutes);
    }

    /**
     * Check if the booking is currently active (in progress)
     */
    public function isActive(): bool
    {
        $now = now();
        return $this->start_time <= $now && $this->end_time >= $now && $this->status !== 'cancelled';
    }

    /**
     * Check if the booking has ended
     */
    public function hasEnded(): bool
    {
        return $this->end_time < now();
    }

    /**
     * Check if the booking is upcoming
     */
    public function isUpcoming(): bool
    {
        return $this->start_time > now() && $this->status !== 'cancelled';
    }

    /**
     * Scope to get active bookings for a bed at a specific time range
     */
    public function scopeConflictsWith($query, int $bedId, CarbonInterface $startTime, CarbonInterface $endTime, ?int $excludeId = null)
    {
        return $query->where('bed_id', $bedId)
            ->where('status', '!=', 'cancelled')
            ->when($excludeId, fn($q) => $q->where('id', '!=', $excludeId))
            ->where(function ($q) use ($startTime, $endTime) {
                $q->where(function ($inner) use ($startTime, $endTime) {
                    $inner->where('start_time', '<', $endTime)
                          ->where('end_time', '>', $startTime);
                });
            });
    }

    /**
     * Scope to get bookings for today
     */
    public function scopeToday($query)
    {
        return $query->whereDate('start_time', today());
    }

    /**
     * Scope to get active/upcoming bookings
     */
    public function scopeActiveOrUpcoming($query)
    {
        return $query->where('end_time', '>=', now())
                     ->where('status', '!=', 'cancelled');
    }
}
