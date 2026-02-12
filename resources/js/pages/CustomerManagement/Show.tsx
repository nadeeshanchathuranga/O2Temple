import React from 'react';

import { Head, router } from '@inertiajs/react';

import { 
  ArrowLeftIcon,
  UserIcon,
  CalendarIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  IdentificationIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import HeaderLayout from '@/layouts/header-layout';

interface PaymentHistory {
  id: string;
  type: 'advance_payment' | 'invoice_payment';
  amount: number | string;
  payment_method: string;
  reference_number?: string;
  payment_date: string;
  related_booking: string;
  processed_by: string;
  service: string;
}

interface Allocation {
  id: number;
  booking_number?: string;
  start_time: string;
  end_time: string;
  status: string;
  payment_status: string;
  bed: {
    bed_number: string;
  };
  package: {
    name: string;
    duration_minutes: number;
    price: number;
  };
}

interface Customer {
  id: number | string;
  membership_id?: number;
  name: string;
  phone: string;
  email?: string;
  nic?: string;
  address?: string;
  age?: number;
  dob?: string;
  type: 'regular' | 'membership';
  membership_status?: string;
  total_sessions?: number;
  sessions_used?: number;
  remaining_sessions?: number;
  package_name?: string;
  package_price?: number;
  full_payment?: number;
  advance_payment?: number;
  remaining_balance?: number;
  discount_percentage?: number;
  created_at: string;
  allocations: Allocation[];
  payment_history: PaymentHistory[];
}

interface Props {
  customer: Customer;
}

const CustomerDetails: React.FC<Props> = ({ customer }) => {
  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `LKR ${(numAmount || 0).toFixed(2)}`;
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getPaymentMethodBadge = (method: string) => {
    const methodConfig = {
      cash: { label: 'Cash', className: 'bg-green-100 text-green-700' },
      card: { label: 'Card', className: 'bg-blue-100 text-blue-700' },
      bank_transfer: { label: 'Bank Transfer', className: 'bg-purple-100 text-purple-700' },
    };
    
    const config = methodConfig[method as keyof typeof methodConfig] || methodConfig.cash;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', className: 'bg-orange-100 text-orange-700' },
      confirmed: { label: 'Confirmed', className: 'bg-blue-100 text-blue-700' },
      in_progress: { label: 'In Progress', className: 'bg-yellow-100 text-yellow-700' },
      completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
      cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
      paid: { label: 'Paid', className: 'bg-green-100 text-green-700' },
      active: { label: 'Active', className: 'bg-green-100 text-green-700' },
      inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-700' },
      expired: { label: 'Expired', className: 'bg-red-100 text-red-700' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const totalPaid = customer.payment_history.reduce((sum, payment) => {
    const amount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount;
    return sum + (amount || 0);
  }, 0);

  return (
    <HeaderLayout>
      <Head title={`Customer Details - ${customer.name}`} />
      
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => router.get('/customers')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
              </Button>
              
              <h1 className="text-xl font-semibold text-gray-900">{customer.name}</h1>
            </div>
            
            <Badge 
              className={customer.type === 'membership' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}
            >
              {customer.type === 'membership' ? '💎 MEMBER' : '👤 REGULAR'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Customer Info */}
            <div className="lg:col-span-1 space-y-6">
              {/* Basic Information */}
              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <UserIcon className="w-5 h-5 text-blue-600" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <PhoneIcon className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Phone</p>
                      <p className="text-gray-900 font-medium">{customer.phone}</p>
                    </div>
                  </div>
                  
                  {customer.email && (
                    <div className="flex items-center gap-3">
                      <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Email</p>
                        <p className="text-gray-900 font-medium">{customer.email}</p>
                      </div>
                    </div>
                  )}

                  {customer.nic && (
                    <div className="flex items-center gap-3">
                      <IdentificationIcon className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">NIC</p>
                        <p className="text-gray-900 font-medium">{customer.nic}</p>
                      </div>
                    </div>
                  )}

                  {customer.address && (
                    <div className="flex items-center gap-3">
                      <MapPinIcon className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Address</p>
                        <p className="text-gray-900 font-medium">{customer.address}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <CalendarIcon className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Joined</p>
                      <p className="text-gray-900 font-medium">{formatDate(customer.created_at)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Membership Information */}
              {customer.type === 'membership' && (
                <Card className="bg-white border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <span className="text-lg">💎</span>
                      Membership Package
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-500 uppercase">Status</span>
                      {getStatusBadge(customer.membership_status || 'inactive')}
                    </div>

                    {customer.package_name && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-500 uppercase">Package</span>
                        <span className="text-gray-900 font-medium">{customer.package_name}</span>
                      </div>
                    )}

                    {customer.total_sessions !== undefined && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-gray-500 uppercase">Total Sessions</span>
                          <span className="text-gray-900 font-medium">{customer.total_sessions}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-gray-500 uppercase">Sessions Used</span>
                          <span className="text-gray-900 font-medium">{customer.sessions_used || 0}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-gray-500 uppercase">Remaining Sessions</span>
                          <span className="text-green-600 font-medium">{customer.remaining_sessions || 0}</span>
                        </div>
                      </>
                    )}

                    {customer.full_payment !== undefined && (
                      <>
                        <div className="border-t border-gray-200 pt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-500 uppercase">Package Price</span>
                            <span className="text-gray-900 font-medium">{formatCurrency(customer.package_price || 0)}</span>
                          </div>

                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs font-medium text-gray-500 uppercase">Discount</span>
                            <span className="text-gray-900 font-medium">{customer.discount_percentage}%</span>
                          </div>

                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs font-medium text-gray-500 uppercase">Final Amount</span>
                            <span className="text-gray-900 font-medium">{formatCurrency(customer.full_payment)}</span>
                          </div>

                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs font-medium text-gray-500 uppercase">Advance Paid</span>
                            <span className="text-blue-600 font-medium">{formatCurrency(customer.advance_payment || 0)}</span>
                          </div>

                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs font-medium text-gray-500 uppercase">Remaining Balance</span>
                            <span className={`font-medium ${customer.remaining_balance && customer.remaining_balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                              {formatCurrency(customer.remaining_balance || 0)}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Payment History & Bookings */}
            <div className="lg:col-span-2 space-y-6">
              {/* Payment History */}
              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-gray-900">
                    <div className="flex items-center gap-2">
                      <CreditCardIcon className="w-5 h-5 text-blue-600" />
                      Payment History
                    </div>
                    <Badge className="bg-green-100 text-green-700">
                      Total: {formatCurrency(totalPaid)}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-gray-500">
                    All payments made by this customer
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {customer.payment_history.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CurrencyDollarIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p>No payment history available</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {customer.payment_history.map((payment) => (
                        <div key={payment.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                <BanknotesIcon className="w-4 h-4 text-green-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{formatCurrency(payment.amount)}</p>
                                <p className="text-xs text-gray-500">
                                  {payment.type === 'advance_payment' ? 'Advance Payment' : 'Service Payment'}
                                </p>
                              </div>
                            </div>
                            {getPaymentMethodBadge(payment.payment_method)}
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase">Service</p>
                              <p className="text-gray-900 font-medium">{payment.service}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase">Booking ID</p>
                              <p className="text-gray-900 font-medium">#{payment.related_booking}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase">Date & Time</p>
                              <p className="text-gray-900 font-medium">{formatDateTime(payment.payment_date)}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase">Processed By</p>
                              <p className="text-gray-900 font-medium">{payment.processed_by}</p>
                            </div>
                            {payment.reference_number && (
                              <div className="col-span-2">
                                <p className="text-xs font-medium text-gray-500 uppercase">Reference</p>
                                <p className="text-gray-900 font-medium font-mono text-sm">{payment.reference_number}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Booking History */}
              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <CalendarIcon className="w-5 h-5 text-blue-600" />
                    Booking History
                  </CardTitle>
                  <CardDescription className="text-gray-500">
                    All bookings made by this customer
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {customer.allocations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p>No booking history available</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {customer.allocations.map((allocation) => (
                        <div key={allocation.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <ClockIcon className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{allocation.package.name}</p>
                                <p className="text-xs text-gray-500">
                                  Booking #{allocation.booking_number || allocation.id}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {getStatusBadge(allocation.status)}
                              {getStatusBadge(allocation.payment_status)}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase">Bed</p>
                              <p className="text-gray-900 font-medium">{allocation.bed.bed_number}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase">Duration</p>
                              <p className="text-gray-900 font-medium">{allocation.package.duration_minutes} min</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase">Start Time</p>
                              <p className="text-gray-900 font-medium">{formatDateTime(allocation.start_time)}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase">End Time</p>
                              <p className="text-gray-900 font-medium">{formatDateTime(allocation.end_time)}</p>
                            </div>
                            {customer.type !== 'membership' && (
                              <div className="col-span-2">
                                <p className="text-xs font-medium text-gray-500 uppercase">Package Price</p>
                                <p className="text-green-600 font-medium">{formatCurrency(allocation.package.price)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </HeaderLayout>
  );
};

export default CustomerDetails;