import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MagnifyingGlassIcon, 
  ArrowLeftIcon,
  DocumentTextIcon,
  CalendarIcon,
  BanknotesIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import HeaderLayout from '@/layouts/header-layout';

interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
}

interface InvoiceItem {
  id: number;
  item_type: string;
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  total_price: number;
}

interface Allocation {
  id: number;
  bed?: {
    id: number;
    bed_number: string;
  };
  package?: {
    id: number;
    name: string;
    price: number;
  };
}

interface Invoice {
  id: number;
  invoice_number: string;
  customer?: Customer;
  allocation?: Allocation;
  invoice_type: 'walk_in' | 'booking' | 'pos_sale' | 'addon';
  subtotal: number;
  discount_amount: number;
  service_charge: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_status: 'unpaid' | 'partial' | 'paid' | 'refunded';
  status: 'draft' | 'pending' | 'completed' | 'cancelled';
  notes?: string;
  items: InvoiceItem[];
  created_at: string;
}

interface PaginationLink {
  url: string | null;
  label: string;
  active: boolean;
}

interface Stats {
  total_revenue: number;
  pending_amount: number;
  today_revenue: number;
  total_invoices: number;
}

interface Props {
  invoices: {
    data: Invoice[];
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
    payment_status?: string;
    invoice_type?: string;
    date_from?: string;
    date_to?: string;
  };
  stats: Stats;
}

