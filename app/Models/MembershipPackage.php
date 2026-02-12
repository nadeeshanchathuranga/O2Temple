<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MembershipPackage extends Model
{
    protected $fillable = [
        'package_id',
        'type',
        'name',
        'address',
        'birthday',
        'nic',
        'phone',
        'num_of_sessions',
        'discount_percentage',
        'full_payment',
        'advance_payment',
        'remaining_balance',
        'sessions_used',
        'status',
    ];

    protected $casts = [
        'birthday' => 'date',
        'num_of_sessions' => 'integer',
        'discount_percentage' => 'decimal:2',
        'full_payment' => 'decimal:2',
        'advance_payment' => 'decimal:2',
        'remaining_balance' => 'decimal:2',
        'sessions_used' => 'integer',
    ];

    protected $appends = ['remaining_sessions'];

    /**
     * Get the package that this membership is based on
     */
    public function package()
    {
        return $this->belongsTo(Package::class);
    }

    /**
     * Get the bed allocations for this membership package
     */
    public function allocations()
    {
        return $this->hasMany(BedAllocation::class);
    }

    /**
     * Boot method to handle events
     */
    protected static function boot()
    {
        parent::boot();

        // Calculate remaining balance before creating
        static::creating(function ($package) {
            $discountedAmount = $package->full_payment - ($package->full_payment * $package->discount_percentage / 100);
            $package->remaining_balance = $discountedAmount - $package->advance_payment;
        });

        // Calculate remaining balance before updating
        static::updating(function ($package) {
            if ($package->isDirty(['full_payment', 'advance_payment', 'discount_percentage'])) {
                $discountedAmount = $package->full_payment - ($package->full_payment * $package->discount_percentage / 100);
                $package->remaining_balance = $discountedAmount - $package->advance_payment;
            }
        });
    }

    /**
     * Get remaining sessions
     */
    public function getRemainingSessionsAttribute()
    {
        return $this->num_of_sessions - $this->sessions_used;
    }

    /**
     * Check if package is active
     */
    public function isActive()
    {
        return $this->status === 'active' && $this->sessions_used < $this->num_of_sessions;
    }

    /**
     * Use a session
     */
    public function useSession()
    {
        if ($this->isActive()) {
            $this->increment('sessions_used');
            
            // Auto-expire if all sessions are used
            if ($this->sessions_used >= $this->num_of_sessions) {
                $this->update(['status' => 'expired']);
            }
            
            return true;
        }
        
        return false;
    }
}
