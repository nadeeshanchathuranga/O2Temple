import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
// Booking Management Component
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  ArrowLeftIcon,
  CalendarIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import HeaderLayout from '@/layouts/header-layout';

interface Booking {
  id: number;
  customer: {
    id: number;
    name: string;
    phone: string;
  };
  bed: {
    id: number;
    bed_number: string;
  };
  package: {
    id: number;
    name: string;
    duration_minutes: number;
    price: number;
  };
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded';
  created_at: string;
}

interface PaginationLink {
  url: string | null;
  label: string;
  active: boolean;
}

interface Props {
  bookings: {
    data: Booking[];
    links?: PaginationLink[];
    meta?: {
      from?: number;
      to?: number;
      total?: number;
      current_page?: number;
      last_page?: number;
    };
    current_page?: number;
    from?: number;
    to?: number;
    total?: number;
    last_page?: number;
  };
  filters: {
    search?: string;
    status?: string;
    date?: string;
  };
}

const BookingManagement: React.FC<Props> = ({ bookings, filters }) => {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [statusFilter, setStatusFilter] = useState(filters.status || '');
  const [dateFilter, setDateFilter] = useState(filters.date || '');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.get('/bookings', {
      search: searchTerm,
      status: statusFilter,
      date: dateFilter,
    }, {
      preserveState: true,
      preserveScroll: true,
    });
  };

  const handleCancelBooking = (bookingId: number) => {
    if (confirm('Are you sure you want to cancel this booking? The bed will become available.')) {
      router.patch(`/bookings/${bookingId}/status`, {
        status: 'cancelled',
      }, {
        preserveState: true,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', className: 'bg-orange-100 text-orange-700' },
      confirmed: { label: 'Confirmed', className: 'bg-blue-100 text-blue-700' },
      in_progress: { label: 'In Progress', className: 'bg-yellow-100 text-yellow-700' },
      completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
      cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getPaymentBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', className: 'bg-orange-100 text-orange-700' },
      paid: { label: 'Paid', className: 'bg-green-100 text-green-700' },
      refunded: { label: 'Refunded', className: 'bg-gray-100 text-gray-700' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Check if booking can be cancelled (not yet started or in progress without payment)
  const canCancel = (booking: Booking) => {
    return booking.status !== 'completed' && booking.status !== 'cancelled';
  };

  return (
    <HeaderLayout>
      <Head title="Booking Management" />
      
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => router.get('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
              </Button>
              
              <h1 className="text-xl font-semibold text-gray-900">Booking Management</h1>
            </div>
            
            <div className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-sm font-medium">
              Bookings
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm">
            {/* Controls Bar */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <form onSubmit={handleSearch} className="flex items-center gap-3">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search bookings..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64 h-10 border border-gray-300 rounded-lg px-3 py-2 focus:border-yellow-500 focus:ring-yellow-500 bg-white text-gray-900"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:border-yellow-500 focus:ring-yellow-500 bg-white text-gray-900"
                  >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:border-yellow-500 focus:ring-yellow-500 bg-white text-gray-900 [color-scheme:light]"
                  />

                  <Button 
                    type="submit"
                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                  >
                    Filter
                  </Button>
                </form>
              </div>

              <Button 
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium"
                onClick={() => router.get('/bookings/create')}
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                New Booking
              </Button>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-6 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">CUSTOMER</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">BED</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">PACKAGE</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">START TIME</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">END TIME</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">STATUS</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200">
              {bookings.data.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-lg font-medium">No bookings found</p>
                  <p className="text-sm mt-1">Create your first booking to get started</p>
                </div>
              ) : (
                bookings.data.map((booking) => (
                  <div key={booking.id} className="grid grid-cols-6 gap-4 px-6 py-4 items-center hover:bg-gray-50 transition-colors">
                    <div>
                      <div className="font-medium text-gray-900">{booking.customer.name}</div>
                      <div className="text-sm text-gray-500">{booking.customer.phone}</div>
                    </div>

                    <div>
                      <Badge className="bg-teal-100 text-teal-700 font-mono">
                        {booking.bed.bed_number}
                      </Badge>
                    </div>

                    <div>
                      <div className="text-sm font-medium text-gray-900">{booking.package.name}</div>
                      <div className="text-xs text-gray-500">LKR{booking.package.price}</div>
                    </div>

                    <div className="text-sm text-gray-700">
                      {formatDateTime(booking.start_time)}
                    </div>

                    <div className="text-sm text-gray-700">
                      {formatTime(booking.end_time)}
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(booking.status)}
                        {canCancel(booking) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancelBooking(booking.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1"
                            title="Cancel Booking"
                          >
                            <XCircleIcon className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {getPaymentBadge(booking.payment_status)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {bookings.data.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {bookings.meta?.from || bookings.from || 1} to {bookings.meta?.to || bookings.to || bookings.data.length} of {bookings.meta?.total || bookings.total || bookings.data.length} bookings
                </div>
                <div className="flex gap-2">
                  {bookings.links && Array.isArray(bookings.links) && bookings.links.map((link: PaginationLink, index: number) => (
                    <Button
                      key={index}
                      size="sm"
                      variant={link.active ? 'default' : 'outline'}
                      onClick={() => link.url && router.get(link.url)}
                      disabled={!link.url}
                      dangerouslySetInnerHTML={{ __html: link.label }}
                      className={link.active ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-white text-gray-700 border-gray-300'}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </HeaderLayout>
  );
};

export default BookingManagement;
