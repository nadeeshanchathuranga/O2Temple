import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeftIcon,
  BanknotesIcon,
  CalendarIcon,
  UsersIcon,
  ClockIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import HeaderLayout from '@/layouts/header-layout';

interface DailyRevenue {
  date: string;
  invoice_count: number;
  revenue: number;
}

interface MonthlyRevenue {
  month: number;
  year: number;
  month_name: string;
  invoice_count: number;
  revenue: number;
}

interface RevenueByType {
  invoice_type: string;
  invoice_count: number;
  revenue: number;
}

interface Package {
  id: number;
  name: string;
  price: number;
  allocations_count: number;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
  invoices_count: number;
  invoices_sum_total_amount: number | null;
}

interface StatusSummary {
  status: string;
  count: number;
}

interface PaymentStatusSummary {
  payment_status: string;
  count: number;
  total: number;
}

interface Stats {
  total_revenue: number;
  monthly_revenue: number;
  today_revenue: number;
  yesterday_revenue: number;
  total_customers: number;
  new_customers_this_month: number;
  total_bookings: number;
  bookings_this_month: number;
  pending_payments: number;
  total_invoices: number;
  completed_sessions_today: number;
}

interface Props {
  stats: Stats;
  dailyRevenue: DailyRevenue[];
  monthlyRevenueTable: MonthlyRevenue[];
  revenueByType: RevenueByType[];
  topPackages: Package[];
  topCustomers: Customer[];
  bookingStatusSummary: StatusSummary[];
  paymentStatusSummary: PaymentStatusSummary[];
  filters: {
    year: number;
    month: number;
  };
}