const PaymentHistory: React.FC<Props> = ({ invoices, filters, stats }) => {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState(filters.payment_status || '');
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState(filters.invoice_type || '');
  const [dateFromFilter, setDateFromFilter] = useState(filters.date_from || '');
  const [dateToFilter, setDateToFilter] = useState(filters.date_to || '');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.get('/payment-history', {
      search: searchTerm,
      payment_status: paymentStatusFilter,
      invoice_type: invoiceTypeFilter,
      date_from: dateFromFilter,
      date_to: dateToFilter,
    }, {
      preserveState: true,
      preserveScroll: true,
    });
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setPaymentStatusFilter('');
    setInvoiceTypeFilter('');
    setDateFromFilter('');
    setDateToFilter('');
    router.get('/payment-history');
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig = {
      unpaid: { label: 'Unpaid', className: 'bg-red-100 text-red-700' },
      partial: { label: 'Partial', className: 'bg-yellow-100 text-yellow-700' },
      paid: { label: 'Paid', className: 'bg-green-100 text-green-700' },
      refunded: { label: 'Refunded', className: 'bg-gray-100 text-gray-700' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.unpaid;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getInvoiceTypeBadge = (type: string) => {
    const typeConfig = {
      walk_in: { label: 'Walk-in', className: 'bg-blue-100 text-blue-700' },
      booking: { label: 'Booking', className: 'bg-purple-100 text-purple-700' },
      pos_sale: { label: 'POS Sale', className: 'bg-teal-100 text-teal-700' },
      addon: { label: 'Add-on', className: 'bg-orange-100 text-orange-700' },
    };

    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.pos_sale;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
      pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700' },
      completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
      cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <HeaderLayout>
      <Head title="Payment History" />
      
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
              
              <h1 className="text-xl font-semibold text-gray-900">Payment History</h1>
            </div>
            
            <div className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-sm font-medium">
              Payments
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <BanknotesIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Total Revenue</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.total_revenue)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <ClockIcon className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Pending Amount</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.pending_amount)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Today's Revenue</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.today_revenue)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Total Invoices</p>
                  <p className="text-lg font-bold text-gray-900">{stats.total_invoices}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm">
            {/* Controls Bar */}
            <div className="p-6 border-b border-gray-200">
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search by invoice number, customer name or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-full h-10 border border-gray-300 rounded-lg px-3 py-2 focus:border-purple-500 focus:ring-purple-500 bg-white text-gray-900"
                    />
                  </div>

                  <select
                    value={paymentStatusFilter}
                    onChange={(e) => setPaymentStatusFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 h-10 focus:border-purple-500 focus:ring-purple-500 bg-white text-gray-900"
                  >
                    <option value="">All Payment Status</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Paid</option>
                    <option value="refunded">Refunded</option>
                  </select>

                  <select
                    value={invoiceTypeFilter}
                    onChange={(e) => setInvoiceTypeFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 h-10 focus:border-purple-500 focus:ring-purple-500 bg-white text-gray-900"
                  >
                    <option value="">All Invoice Types</option>
                    <option value="walk_in">Walk-in</option>
                    <option value="booking">Booking</option>
                    <option value="pos_sale">POS Sale</option>
                    <option value="addon">Add-on</option>
                  </select>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">From:</label>
                    <input
                      type="date"
                      value={dateFromFilter}
                      onChange={(e) => setDateFromFilter(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 h-10 focus:border-purple-500 focus:ring-purple-500 bg-white text-gray-900 [color-scheme:light]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">To:</label>
                    <input
                      type="date"
                      value={dateToFilter}
                      onChange={(e) => setDateToFilter(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 h-10 focus:border-purple-500 focus:ring-purple-500 bg-white text-gray-900 [color-scheme:light]"
                    />
                  </div>

                  <Button 
                    type="submit"
                    className="bg-purple-500 hover:bg-purple-600 text-white"
                  >
                    Filter
                  </Button>

                  <Button 
                    type="button"
                    variant="outline"
                    onClick={handleClearFilters}
                    className="border-gray-300 text-gray-700"
                  >
                    Clear
                  </Button>
                </div>
              </form>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-7 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">INVOICE #</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">CUSTOMER</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">TYPE</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">DATE</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">TOTAL</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">PAID</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">STATUS</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200">
              {invoices.data.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">
                  <DocumentTextIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-lg font-medium">No invoices found</p>
                  <p className="text-sm mt-1">Invoices will appear here once transactions are made</p>
                </div>
              ) : (
                invoices.data.map((invoice) => (
                  <div key={invoice.id} className="grid grid-cols-7 gap-4 px-6 py-4 items-center hover:bg-gray-50 transition-colors">
                    <div>
                      <span className="font-mono text-sm font-medium text-purple-600">
                        {invoice.invoice_number}
                      </span>
                    </div>

                    <div>
                      {invoice.customer ? (
                        <>
                          <div className="font-medium text-gray-900">{invoice.customer.name}</div>
                          <div className="text-sm text-gray-500">{invoice.customer.phone}</div>
                        </>
                      ) : (
                        <span className="text-gray-400 italic">Walk-in</span>
                      )}
                    </div>

                    <div>
                      {getInvoiceTypeBadge(invoice.invoice_type)}
                    </div>

                    <div className="text-sm text-gray-700">
                      {formatDateTime(invoice.created_at)}
                    </div>

                    <div className="text-right">
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(invoice.total_amount)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className={`font-medium ${invoice.paid_amount >= invoice.total_amount ? 'text-green-600' : 'text-yellow-600'}`}>
                        {formatCurrency(invoice.paid_amount)}
                      </span>
                      {invoice.balance_amount > 0 && (
                        <div className="text-xs text-red-500">
                          Due: {formatCurrency(invoice.balance_amount)}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      {getPaymentStatusBadge(invoice.payment_status)}
                      {getStatusBadge(invoice.status)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {invoices.data.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {invoices.meta?.from || invoices.from || 1} to {invoices.meta?.to || invoices.to || invoices.data.length} of {invoices.meta?.total || invoices.total || invoices.data.length} invoices
                </div>
                <div className="flex gap-2">
                  {invoices.links && Array.isArray(invoices.links) && invoices.links.map((link: PaginationLink, index: number) => (
                    <Button
                      key={index}
                      size="sm"
                      variant={link.active ? 'default' : 'outline'}
                      onClick={() => link.url && router.get(link.url)}
                      disabled={!link.url}
                      dangerouslySetInnerHTML={{ __html: link.label }}
                      className={link.active ? 'bg-purple-500 hover:bg-purple-600 text-white' : 'bg-white text-gray-700 border-gray-300'}
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

export default PaymentHistory;
