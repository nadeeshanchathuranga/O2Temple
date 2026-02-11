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

interface TimeSlot {
  start_time: string;
  end_time: string;
  display_time: string;
}

interface Props {
  beds: Bed[];
  packages: Package[];
  customers: Customer[];
  membershipPackages: MembershipPackage[];
}

const CreateBooking: React.FC<Props> = ({ beds, packages, customers, membershipPackages }) => {
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [customerType, setCustomerType] = useState<'regular' | 'membership'>('regular');
  const [selectedMembershipPackage, setSelectedMembershipPackage] = useState<MembershipPackage | null>(null);

  const { data, setData, post, processing, errors } = useForm({
    customer_id: '',
    membership_package_id: '',
    bed_id: '',
    package_id: '',
    start_time: '',
    end_time: '',
    advance_payment: '',
    payment_method: 'cash',
    payment_reference: '',
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
        },
      });
      setAvailableSlots(response.data.slots);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handlePackageChange = (packageId: string) => {
    setData('package_id', packageId);
    const pkg = packages.find(p => p.id === parseInt(packageId));
    setSelectedPackage(pkg || null);
    // Reset selected time when package changes
    setData('start_time', '');
    setData('end_time', '');
  };

  const handleCustomerTypeChange = (type: 'regular' | 'membership') => {
    setCustomerType(type);
    setData({
      ...data,
      customer_id: '',
      membership_package_id: '',
      advance_payment: '', // Clear advance payment when switching types
      payment_method: 'cash',
      payment_reference: '',
    });
    setSelectedMembershipPackage(null);
  };

  const handleMembershipPackageChange = (membershipPackageId: string) => {
    setData('membership_package_id', membershipPackageId);
    const membershipPkg = membershipPackages.find(mp => mp.id === parseInt(membershipPackageId));
    setSelectedMembershipPackage(membershipPkg || null);
    
    // Auto-fill package if membership package has associated package
    if (membershipPkg?.package) {
      setData('package_id', membershipPkg.package.id.toString());
      setSelectedPackage(membershipPkg.package);
      // Reset selected time when package changes
      setData('start_time', '');
      setData('end_time', '');
    }
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    // Reset selected time when date changes
    setData('start_time', '');
    setData('end_time', '');
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setData({
      ...data,
      start_time: slot.start_time,
      end_time: slot.end_time,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/bookings', {
      preserveState: true,
      onSuccess: () => {
        router.get('/bookings');
      },
    });
  };

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  return (
    <>
      <Head title="Create Booking" />
      
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
              
              <img 
                src="/jaanNetworklogo.jpeg" 
                alt="JAAN Network" 
                className="h-8 w-auto object-contain"
              />
              
              <h1 className="text-xl font-semibold text-gray-900">Create New Booking</h1>
            </div>
            
            <div className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-sm font-medium">
              New Booking
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Booking Details */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="bg-white border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <UserIcon className="w-5 h-5 text-yellow-600" />
                      Customer Information
                    </CardTitle>
                    <CardDescription className="text-gray-500">Select the customer for this booking</CardDescription>
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
                              ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                              : 'border-gray-200 bg-white text-gray-900 hover:border-yellow-300'
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
                              ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                              : 'border-gray-200 bg-white text-gray-900 hover:border-yellow-300'
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
                          className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 focus:border-yellow-500 focus:ring-yellow-500 bg-white text-gray-900"
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
                          className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 focus:border-yellow-500 focus:ring-yellow-500 bg-white text-gray-900"
                          required={customerType === 'membership'}
                        >
                          <option value="">Select a membership package</option>
                          {membershipPackages && membershipPackages.length > 0 ? (
                            membershipPackages.map((membershipPkg) => {
                              const remainingSessions = membershipPkg.num_of_sessions - membershipPkg.sessions_used;
                              return (
                                <option key={membershipPkg.id} value={membershipPkg.id}>
                                  {membershipPkg.name} ({membershipPkg.type}) - {remainingSessions} sessions left
                                </option>
                              );
                            })
                          ) : (
                            <option value="" disabled>No membership packages available</option>
                          )}
                        </select>
                        {errors.membership_package_id && (
                          <p className="text-red-500 text-sm mt-1">{errors.membership_package_id}</p>
                        )}
                        
                        {/* Selected Membership Package Details */}
                        {selectedMembershipPackage && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                selectedMembershipPackage.type === 'individual' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-purple-100 text-purple-700'
                              }`}>
                                {selectedMembershipPackage.type === 'individual' ? 'Individual' : 'Company'}
                              </span>
                              {selectedMembershipPackage.package && (
                                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                  {selectedMembershipPackage.package.name}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-700">
                              <div><strong>Phone:</strong> {selectedMembershipPackage.phone}</div>
                              <div><strong>Sessions:</strong> {selectedMembershipPackage.sessions_used}/{selectedMembershipPackage.num_of_sessions} used</div>
                              {selectedMembershipPackage.remaining_balance > 0 && (
                                <div><strong>Balance:</strong> Rs {Number(selectedMembershipPackage.remaining_balance).toFixed(2)}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <RectangleStackIcon className="w-5 h-5 text-teal-600" />
                      Bed Selection
                    </CardTitle>
                    <CardDescription className="text-gray-500">Choose an available bed</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <Label htmlFor="bed_id" className="text-gray-700">Bed *</Label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-2">
                        {beds.map((bed) => (
                          <button
                            key={bed.id}
                            type="button"
                            onClick={() => setData('bed_id', bed.id.toString())}
                            className={`p-3 border-2 rounded-lg text-center transition-all ${
                              data.bed_id === bed.id.toString()
                                ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                                : 'border-gray-200 bg-white text-gray-900 hover:border-yellow-300'
                            }`}
                          >
                            <div className="font-mono text-sm font-medium">{bed.bed_number}</div>
                          </button>
                        ))}
                      </div>
                      {errors.bed_id && (
                        <p className="text-red-500 text-sm mt-1">{errors.bed_id}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <CalendarIcon className="w-5 h-5 text-indigo-600" />
                      Package & Date
                    </CardTitle>
                    <CardDescription className="text-gray-500">Select package and booking date</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="package_id" className="text-gray-700 flex items-center gap-2">
                        Package *
                        {selectedMembershipPackage?.package && (
                          <span className="text-xs text-green-600 font-normal">(Auto-selected from membership)</span>
                        )}
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                        {packages.map((pkg) => (
                          <button
                            key={pkg.id}
                            type="button"
                            onClick={() => handlePackageChange(pkg.id.toString())}
                            disabled={selectedMembershipPackage?.package?.id === pkg.id}
                            className={`p-4 border-2 rounded-lg text-left transition-all ${
                              data.package_id === pkg.id.toString()
                                ? selectedMembershipPackage?.package?.id === pkg.id
                                  ? 'border-green-500 bg-green-50 text-green-700'
                                  : 'border-yellow-500 bg-yellow-50'
                                : 'border-gray-200 bg-white hover:border-yellow-300'
                            } ${selectedMembershipPackage?.package?.id === pkg.id ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            <div className="font-medium text-gray-900">{pkg.name}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              {pkg.duration_minutes} minutes
                            </div>
                            <div className="text-sm font-semibold text-yellow-600 mt-1">
                              LKR {pkg.price}
                            </div>
                            {selectedMembershipPackage?.package?.id === pkg.id && (
                              <div className="text-xs text-green-600 mt-1 font-medium">
                                ✓ Selected from membership
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                      {errors.package_id && (
                        <p className="text-red-500 text-sm mt-1">{errors.package_id}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="booking_date" className="text-gray-700">Booking Date *</Label>
                      <input
                        id="booking_date"
                        type="date"
                        min={getTodayDate()}
                        value={selectedDate}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className="mt-1 w-full h-10 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none cursor-pointer [color-scheme:light]"
                      />
                    </div>
                  </CardContent>
                </Card>

                {customerType === 'regular' && (
                  <Card className="bg-white border-gray-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-gray-900">
                        <RectangleStackIcon className="w-5 h-5 text-green-600" />
                        Advance Payment (Optional)
                      </CardTitle>
                      <CardDescription className="text-gray-500">
                        {selectedPackage 
                          ? `Booking cost: LKR ${parseFloat(selectedPackage.price.toString()).toFixed(2)}` 
                          : 'Select a package to see the amount'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="advance_payment" className="text-gray-700">Advance Payment Amount (LKR)</Label>
                        <Input
                          id="advance_payment"
                          type="number"
                          min="0"
                          step="0.01"
                          value={data.advance_payment}
                          onChange={(e) => setData('advance_payment', e.target.value)}
                          placeholder="0.00"
                          className="mt-1 border border-gray-300"
                        />
                        {selectedPackage && data.advance_payment && (
                          <p className="text-sm mt-2 text-gray-600">
                            Balance to pay: LKR {(parseFloat(selectedPackage.price.toString()) - parseFloat(data.advance_payment || '0')).toFixed(2)}
                          </p>
                        )}
                      </div>

                      {data.advance_payment && (
                        <>
                          <div>
                            <Label htmlFor="payment_method" className="text-gray-700">Payment Method *</Label>
                            <select
                              id="payment_method"
                              value={data.payment_method}
                              onChange={(e) => setData('payment_method', e.target.value)}
                              className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 focus:border-green-500 focus:ring-green-500 bg-white text-gray-900"
                            >
                              <option value="cash">Cash</option>
                              <option value="card">Card</option>
                              <option value="bank_transfer">Bank Transfer</option>
                            </select>
                          </div>

                          {data.payment_method !== 'cash' && (
                            <div>
                              <Label htmlFor="payment_reference" className="text-gray-700">
                                {data.payment_method === 'card' ? 'Card Reference / Last 4 Digits' : 'Bank Transfer Reference'}
                              </Label>
                              <Input
                                id="payment_reference"
                                type="text"
                                value={data.payment_reference}
                                onChange={(e) => setData('payment_reference', e.target.value)}
                                placeholder={data.payment_method === 'card' ? 'e.g., 1234' : 'e.g., TRF123456'}
                                className="mt-1 border border-gray-300"
                              />
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column - Available Time Slots */}
              <div className="lg:col-span-1">
                <Card className="sticky top-6 bg-white border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <ClockIcon className="w-5 h-5 text-blue-600" />
                      Available Time Slots
                    </CardTitle>
                    <CardDescription className="text-gray-500">
                      {data.bed_id && data.package_id && selectedDate
                        ? 'Select a time slot'
                        : 'Please select bed, package, and date first'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingSlots ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
                      </div>
                    ) : availableSlots.length > 0 ? (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {availableSlots.map((slot, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleSlotSelect(slot)}
                            className={`w-full p-3 border-2 rounded-lg text-left transition-all ${
                              data.start_time === slot.start_time
                                ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                                : 'border-gray-200 bg-white text-gray-900 hover:border-yellow-300'
                            }`}
                          >
                            <div className="font-medium">{slot.display_time}</div>
                          </button>
                        ))}
                      </div>
                    ) : data.bed_id && data.package_id && selectedDate ? (
                      <div className="text-center py-8 text-gray-500">
                        <ClockIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">No available slots for this selection</p>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <CalendarIcon className="w-12 h-12 mx-auto mb-2" />
                        <p className="text-sm">Select bed, package, and date to view available slots</p>
                      </div>
                    )}

                    {errors.start_time && (
                      <p className="text-red-500 text-sm mt-2">{errors.start_time}</p>
                    )}
                    {errors.end_time && (
                      <p className="text-red-500 text-sm mt-2">{errors.end_time}</p>
                    )}

                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <Button
                        type="submit"
                        disabled={processing || !data.start_time}
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-3"
                      >
                        {processing ? 'Creating Booking...' : 'Create Booking'}
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

export default CreateBooking;
