<?php

namespace App\Services;

use App\Models\Bed;
use App\Models\BedAllocation;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class BedAvailabilityService
{
    /**
     * Get all beds with their current availability status.
     */
    public function getAllBedsWithStatus(): Collection
    {
        $now = now();
        
        // Get all current allocations in one query
        // Only consider allocations with paid payment status
        $currentAllocations = BedAllocation::with(['customer', 'package'])
            ->where('start_time', '<=', $now)
            ->where('end_time', '>=', $now)
            ->whereIn('status', ['confirmed', 'in_progress'])
            ->where('payment_status', 'paid')
            ->get()
            ->keyBy('bed_id');
        
        // Get upcoming allocations in the next 30 minutes
        $upcomingAllocations = BedAllocation::with(['customer', 'package'])
            ->where('start_time', '>', $now)
            ->where('start_time', '<=', $now->copy()->addMinutes(30))
            ->whereIn('status', ['confirmed', 'in_progress'])
            ->where('payment_status', 'paid')
            ->get()
            ->keyBy('bed_id');
        
        return Bed::available()->orderByGrid()->get()->map(function ($bed) use ($currentAllocations, $upcomingAllocations) {
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
                'display_name' => $bed->display_name ?? 'Table ' . $bed->bed_number,
                'grid_row' => $bed->grid_row,
                'grid_col' => $bed->grid_col,
                'bed_type' => $bed->bed_type,
                'status' => $status,
                'current_allocation' => $currentAllocation,
            ];
        });
    }

    /**
     * Check if a specific bed is available for a given time range.
     */
    public function isBedAvailable(int $bedId, Carbon $startTime, Carbon $endTime, ?int $excludeAllocationId = null): bool
    {
        $bed = Bed::find($bedId);
        
        if (!$bed || $bed->status === 'maintenance') {
            return false;
        }

        return !BedAllocation::where('bed_id', $bedId)
            ->where('status', '!=', 'cancelled')
            ->when($excludeAllocationId, fn($q) => $q->where('id', '!=', $excludeAllocationId))
            ->where(function ($q) use ($startTime, $endTime) {
                $q->where('start_time', '<', $endTime)
                  ->where('end_time', '>', $startTime);
            })
            ->exists();
    }

    /**
     * Get available beds for a specific time range.
     */
    public function getAvailableBeds(Carbon $startTime, Carbon $endTime): Collection
    {
        $allBeds = Bed::available()->orderByGrid()->get();
        
        // Get all conflicting allocations
        $conflictingBedIds = BedAllocation::where('status', '!=', 'cancelled')
            ->where('start_time', '<', $endTime)
            ->where('end_time', '>', $startTime)
            ->pluck('bed_id')
            ->unique();

        return $allBeds->filter(fn($bed) => !$conflictingBedIds->contains($bed->id));
    }

    /**
     * Get bed availability for a specific date with all time slots.
     */
    public function getBedAvailabilityForDate(int $bedId, Carbon $date): array
    {
        $bed = Bed::find($bedId);
        
        if (!$bed) {
            return [];
        }

        $allocations = $bed->getAllocationsForDate($date);
        
        // Define business hours (8 AM to 10 PM)
        $businessStart = $date->copy()->setTime(8, 0);
        $businessEnd = $date->copy()->setTime(22, 0);

        $timeSlots = [];
        $currentTime = $businessStart->copy();

        while ($currentTime < $businessEnd) {
            $slotEnd = $currentTime->copy()->addMinutes(30);
            
            $isOccupied = $allocations->contains(function ($allocation) use ($currentTime, $slotEnd) {
                return $allocation->start_time < $slotEnd && $allocation->end_time > $currentTime;
            });

            $allocation = $isOccupied ? $allocations->first(function ($alloc) use ($currentTime) {
                return $alloc->start_time <= $currentTime && $alloc->end_time > $currentTime;
            }) : null;

            $timeSlots[] = [
                'start_time' => $currentTime->format('H:i'),
                'end_time' => $slotEnd->format('H:i'),
                'is_available' => !$isOccupied && $currentTime >= now(),
                'is_past' => $currentTime < now(),
                'allocation' => $allocation ? [
                    'id' => $allocation->id,
                    'booking_number' => $allocation->booking_number,
                    'customer_name' => $allocation->customer->name ?? 'Unknown',
                ] : null,
            ];

            $currentTime = $slotEnd;
        }

        return $timeSlots;
    }

    /**
     * Get all beds with availability for a specific time range.
     */
    public function getBedsWithAvailability(Carbon $date, ?string $startTime = null, ?string $endTime = null): Collection
    {
        $beds = Bed::available()->orderByGrid()->get();

        return $beds->map(function ($bed) use ($date, $startTime, $endTime) {
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
                $start = Carbon::parse($date->format('Y-m-d') . ' ' . $startTime);
                $end = Carbon::parse($date->format('Y-m-d') . ' ' . $endTime);

                $conflicts = BedAllocation::where('bed_id', $bed->id)
                    ->where('status', '!=', 'cancelled')
                    ->where('start_time', '<', $end)
                    ->where('end_time', '>', $start)
                    ->with(['customer', 'package'])
                    ->get();

                $availability['is_available'] = $conflicts->isEmpty();
                $availability['conflicting_bookings'] = $conflicts->map(fn($booking) => [
                    'id' => $booking->id,
                    'booking_number' => $booking->booking_number,
                    'customer_name' => $booking->customer->name ?? 'Unknown',
                    'start_time' => $booking->start_time->format('H:i'),
                    'end_time' => $booking->end_time->format('H:i'),
                ]);
            }

            // Get all bookings for the day
            $dayBookings = $bed->getAllocationsForDate($date);
            $availability['day_bookings'] = $dayBookings->map(fn($booking) => [
                'id' => $booking->id,
                'booking_number' => $booking->booking_number,
                'customer_name' => $booking->customer->name ?? 'Unknown',
                'start_time' => $booking->start_time->format('H:i'),
                'end_time' => $booking->end_time->format('H:i'),
                'status' => $booking->status,
            ]);

            return $availability;
        });
    }

    /**
     * Automatically update bed statuses based on current time.
     * This should be called by a scheduler.
     */
    public function updateBedStatuses(): void
    {
        $now = now();

        // Find allocations that have ended but are still marked as active
        BedAllocation::where('status', 'in_progress')
            ->where('end_time', '<', $now)
            ->update(['status' => 'completed']);

        // Find allocations that should be in progress
        BedAllocation::where('status', 'confirmed')
            ->where('start_time', '<=', $now)
            ->where('end_time', '>', $now)
            ->update(['status' => 'in_progress']);

        // Cancel bookings that are 15 minutes past their start time and have no invoice/payment
        $overdueAllocations = BedAllocation::where('status', 'confirmed')
            ->where('start_time', '<', $now->copy()->subMinutes(15))
            ->whereDoesntHave('invoices', function ($query) {
                $query->whereIn('status', ['draft', 'pending', 'completed'])
                      ->where('payment_status', '!=', 'unpaid');
            })
            ->get();

        foreach ($overdueAllocations as $allocation) {
            $allocation->update([
                'status' => 'cancelled',
                'notes' => ($allocation->notes ? $allocation->notes . ' | ' : '') . 'Auto-cancelled: No payment received within 15 minutes.'
            ]);
        }
        
        // Update bed table status based on paid allocations
        $this->updateBedTableStatuses();
    }
    
    /**
     * Update the status column in the beds table based on paid allocations.
     */
    public function updateBedTableStatuses(): void
    {
        $now = now();
        
        // Get all current paid allocations
        $currentAllocations = BedAllocation::where('start_time', '<=', $now)
            ->where('end_time', '>=', $now)
            ->whereIn('status', ['confirmed', 'in_progress'])
            ->where('payment_status', 'paid')
            ->pluck('bed_id')
            ->unique();
        
        // Get upcoming paid allocations (within 30 minutes)
        $upcomingAllocations = BedAllocation::where('start_time', '>', $now)
            ->where('start_time', '<=', $now->copy()->addMinutes(30))
            ->whereIn('status', ['confirmed', 'in_progress'])
            ->where('payment_status', 'paid')
            ->pluck('bed_id')
            ->unique();
        
        // Update beds to 'occupied' if they have current paid allocations
        Bed::whereIn('id', $currentAllocations)
            ->where('status', '!=', 'maintenance')
            ->update(['status' => 'occupied']);
        
        // Update beds to 'booked_soon' if they have upcoming paid allocations (but not currently occupied)
        Bed::whereIn('id', $upcomingAllocations)
            ->whereNotIn('id', $currentAllocations)
            ->where('status', '!=', 'maintenance')
            ->update(['status' => 'booked_soon']);
        
        // Update beds to 'available' if they have no current or upcoming paid allocations
        $busyBedIds = $currentAllocations->merge($upcomingAllocations)->unique();
        Bed::whereNotIn('id', $busyBedIds)
            ->where('status', '!=', 'maintenance')
            ->update(['status' => 'available']);
    }
}
