import React, { useState, useEffect } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeftIcon,
  ClockIcon,
  CalendarIcon,
  UserIcon,
  RectangleStackIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import axios from 'axios';

interface Bed {
  id: number;
  bed_number: string;
  status: string;
}

interface Package {
  id: number;
  name: string;
  duration_minutes: number;
  price: number;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
}

interface MembershipPackage {
  id: number;
  package_id?: number;
  type: 'individual' | 'company';
  name: string;
  address: string;
  birthday?: string;
  nic?: string;
  phone: string;
  num_of_sessions: number;
  sessions_used: number;
  discount_percentage: number;
  full_payment: number;
  advance_payment: number;
  remaining_balance: number;
  status: 'active' | 'inactive' | 'expired';
  package?: {
    id: number;
    name: string;
    duration_minutes: number;
    price: number;
  };
}

interface Booking {
  id: number;
  customer: Customer;
  bed: Bed;
  package: Package;
  membership_package?: MembershipPackage;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded';
  total_amount: number;
  created_at: string;
}

interface TimeSlot {
  start_time: string;
  end_time: string;
  display_time: string;
}

interface Props {
  booking: Booking;
  beds: Bed[];
  packages: Package[];
  customers: Customer[];
  membershipPackages: MembershipPackage[];
}

const EditBooking: React.FC<Props> = ({ booking, beds, packages, customers, membershipPackages }) => {
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(booking.package);
  const [selectedDate, setSelectedDate] = useState(new Date(booking.start_time).toISOString().split('T')[0]);
  const [customerType, setCustomerType] = useState<'regular' | 'membership'>(booking.membership_package ? 'membership' : 'regular');
  const [selectedMembershipPackage, setSelectedMembershipPackage] = useState<MembershipPackage | null>(booking.membership_package || null);

  const { data, setData, put, processing, errors } = useForm({
    customer_id: booking.customer.id.toString(),
    membership_package_id: booking.membership_package?.id.toString() || '',
    bed_id: booking.bed.id.toString(),
    package_id: booking.package.id.toString(),
    start_time: booking.start_time,
    status: booking.status,
    payment_status: booking.payment_status,
  });

  // Fetch available slots when bed, package, and date are selected
  useEffect(() => {
    if (data.bed_id && data.package_id && selectedDate) {
      fetchAvailableSlots();
    } else {
      setAvailableSlots([]);
    }
  }, [data.bed_id, data.package_id, selectedDate]);

  const fetchAvailableSlots = async () => {
    setLoadingSlots(true);
    try {
      const response = await axios.get('/bookings/available-slots', {
        params: {
          bed_id: data.bed_id,
          package_duration: selectedPackage?.duration_minutes,
          date: selectedDate,
          exclude_booking: booking.id, // Exclude current booking from conflicts
        },
      });
      
      // Add current booking's time slot to available slots if editing
      const currentSlot: TimeSlot = {
        start_time: booking.start_time,
        end_time: booking.end_time,
        display_time: new Date(booking.start_time).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }) + ' - ' + new Date(booking.end_time).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }) + ' (Current)'
      };
      
      setAvailableSlots([currentSlot, ...response.data.slots]);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      // Fallback - show current slot only
      const currentSlot: TimeSlot = {
        start_time: booking.start_time,
        end_time: booking.end_time,
        display_time: new Date(booking.start_time).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }) + ' - ' + new Date(booking.end_time).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }) + ' (Current)'
      };
      setAvailableSlots([currentSlot]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handlePackageChange = (packageId: string) => {
    setData('package_id', packageId);
    const pkg = packages.find(p => p.id === parseInt(packageId));
    setSelectedPackage(pkg || null);
  };

  const handleCustomerTypeChange = (type: 'regular' | 'membership') => {
    setCustomerType(type);
    if (type === 'regular') {
      setData({
        ...data,
        membership_package_id: '',
      });
      setSelectedMembershipPackage(null);
    } else {
      setData({
        ...data,
        customer_id: '',
      });
    }
  };

  const handleMembershipPackageChange = (membershipPackageId: string) => {
    setData('membership_package_id', membershipPackageId);
    const membershipPkg = membershipPackages.find(mp => mp.id === parseInt(membershipPackageId));
    setSelectedMembershipPackage(membershipPkg || null);
    
    // Auto-fill package if membership package has associated package
    if (membershipPkg?.package) {
      setData('package_id', membershipPkg.package.id.toString());
      setSelectedPackage(membershipPkg.package);
    }
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setData({
      ...data,
      start_time: slot.start_time,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    put(`/bookings/${booking.id}`, {
      preserveState: true,
      onSuccess: () => {
        router.get('/bookings');
      },
    });
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Head title={`Edit Booking #${booking.id}`} />
      
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => router.get('/bookings')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
              </Button>
              
              <h1 className="text-xl font-semibold text-gray-900">Edit Booking #{booking.id}</h1>
            </div>
            
            <div className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium">
              Edit Booking
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Booking Details */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="bg-white border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <UserIcon className="w-5 h-5 text-blue-600" />
                      Customer Information
                    </CardTitle>
                    <CardDescription className="text-gray-500">Update customer for this booking</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Customer Type Selection */}
                    <div>
                      <Label className="text-gray-700 mb-3 block">Customer Type *</Label>
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() => handleCustomerTypeChange('regular')}
                          className={`flex-1 p-3 border-2 rounded-lg text-center transition-all ${
                            customerType === 'regular'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 bg-white text-gray-900 hover:border-blue-300'
                          }`}
                        >
                          <div className="font-medium">Regular Customer</div>
                          <div className="text-xs mt-1">Select from customer list</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCustomerTypeChange('membership')}
                          className={`flex-1 p-3 border-2 rounded-lg text-center transition-all ${
                            customerType === 'membership'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 bg-white text-gray-900 hover:border-blue-300'
                          }`}
                        >
                          <div className="font-medium">Membership Package</div>
                          <div className="text-xs mt-1">Use membership session</div>
                        </button>
                      </div>
                    </div>

                    {/* Regular Customer Selection */}
                    {customerType === 'regular' && (
                      <div>
                        <Label htmlFor="customer_id" className="text-gray-700">Select Customer *</Label>
                        <select
                          id="customer_id"
                          value={data.customer_id}
                          onChange={(e) => setData('customer_id', e.target.value)}
                          className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-blue-500 bg-white text-gray-900"
                          required={customerType === 'regular'}
                        >
                          <option value="">Select a customer</option>
                          {customers && customers.length > 0 ? (
                            customers.map((customer) => (
                              <option key={customer.id} value={customer.id}>
                                {customer.name} - {customer.phone}
                              </option>
                            ))
                          ) : (
                            <option value="" disabled>No customers available</option>
                          )}
                        </select>
                        {errors.customer_id && (
                          <p className="text-red-500 text-sm mt-1">{errors.customer_id}</p>
                        )}
                      </div>
                    )}

                    {/* Membership Package Selection */}
                    {customerType === 'membership' && (
                      <div>
                        <Label htmlFor="membership_package_id" className="text-gray-700">Select Membership Package *</Label>
                        <select
                          id="membership_package_id"
                          value={data.membership_package_id}
                          onChange={(e) => handleMembershipPackageChange(e.target.value)}
                          className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-blue-500 bg-white text-gray-900"
                          required={customerType === 'membership'}
                        >
                          <option value="">Select a membership package</option>
                          {membershipPackages && membershipPackages.length > 0 ? (
                            membershipPackages.map((membershipPkg) => (
                              <option key={membershipPkg.id} value={membershipPkg.id}>
                                {membershipPkg.name} - {membershipPkg.phone} (Sessions: {membershipPkg.num_of_sessions - membershipPkg.sessions_used} remaining)
                              </option>
                            ))
                          ) : (
                            <option value="" disabled>No membership packages available</option>
                          )}
                        </select>
                        {errors.membership_package_id && (
                          <p className="text-red-500 text-sm mt-1">{errors.membership_package_id}</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Bed and Package Selection */}
                <Card className="bg-white border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <RectangleStackIcon className="w-5 h-5 text-blue-600" />
                      Booking Details
                    </CardTitle>
                    <CardDescription className="text-gray-500">Update booking information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Bed Selection */}
                      <div>
                        <Label htmlFor="bed_id" className="text-gray-700">Select Bed *</Label>
                        <select
                          id="bed_id"
                          value={data.bed_id}
                          onChange={(e) => setData('bed_id', e.target.value)}
                          className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-blue-500 bg-white text-gray-900"
                          required
                        >
                          <option value="">Select a bed</option>
                          {beds && beds.length > 0 ? (
                            beds.map((bed) => (
                              <option key={bed.id} value={bed.id}>
                                {bed.bed_number}
                              </option>
                            ))
                          ) : (
                            <option value="" disabled>No beds available</option>
                          )}
                        </select>
                        {errors.bed_id && (
                          <p className="text-red-500 text-sm mt-1">{errors.bed_id}</p>
                        )}
                      </div>

                      {/* Package Selection - Conditional for regular customers */}
                      {customerType === 'regular' && (
                        <div>
                          <Label htmlFor="package_id" className="text-gray-700">Select Package *</Label>
                          <select
                            id="package_id"
                            value={data.package_id}
                            onChange={(e) => handlePackageChange(e.target.value)}
                            className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-blue-500 bg-white text-gray-900"
                            required
                          >
                            <option value="">Select a package</option>
                            {packages && packages.length > 0 ? (
                              packages.map((pkg) => (
                                <option key={pkg.id} value={pkg.id}>
                                  {pkg.name} - {pkg.duration_minutes} min - LKR {pkg.price}
                                </option>
                              ))
                            ) : (
                              <option value="" disabled>No packages available</option>
                            )}
                          </select>
                          {errors.package_id && (
                            <p className="text-red-500 text-sm mt-1">{errors.package_id}</p>
                          )}
                        </div>
                      )}

                      {/* Package Display for membership customers */}
                      {customerType === 'membership' && selectedMembershipPackage?.package && (
                        <div>
                          <Label className="text-gray-700">Package (From Membership)</Label>
                          <div className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-700">
                            {selectedMembershipPackage.package.name} - {selectedMembershipPackage.package.duration_minutes} min
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Date and Time Selection */}
                <Card className="bg-white border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <ClockIcon className="w-5 h-5 text-blue-600" />
                      Schedule
                    </CardTitle>
                    <CardDescription className="text-gray-500">Update date and time</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="booking_date" className="text-gray-700">Date *</Label>
                      <Input
                        type="date"
                        id="booking_date"
                        value={selectedDate}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className="mt-1 focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>

                    {availableSlots.length > 0 && (
                      <div>
                        <Label className="text-gray-700">Available Time Slots *</Label>
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {availableSlots.map((slot, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleSlotSelect(slot)}
                              className={`p-3 border-2 rounded-lg text-center transition-all ${
                                data.start_time === slot.start_time
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-gray-200 bg-white text-gray-900 hover:border-blue-300'
                              }`}
                            >
                              <div className="font-medium">{slot.display_time}</div>
                            </button>
                          ))}
                        </div>
                        {loadingSlots && (
                          <div className="text-center py-4 text-gray-500">Loading available slots...</div>
                        )}
                        {errors.start_time && (
                          <p className="text-red-500 text-sm mt-1">{errors.start_time}</p>
                        )}
                      </div>
                    )}

                    {/* Status and Payment Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="status" className="text-gray-700">Booking Status *</Label>
                        <select
                          id="status"
                          value={data.status}
                          onChange={(e) => setData('status', e.target.value)}
                          className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-blue-500 bg-white text-gray-900"
                          required
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        {errors.status && (
                          <p className="text-red-500 text-sm mt-1">{errors.status}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="payment_status" className="text-gray-700">Payment Status *</Label>
                        <select
                          id="payment_status"
                          value={data.payment_status}
                          onChange={(e) => setData('payment_status', e.target.value)}
                          className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-blue-500 bg-white text-gray-900"
                          required
                        >
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="refunded">Refunded</option>
                        </select>
                        {errors.payment_status && (
                          <p className="text-red-500 text-sm mt-1">{errors.payment_status}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Summary */}
              <div className="space-y-6">
                <Card className="bg-white border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Booking Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Booking ID:</span>
                        <span className="font-medium">#{booking.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Original Date:</span>
                        <span className="font-medium">{formatDateTime(booking.start_time)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created:</span>
                        <span className="font-medium">{formatDateTime(booking.created_at)}</span>
                      </div>
                      {selectedPackage && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Package:</span>
                            <span className="font-medium">{selectedPackage.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Duration:</span>
                            <span className="font-medium">{selectedPackage.duration_minutes} min</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Price:</span>
                            <span className="font-medium">LKR {selectedPackage.price}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 space-y-3">
                      <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={processing}
                      >
                        {processing ? 'Updating...' : 'Update Booking'}
                      </Button>
                      
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                        onClick={() => router.get('/bookings')}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default EditBooking;