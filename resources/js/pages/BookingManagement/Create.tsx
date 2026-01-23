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

interface TimeSlot {
  start_time: string;
  end_time: string;
  display_time: string;
}

interface Props {
  beds: Bed[];
  packages: Package[];
  customers: Customer[];
}

const CreateBooking: React.FC<Props> = ({ beds, packages, customers }) => {
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [selectedDate, setSelectedDate] = useState('');

  // Debug: Log props to console
  console.log('Booking Create Props:', { beds, packages, customers });

  const { data, setData, post, processing, errors } = useForm({
    customer_id: '',
    bed_id: '',
    package_id: '',
    start_time: '',
    end_time: '',
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
                  <CardContent>
                    <div>
                      <Label htmlFor="customer_id" className="text-gray-700">Customer *</Label>
                      <select
                        id="customer_id"
                        value={data.customer_id}
                        onChange={(e) => setData('customer_id', e.target.value)}
                        className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 focus:border-yellow-500 focus:ring-yellow-500 bg-white text-gray-900"
                        required
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
                      <Label htmlFor="package_id" className="text-gray-700">Package *</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                        {packages.map((pkg) => (
                          <button
                            key={pkg.id}
                            type="button"
                            onClick={() => handlePackageChange(pkg.id.toString())}
                            className={`p-4 border-2 rounded-lg text-left transition-all ${
                              data.package_id === pkg.id.toString()
                                ? 'border-yellow-500 bg-yellow-50'
                                : 'border-gray-200 bg-white hover:border-yellow-300'
                            }`}
                          >
                            <div className="font-medium text-gray-900">{pkg.name}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              {pkg.duration_minutes} minutes
                            </div>
                            <div className="text-sm font-semibold text-yellow-600 mt-1">
                              ₹{pkg.price}
                            </div>
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
                        required
                      />
                    </div>
                  </CardContent>
                </Card>
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
