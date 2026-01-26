<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

class Bed extends Model
{
    protected $fillable = [
        'bed_number',
        'display_name',
        'grid_row',
        'grid_col',
        'bed_type',
        'hourly_rate',
        'description',
        'status',
    ];

    protected $casts = [
        'status' => 'string',
        'grid_row' => 'integer',
        'grid_col' => 'integer',
        'hourly_rate' => 'decimal:2',
    ];

    /**
     * Get the bed allocations for the bed.
     */
    public function allocations(): HasMany
    {
        return $this->hasMany(BedAllocation::class);
    }

    /**
     * Check if bed is available (not under maintenance)
     */
    public function isAvailable(): bool
    {
        return $this->status !== 'maintenance';
    }

    /**
     * Check if bed is available at a specific time range
     */
    public function isAvailableAt(Carbon $startTime, Carbon $endTime, ?int $excludeAllocationId = null): bool
    {
        if ($this->status === 'maintenance') {
            return false;
        }

        return !$this->allocations()
            ->conflictsWith($this->id, $startTime, $endTime, $excludeAllocationId)
            ->exists();
    }

    /**
     * Get the current allocation if bed is occupied
     */
    public function getCurrentAllocation()
    {
        return $this->allocations()
            ->where('start_time', '<=', now())
            ->where('end_time', '>=', now())
            ->whereIn('status', ['confirmed', 'in_progress'])
            ->where('payment_status', 'paid')
            ->first();
    }

    /**
     * Get all allocations for a specific date
     */
    public function getAllocationsForDate(Carbon $date)
    {
        return $this->allocations()
            ->whereDate('start_time', $date)
            ->where('status', '!=', 'cancelled')
            ->orderBy('start_time')
            ->get();
    }

    /**
     * Get availability status for display
     * Returns: 'available', 'occupied', 'maintenance', 'booked_soon'
     */
    public function getAvailabilityStatus(): string
    {
        if ($this->status === 'maintenance') {
            return 'maintenance';
        }

        $currentAllocation = $this->getCurrentAllocation();
        if ($currentAllocation) {
            return 'occupied';
        }

        // Check if there's a booking in the next 30 minutes
        $upcomingAllocation = $this->allocations()
            ->where('start_time', '>', now())
            ->where('start_time', '<=', now()->addMinutes(30))
            ->whereIn('status', ['confirmed', 'in_progress'])
            ->where('payment_status', 'paid')
            ->first();

        if ($upcomingAllocation) {
            return 'booked_soon';
        }

        return 'available';
    }

    /**
     * Scope to get available beds
     */
    public function scopeAvailable($query)
    {
        return $query->where('status', '!=', 'maintenance');
    }

    /**
     * Scope to order beds by grid position
     */
    public function scopeOrderByGrid($query)
    {
        return $query->orderBy('grid_row')->orderBy('grid_col');
    }
}