const Reports: React.FC<Props> = ({
  stats,
  dailyRevenue,
  monthlyRevenueTable,
  revenueByType,
  topPackages,
  topCustomers,
  bookingStatusSummary,
  paymentStatusSummary,
  filters,
}) => {
  const [selectedYear, setSelectedYear] = useState(filters.year);
  const [selectedMonth, setSelectedMonth] = useState(filters.month);

  const handleFilter = () => {
    router.get('/reports', {
      year: selectedYear,
      month: selectedMonth,
    }, {
      preserveState: true,
      preserveScroll: true,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getInvoiceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      walk_in: 'Walk-in',
      booking: 'Booking',
      pos_sale: 'POS Sale',
      addon: 'Add-on',
    };
    return labels[type] || type;
  };

  const getStatusBadgeClass = (status: string) => {
    const classes: Record<string, string> = {
      confirmed: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  };

  const getPaymentStatusBadgeClass = (status: string) => {
    const classes: Record<string, string> = {
      unpaid: 'bg-red-100 text-red-700',
      partial: 'bg-yellow-100 text-yellow-700',
      paid: 'bg-green-100 text-green-700',
      refunded: 'bg-gray-100 text-gray-700',
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  };

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const revenueChange = stats.today_revenue - stats.yesterday_revenue;
  const revenueChangePercent = stats.yesterday_revenue > 0 
    ? ((revenueChange / stats.yesterday_revenue) * 100).toFixed(1)
    : 0;

  return (
    <HeaderLayout>
      <Head title="Reports & Analytics" />
      
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
              
              <h1 className="text-xl font-semibold text-gray-900">Reports & Analytics</h1>
            </div>
            
            <div className="px-3 py-1.5 bg-pink-500 text-white rounded-lg text-sm font-medium">
              Reports
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Year:</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:border-pink-500 focus:ring-pink-500 bg-white text-gray-900"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Month:</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:border-pink-500 focus:ring-pink-500 bg-white text-gray-900"
                >
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>{month.label}</option>
                  ))}
                </select>
              </div>

              <Button 
                onClick={handleFilter}
                className="bg-pink-500 hover:bg-pink-600 text-white"
              >
                Apply Filter
              </Button>
            </div>
          </div>

          {/* Summary Stats Cards - Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.total_revenue)}</p>
                  <p className="text-xs text-gray-400 mt-1">All time</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <BanknotesIcon className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.monthly_revenue)}</p>
                  <p className="text-xs text-gray-400 mt-1">{months[selectedMonth - 1]?.label} {selectedYear}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <CalendarIcon className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Today's Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.today_revenue)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {revenueChange >= 0 ? (
                      <ArrowTrendingUpIcon className="w-3 h-3 text-green-500" />
                    ) : (
                      <ArrowTrendingDownIcon className="w-3 h-3 text-red-500" />
                    )}
                    <span className={`text-xs ${revenueChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {revenueChangePercent}% vs yesterday
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <CurrencyDollarIcon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Pending Payments</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(stats.pending_payments)}</p>
                  <p className="text-xs text-gray-400 mt-1">Awaiting collection</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <ClockIcon className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Summary Stats Cards - Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Total Customers</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total_customers}</p>
                  <p className="text-xs text-green-500 mt-1">+{stats.new_customers_this_month} this month</p>
                </div>
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <UsersIcon className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Total Bookings</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total_bookings}</p>
                  <p className="text-xs text-gray-400 mt-1">{stats.bookings_this_month} this month</p>
                </div>
                <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                  <CalendarIcon className="w-6 h-6 text-teal-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Total Invoices</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total_invoices}</p>
                  <p className="text-xs text-gray-400 mt-1">All time</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <ChartBarIcon className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Sessions Today</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.completed_sessions_today}</p>
                  <p className="text-xs text-gray-400 mt-1">Completed</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <ClockIcon className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Tables Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Monthly Revenue Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Monthly Revenue ({selectedYear})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Month</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Invoices</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {monthlyRevenueTable.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                          No data available for this year
                        </td>
                      </tr>
                    ) : (
                      monthlyRevenueTable.map((item) => (
                        <tr key={item.month} className="hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium text-gray-900">{item.month_name}</td>
                          <td className="px-6 py-3 text-center text-gray-700">{item.invoice_count}</td>
                          <td className="px-6 py-3 text-right font-semibold text-green-600">{formatCurrency(item.revenue)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {monthlyRevenueTable.length > 0 && (
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td className="px-6 py-3 font-bold text-gray-900">Total</td>
                        <td className="px-6 py-3 text-center font-bold text-gray-900">
                          {monthlyRevenueTable.reduce((sum, item) => sum + item.invoice_count, 0)}
                        </td>
                        <td className="px-6 py-3 text-right font-bold text-green-600">
                          {formatCurrency(monthlyRevenueTable.reduce((sum, item) => sum + Number(item.revenue), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Daily Revenue Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Daily Revenue (Last 30 Days)</h3>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Invoices</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dailyRevenue.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                          No transactions in the last 30 days
                        </td>
                      </tr>
                    ) : (
                      dailyRevenue.map((item) => (
                        <tr key={item.date} className="hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium text-gray-900">{formatDate(item.date)}</td>
                          <td className="px-6 py-3 text-center text-gray-700">{item.invoice_count}</td>
                          <td className="px-6 py-3 text-right font-semibold text-green-600">{formatCurrency(item.revenue)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Additional Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Revenue by Type */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Revenue by Type</h3>
                <p className="text-xs text-gray-500">{months[selectedMonth - 1]?.label} {selectedYear}</p>
              </div>
              <div className="p-4">
                {revenueByType.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No data available</p>
                ) : (
                  <div className="space-y-3">
                    {revenueByType.map((item) => (
                      <div key={item.invoice_type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{getInvoiceTypeLabel(item.invoice_type)}</p>
                          <p className="text-xs text-gray-500">{item.invoice_count} invoices</p>
                        </div>
                        <span className="font-semibold text-green-600">{formatCurrency(item.revenue)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Top Packages */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Top Packages</h3>
                <p className="text-xs text-gray-500">{months[selectedMonth - 1]?.label} {selectedYear}</p>
              </div>
              <div className="p-4">
                {topPackages.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No data available</p>
                ) : (
                  <div className="space-y-3">
                    {topPackages.map((pkg, index) => (
                      <div key={pkg.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-pink-500 text-white text-xs flex items-center justify-center font-bold">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium text-gray-900">{pkg.name}</p>
                            <p className="text-xs text-gray-500">{formatCurrency(pkg.price)}</p>
                          </div>
                        </div>
                        <Badge className="bg-blue-100 text-blue-700">{pkg.allocations_count} bookings</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Top Customers */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Top Customers</h3>
                <p className="text-xs text-gray-500">{months[selectedMonth - 1]?.label} {selectedYear}</p>
              </div>
              <div className="p-4">
                {topCustomers.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No data available</p>
                ) : (
                  <div className="space-y-3">
                    {topCustomers.map((customer, index) => (
                      <div key={customer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center font-bold">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium text-gray-900">{customer.name}</p>
                            <p className="text-xs text-gray-500">{customer.invoices_count} invoices</p>
                          </div>
                        </div>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(customer.invoices_sum_total_amount || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status Summaries */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Booking Status Summary */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Booking Status Summary</h3>
                <p className="text-xs text-gray-500">{months[selectedMonth - 1]?.label} {selectedYear}</p>
              </div>
              <div className="p-4">
                {bookingStatusSummary.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No bookings this month</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {bookingStatusSummary.map((item) => (
                      <div key={item.status} className="p-4 bg-gray-50 rounded-lg text-center">
                        <Badge className={`${getStatusBadgeClass(item.status)} mb-2`}>
                          {item.status.replace('_', ' ')}
                        </Badge>
                        <p className="text-2xl font-bold text-gray-900">{item.count}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Payment Status Summary */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Payment Status Summary</h3>
                <p className="text-xs text-gray-500">{months[selectedMonth - 1]?.label} {selectedYear}</p>
              </div>
              <div className="p-4">
                {paymentStatusSummary.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No payments this month</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {paymentStatusSummary.map((item) => (
                      <div key={item.payment_status} className="p-4 bg-gray-50 rounded-lg text-center">
                        <Badge className={`${getPaymentStatusBadgeClass(item.payment_status)} mb-2`}>
                          {item.payment_status}
                        </Badge>
                        <p className="text-2xl font-bold text-gray-900">{item.count}</p>
                        <p className="text-sm text-gray-500">{formatCurrency(item.total)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </HeaderLayout>
  );
};

export default Reports;
