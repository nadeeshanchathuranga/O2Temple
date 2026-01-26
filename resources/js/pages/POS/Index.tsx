import React, { useState, useEffect, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  ArrowLeftIcon,
  UserPlusIcon,
  ShoppingCartIcon,
  CreditCardIcon,
  PrinterIcon,
  TrashIcon,
  ClockIcon,
  XMarkIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import HeaderLayout from '@/layouts/header-layout';
import axios from 'axios';

// Types
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

interface BedAllocation {
  id: number;
  booking_number: string;
  customer?: {
    id: number;
    name: string;
    phone: string;
  };
  package?: {
    id: number;
    name: string;
  };
  start_time: string;
  end_time: string;
  time_remaining: string;
}

interface Bed {
  id: number;
  bed_number: string;
  display_name: string;
  grid_row?: number;
  grid_col?: number;
  bed_type?: string;
  status: 'available' | 'occupied' | 'maintenance' | 'booked_soon';
  current_allocation?: BedAllocation | null;
}

interface Booking {
  id: number;
  booking_number: string;
  customer: Customer;
  bed: { id: number; bed_number: string };
  package: Package;
  start_time: string;
  end_time: string;
  status: string;
  payment_status: string;
}

interface InvoiceItem {
  id: number;
  item_type: string;
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  total_price: number;
}

interface InvoicePayment {
  id: number;
  amount: number;
  payment_method: string;
  reference_number?: string;
  payment_date: string;
}

interface Invoice {
  id: number;
  invoice_number: string;
  customer?: Customer;
  allocation?: Booking;
  invoice_type: string;
  subtotal: number;
  discount_amount: number;
  discount_percentage: number;
  service_charge: number;
  service_charge_percentage: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_status: string;
  status: string;
  kitchen_note?: string;
  items: InvoiceItem[];
  payments: InvoicePayment[];
}

interface Props {
  beds: Bed[];
  packages: Package[];
  customers: Customer[];
  activeInvoice?: Invoice | null;
  selectedBedId?: number | null;
}

const POSBilling: React.FC<Props> = ({ 
  beds: initialBeds,
  packages, 
  customers: initialCustomers,
  activeInvoice: initialInvoice,
  selectedBedId: initialSelectedBedId,
}) => {
  // State
  const [beds, setBeds] = useState<Bed[]>(initialBeds);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedBed, setSelectedBed] = useState<Bed | null>(
    initialSelectedBedId ? initialBeds.find(b => b.id === initialSelectedBedId) || null : null
  );
  const [selectedPackageForBooking, setSelectedPackageForBooking] = useState<Package | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(initialInvoice || null);
  const [showBookingSearch, setShowBookingSearch] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Customer form
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', email: '' });
  
  // Booking form
  const [bookingForm, setBookingForm] = useState({
    customer_id: '',
    package_id: '',
    start_time: new Date().toTimeString().slice(0, 5),
    date: new Date().toISOString().split('T')[0],
  });
  
  // Payment form
  const [paymentType, setPaymentType] = useState<'cash' | 'card' | 'partial'>('cash');
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  const [cashAmount, setCashAmount] = useState(0);
  const [cardAmount, setCardAmount] = useState(0);
  const [cardReference, setCardReference] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [serviceChargePercent, setServiceChargePercent] = useState(0);
  const [kitchenNote, setKitchenNote] = useState('');
  
  // Search state
  const [bookingSearchQuery, setBookingSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Booking[]>([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // Search bookings
  const handleBookingSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    try {
      const response = await axios.get('/pos/bookings/search', { params: { query } });
      setSearchResults(response.data.bookings);
    } catch (error) {
      console.error('Error searching bookings:', error);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (bookingSearchQuery) {
        handleBookingSearch(bookingSearchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [bookingSearchQuery, handleBookingSearch]);

  // Select booking from search
  const handleSelectBooking = async (booking: Booking) => {
    setShowBookingSearch(false);
    setBookingSearchQuery('');
    setSearchResults([]);
    setSelectedCustomer(booking.customer);
    
    // Create/load invoice for this booking
    try {
      const response = await axios.post('/pos/invoices', {
        allocation_id: booking.id,
        invoice_type: 'booking',
        customer_id: booking.customer.id,
      });
      setInvoice(response.data.invoice);
    } catch (error) {
      console.error('Error loading invoice:', error);
    }
  };

  // Add item to invoice (packages only)
  const handleAddItem = async (itemType: string, itemId: number, quantity: number = 1) => {
    if (!invoice) {
      if (!selectedCustomer) {
        alert('Please select or add a customer first');
        return;
      }
      // Create invoice first
      try {
        const response = await axios.post('/pos/invoices', {
          customer_id: selectedCustomer.id,
          invoice_type: 'walk_in',
        });
        setInvoice(response.data.invoice);
        
        // Now add item to the new invoice
        const itemResponse = await axios.post(`/pos/invoices/${response.data.invoice.id}/items`, {
          item_type: itemType,
          package_id: itemId,
          quantity,
        });
        setInvoice(itemResponse.data.invoice);
      } catch (error) {
        console.error('Error:', error);
      }
      return;
    }

    try {
      const response = await axios.post(`/pos/invoices/${invoice.id}/items`, {
        item_type: itemType,
        package_id: itemId,
        quantity,
      });
      setInvoice(response.data.invoice);
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  // Remove item from invoice
  const handleRemoveItem = async (itemId: number) => {
    if (!invoice) return;
    
    try {
      const response = await axios.delete(`/pos/invoices/${invoice.id}/items/${itemId}`);
      setInvoice(response.data.invoice);
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  // Update invoice with discount/service charge
  const handleUpdateInvoice = async () => {
    if (!invoice) return;
    
    try {
      const response = await axios.put(`/pos/invoices/${invoice.id}`, {
        discount_percentage: discountPercent,
        service_charge_percentage: serviceChargePercent,
        kitchen_note: kitchenNote,
      });
      setInvoice(response.data.invoice);
    } catch (error) {
      console.error('Error updating invoice:', error);
    }
  };

  // Process payment
  const handleProcessPayment = async () => {
    if (!invoice) return;
    
    // Build payments array based on payment type
    const paymentsToProcess: { amount: number; payment_method: string; reference_number: string | null }[] = [];
    
    if (paymentType === 'cash') {
      paymentsToProcess.push({
        amount: invoice.balance_amount,
        payment_method: 'cash',
        reference_number: null,
      });
    } else if (paymentType === 'card') {
      paymentsToProcess.push({
        amount: invoice.balance_amount,
        payment_method: 'card',
        reference_number: cardReference || null,
      });
    } else if (paymentType === 'partial') {
      const totalPayment = cashAmount + cardAmount;
      if (totalPayment < invoice.balance_amount) {
        if (!confirm(`Payment (${formatCurrency(totalPayment)}) is less than balance (${formatCurrency(invoice.balance_amount)}). Continue?`)) {
          return;
        }
      }
      if (cashAmount > 0) {
        paymentsToProcess.push({
          amount: cashAmount,
          payment_method: 'cash',
          reference_number: null,
        });
      }
      if (cardAmount > 0) {
        paymentsToProcess.push({
          amount: cardAmount,
          payment_method: 'card',
          reference_number: cardReference || null,
        });
      }
    }
    
    if (paymentsToProcess.length === 0) {
      alert('Please enter payment amount');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await axios.post(`/pos/invoices/${invoice.id}/payments`, {
        payments: paymentsToProcess,
      });
      
      if (response.data.success) {
        setInvoice(response.data.invoice);
        setShowPaymentModal(false);
        // Reset payment form
        setPaymentType('cash');
        setCashAmount(0);
        setCardAmount(0);
        setCardReference('');
        
        // Update beds list if provided
        if (response.data.beds) {
          setBeds(response.data.beds);
          
          // Update selected bed if it exists
          if (selectedBed) {
            const updatedBed = response.data.beds.find((b: Bed) => b.id === selectedBed.id);
            if (updatedBed) {
              setSelectedBed(updatedBed);
            }
          }
        }
        
        if (response.data.invoice.payment_status === 'paid') {
          alert('Payment completed successfully!');
        }
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to process payment');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick create customer
  const handleCreateCustomer = async () => {
    if (!customerForm.name || !customerForm.phone) {
      alert('Name and phone are required');
      return;
    }
    
    try {
      const response = await axios.post('/pos/customers/quick', customerForm);
      if (response.data.success) {
        const newCustomer = response.data.customer;
        setCustomers([...customers, newCustomer]);
        setSelectedCustomer(newCustomer);
        setShowCustomerModal(false);
        setCustomerForm({ name: '', phone: '', email: '' });
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error creating customer');
    }
  };

  // Open payment modal
  const openPaymentModal = () => {
    if (!invoice) return;
    setPaymentType('cash');
    setCashAmount(invoice.balance_amount);
    setCardAmount(0);
    setCardReference('');
    setShowPaymentModal(true);
  };

  // Clear bill / Start new bill
  const handleClearBill = () => {
    if (invoice && invoice.items.length > 0) {
      if (!confirm('Are you sure you want to start a new bill? Current bill will be cleared.')) {
        return;
      }
    }
    // Reset all states
    setInvoice(null);
    setSelectedCustomer(null);
    setSelectedBed(null);
    setSelectedPackageForBooking(null);
    setDiscountPercent(0);
    setServiceChargePercent(0);
    setKitchenNote('');
    setPaymentType('cash');
    setReceivedAmount(0);
    setCashAmount(0);
    setCardAmount(0);
    setCardReference('');
    setCustomerSearchQuery('');
  };

  // Calculate balance/change
  const calculateBalance = () => {
    if (!invoice) return 0;
    const totalDue = invoice.balance_amount;
    return receivedAmount - totalDue;
  };

  // Check if payment can be processed
  const canProcessPayment = () => {
    if (!invoice || invoice.subtotal === 0) return false;
    if (paymentType === 'partial') {
      return (cashAmount + cardAmount) >= invoice.balance_amount;
    }
    return receivedAmount >= invoice.balance_amount;
  };

  // Handle bed click
  const handleBedClick = (bed: Bed) => {
    if (bed.status === 'maintenance') return;
    
    // Prevent clicking on occupied beds
    if (bed.status === 'occupied' || bed.status === 'booked_soon') {
      alert('This bed is currently unavailable. Please select an available bed.');
      return;
    }
    
    setSelectedBed(bed);
    
    if (bed.status === 'available') {
      // Check if a package is selected first
      if (!selectedPackageForBooking) {
        alert('Please select a package first from the packages list');
        return;
      }
      
      // Open booking modal to create a new booking with pre-selected package
      setBookingForm({
        customer_id: '',
        package_id: selectedPackageForBooking.id.toString(),
        start_time: new Date().toTimeString().slice(0, 5),
        date: new Date().toISOString().split('T')[0],
      });
      setShowBookingModal(true);
    }
  };

  // Handle package selection for booking
  const handlePackageSelectForBooking = (pkg: Package) => {
    setSelectedPackageForBooking(pkg);
    setActiveCategory('packages'); // Keep packages tab active
  };

  // Create booking from modal
  const handleCreateBooking = async () => {
    if (!bookingForm.customer_id || !bookingForm.package_id || !selectedBed) {
      alert('Please select customer and package');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await axios.post('/pos/bookings', {
        bed_id: selectedBed.id,
        customer_id: parseInt(bookingForm.customer_id),
        package_id: parseInt(bookingForm.package_id),
        start_now: true, // Use server's current time for POS walk-in bookings
      });
      
      if (response.data.success) {
        // Update beds list
        setBeds(response.data.beds);
        
        // Set the selected customer
        const customer = customers.find(c => c.id === parseInt(bookingForm.customer_id));
        if (customer) {
          setSelectedCustomer(customer);
        }
        
        // Update selected bed with new allocation
        const updatedBed = response.data.beds.find((b: Bed) => b.id === selectedBed.id);
        if (updatedBed) {
          setSelectedBed(updatedBed);
        }
        
        // Create invoice for this booking
        if (response.data.allocation) {
          const invoiceResponse = await axios.post('/pos/invoices', {
            allocation_id: response.data.allocation.id,
            invoice_type: 'booking',
            customer_id: parseInt(bookingForm.customer_id),
          });
          
          // Reload the invoice to get the calculated totals
          if (invoiceResponse.data.invoice) {
            const reloadedInvoice = await axios.get(`/pos/invoices/${invoiceResponse.data.invoice.id}`);
            setInvoice(reloadedInvoice.data.invoice || invoiceResponse.data.invoice);
          }
        }
        
        setShowBookingModal(false);
        setSelectedPackageForBooking(null); // Clear selected package
        alert('Booking created successfully!');
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create booking');
    } finally {
      setIsLoading(false);
    }
  };

  // Process payment directly from billing section
  const handleDirectPayment = async () => {
    if (!invoice || !canProcessPayment()) return;
    
    const paymentsToProcess: { amount: number; payment_method: string; reference_number: string | null }[] = [];
    
    if (paymentType === 'cash') {
      paymentsToProcess.push({
        amount: invoice.balance_amount,
        payment_method: 'cash',
        reference_number: null,
      });
    } else if (paymentType === 'card') {
      paymentsToProcess.push({
        amount: invoice.balance_amount,
        payment_method: 'card',
        reference_number: cardReference || null,
      });
    } else if (paymentType === 'partial') {
      if (cashAmount > 0) {
        paymentsToProcess.push({
          amount: cashAmount,
          payment_method: 'cash',
          reference_number: null,
        });
      }
      if (cardAmount > 0) {
        paymentsToProcess.push({
          amount: cardAmount,
          payment_method: 'card',
          reference_number: cardReference || null,
        });
      }
    }
    
    if (paymentsToProcess.length === 0) {
      alert('Please enter payment amount');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await axios.post(`/pos/invoices/${invoice.id}/payments`, {
        payments: paymentsToProcess,
      });
      
      if (response.data.success) {
        setInvoice(response.data.invoice);
        
        // Update beds list if provided
        if (response.data.beds) {
          setBeds(response.data.beds);
          
          // Update selected bed if it exists
          if (selectedBed) {
            const updatedBed = response.data.beds.find((b: Bed) => b.id === selectedBed.id);
            if (updatedBed) {
              setSelectedBed(updatedBed);
            }
          }
        }
        
        if (response.data.invoice.payment_status === 'paid') {
          alert('Payment completed successfully! You can now print the bill.');
        }
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to process payment');
    } finally {
      setIsLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', { style: 'decimal', minimumFractionDigits: 2 }).format(amount) + ' LKR';
  };

  // Filter customers by search
  const filteredCustomers = customerSearchQuery 
    ? customers.filter(c => 
        c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        c.phone.includes(customerSearchQuery)
      )
    : customers;

  return (
    <HeaderLayout>
      <Head title="POS Billing" />
      
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => router.get('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">POS Billing</h1>
              {invoice && (
                <Badge className="bg-teal-100 text-teal-700 ml-2">
                  #{invoice.invoice_number}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowBookingSearch(true)}
                className="bg-white border-2 border-teal-600 text-teal-600 hover:bg-teal-50 font-medium"
              >
                <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
                Find Booking
              </Button>
              <Button
                className="bg-teal-600 hover:bg-teal-700 text-white font-medium"
                onClick={handleClearBill}
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                New Bill
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* Left Panel - Beds & Packages */}
            <div className="col-span-7 space-y-4">
              
              {/* Bed Selection Section */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-900">Select Bed</h2>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-green-500"></span>
                      Available
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-red-500"></span>
                      Occupied
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                      Soon
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-6 gap-2">
                  {beds.map((bed) => (
                    <button
                      key={bed.id}
                      onClick={() => handleBedClick(bed)}
                      disabled={bed.status === 'maintenance' || bed.status === 'occupied' || bed.status === 'booked_soon'}
                      className={`
                        relative p-3 rounded-lg border-2 text-center transition-all
                        ${selectedBed?.id === bed.id 
                          ? 'border-teal-500 ring-2 ring-teal-200' 
                          : 'border-transparent'
                        }
                        ${bed.status === 'available' 
                          ? 'bg-green-100 hover:bg-green-200 text-green-800 cursor-pointer' 
                          : bed.status === 'occupied'
                            ? 'bg-red-100 text-red-800 cursor-not-allowed opacity-75'
                            : bed.status === 'booked_soon'
                              ? 'bg-yellow-100 text-yellow-800 cursor-not-allowed opacity-75'
                              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }
                      `}
                    >
                      <div className="font-bold text-sm">{bed.bed_number}</div>
                      {bed.current_allocation && (
                        <div className="text-[10px] mt-1 truncate" title={bed.current_allocation.customer?.name}>
                          {bed.current_allocation.time_remaining}
                        </div>
                      )}
                      {/* Status Badge */}
                      {bed.status === 'occupied' && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] px-1 py-0.5 rounded-full font-bold">
                          BUSY
                        </div>
                      )}
                      {bed.status === 'available' && (
                        <div className="absolute -top-1 -right-1 bg-green-500 text-white text-[8px] px-1 py-0.5 rounded-full font-bold">
                          FREE
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Selected Bed Info */}
                {selectedBed && (
                  <div className={`mt-3 p-3 rounded-lg ${
                    selectedBed.status === 'available' 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">Bed {selectedBed.bed_number}</span>
                        <Badge className={`${
                          selectedBed.status === 'available' 
                            ? 'bg-green-500 text-white' 
                            : selectedBed.status === 'occupied'
                            ? 'bg-red-500 text-white'
                            : 'bg-yellow-500 text-white'
                        }`}>
                          {selectedBed.status === 'available' ? 'Available' : 
                           selectedBed.status === 'occupied' ? 'Unavailable' : 'Pending'}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedBed(null)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </Button>
                    </div>
                    {selectedBed.current_allocation && (
                      <div className="mt-2 text-sm text-gray-600">
                        <p><strong>Customer:</strong> {selectedBed.current_allocation.customer?.name}</p>
                        <p><strong>Package:</strong> {selectedBed.current_allocation.package?.name}</p>
                        <p><strong>Time:</strong> {selectedBed.current_allocation.start_time} - {selectedBed.current_allocation.end_time}</p>
                        <p><strong>Ends:</strong> {selectedBed.current_allocation.time_remaining}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Packages Section - For new bookings */}
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    🎁 <span>Packages</span>
                    <span className="text-xs text-gray-500 font-normal ml-2">Select a package to create a new booking</span>
                  </h2>
                </div>

                <div className="p-4">
                  <div className="grid grid-cols-3 gap-4">
                    {packages.map((pkg) => (
                      <button
                        key={pkg.id}
                        onClick={() => handlePackageSelectForBooking(pkg)}
                        className={`p-4 border-2 rounded-xl text-left transition-all group ${
                          selectedPackageForBooking?.id === pkg.id
                            ? 'border-teal-500 bg-teal-50'
                            : 'border-yellow-200 hover:border-yellow-400 hover:bg-yellow-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className={`font-semibold ${
                              selectedPackageForBooking?.id === pkg.id
                                ? 'text-teal-700'
                                : 'text-gray-900 group-hover:text-yellow-700'
                            }`}>{pkg.name}</h3>
                            <p className="text-sm text-gray-500 flex items-center mt-1">
                              <ClockIcon className="w-4 h-4 mr-1" />
                              {pkg.duration_minutes} min
                            </p>
                          </div>
                        </div>
                        <div className={`mt-3 text-lg font-bold ${
                          selectedPackageForBooking?.id === pkg.id
                            ? 'text-teal-600'
                            : 'text-yellow-600'
                        }`}>
                          {formatCurrency(pkg.price)}
                        </div>
                        {selectedPackageForBooking?.id === pkg.id && (
                          <div className="mt-2 text-xs text-teal-600 font-medium">
                            ✓ Selected - Click a bed to assign
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  {packages.length === 0 && (
                    <div className="py-12 text-center text-gray-500">
                      <ShoppingCartIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No packages available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Services Section - Available as add-ons */}
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    🛎️ <span>Services</span>
                    <span className="text-xs text-gray-500 font-normal ml-2">Add-on services (select after loading a booking)</span>
                  </h2>
                </div>

                <div className="p-4">
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-sm">Services are added through Booking Management</p>
                    <p className="text-xs mt-2">Use "Find Booking" to load existing bookings with services</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Bill Details */}
            <div className="col-span-5">
              <div className="bg-white rounded-lg shadow-sm h-full flex flex-col">
                {/* Customer Section */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-gray-900">Customer</h2>
                    <Button
                      size="sm"
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                      onClick={() => {
                        setCustomerForm({ name: '', phone: '', email: '' });
                        setShowCustomerModal(true);
                      }}
                    >
                      <UserPlusIcon className="w-4 h-4 mr-1" />
                      Add New
                    </Button>
                  </div>
                  
                  {selectedCustomer ? (
                    <div className="flex items-center justify-between p-3 bg-teal-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{selectedCustomer.name}</p>
                        <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedCustomer(null)}
                        className="text-gray-500 hover:text-red-500"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Search customer by name or phone..."
                          value={customerSearchQuery}
                          onChange={(e) => setCustomerSearchQuery(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      {customerSearchQuery && filteredCustomers.length > 0 && (
                        <div className="mt-2 max-h-40 overflow-y-auto border rounded-lg divide-y bg-white">
                          {filteredCustomers.slice(0, 5).map((customer) => (
                            <button
                              key={customer.id}
                              className="w-full p-2 text-left hover:bg-gray-50 flex justify-between items-center"
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setCustomerSearchQuery('');
                              }}
                            >
                              <span className="font-medium text-gray-900">{customer.name}</span>
                              <span className="text-sm text-gray-600">{customer.phone}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Order Items */}
                <div className="flex-1 p-4 overflow-y-auto min-h-[200px] max-h-[300px]">
                  <h2 className="font-semibold text-gray-900 mb-3">Order Items</h2>
                  {!invoice || invoice.items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 py-8">
                      <ShoppingCartIcon className="w-12 h-12 mb-2" />
                      <p className="text-sm">No items added yet</p>
                      <p className="text-xs mt-1">Select items from the left panel</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {invoice.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.item_name}</p>
                            <p className="text-sm text-gray-500">
                              {item.quantity} × {formatCurrency(item.unit_price)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-gray-900">{formatCurrency(item.total_price)}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Billing Summary */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <div className="space-y-3">
                    {/* Subtotal */}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-900 font-medium">Subtotal</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(invoice?.subtotal || 0)}</span>
                    </div>

                    {/* Discount */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900 font-medium w-24">Discount</span>
                      <Select 
                        value={discountPercent.toString()} 
                        onValueChange={(val) => {
                          setDiscountPercent(parseInt(val));
                          setTimeout(handleUpdateInvoice, 100);
                        }}
                      >
                        <SelectTrigger className="flex-1 h-8">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">No Discount</SelectItem>
                          <SelectItem value="5">5%</SelectItem>
                          <SelectItem value="10">10%</SelectItem>
                          <SelectItem value="15">15%</SelectItem>
                          <SelectItem value="20">20%</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm font-semibold w-24 text-right text-gray-900">
                        -{formatCurrency(invoice?.discount_amount || 0)}
                      </span>
                    </div>

                    {/* Service Charge */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900 font-medium w-24">Service</span>
                      <Select 
                        value={serviceChargePercent.toString()} 
                        onValueChange={(val) => {
                          setServiceChargePercent(parseInt(val));
                          setTimeout(handleUpdateInvoice, 100);
                        }}
                      >
                        <SelectTrigger className="flex-1 h-8">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">No Charge</SelectItem>
                          <SelectItem value="5">5%</SelectItem>
                          <SelectItem value="10">10%</SelectItem>
                          <SelectItem value="15">15%</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm font-semibold w-24 text-right text-gray-900">
                        +{formatCurrency(invoice?.service_charge || 0)}
                      </span>
                    </div>

                    {/* Tax */}
                    {(invoice?.tax_amount || 0) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax</span>
                        <span className="font-medium">+{formatCurrency(invoice?.tax_amount || 0)}</span>
                      </div>
                    )}

                    {/* Total */}
                    <div className="flex justify-between pt-3 border-t border-gray-300">
                      <span className="text-lg font-bold text-gray-900">Total</span>
                      <span className="text-lg font-bold text-teal-600">{formatCurrency(invoice?.total_amount || 0)}</span>
                    </div>

                    {/* Paid & Balance with Payment Breakdown */}
                    {invoice && invoice.paid_amount > 0 && (
                      <>
                        {/* Payment Breakdown by Method */}
                        {invoice.payments && invoice.payments.length > 0 && (
                          <div className="pt-2 space-y-1">
                            {invoice.payments.filter(p => p.payment_method === 'cash').length > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-green-600 flex items-center gap-1">
                                  <span>💵</span> Cash
                                </span>
                                <span className="font-medium text-green-600">
                                  {formatCurrency(
                                    invoice.payments
                                      .filter(p => p.payment_method === 'cash')
                                      .reduce((sum, p) => sum + p.amount, 0)
                                  )}
                                </span>
                              </div>
                            )}
                            {invoice.payments.filter(p => p.payment_method === 'card').length > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-green-600 flex items-center gap-1">
                                  <span>💳</span> Card
                                </span>
                                <span className="font-medium text-green-600">
                                  {formatCurrency(
                                    invoice.payments
                                      .filter(p => p.payment_method === 'card')
                                      .reduce((sum, p) => sum + p.amount, 0)
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex justify-between text-sm pt-1 border-t border-dashed border-gray-300">
                          <span className="text-green-600 font-medium">Total Paid</span>
                          <span className="font-medium text-green-600">{formatCurrency(invoice.paid_amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-900">Balance</span>
                          <span className={`font-bold ${invoice.balance_amount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {formatCurrency(invoice.balance_amount)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Kitchen Note */}
                  <div className="mt-4">
                    <Input
                      placeholder="Add a note..."
                      value={kitchenNote}
                      onChange={(e) => setKitchenNote(e.target.value)}
                      onBlur={handleUpdateInvoice}
                      className="text-sm text-gray-900"
                    />
                  </div>

                  {/* Payment Method Selection */}
                  <div className="mt-4">
                    <span className="text-sm text-gray-900 font-medium mb-2 block">Payment Method :</span>
                    <div className="flex justify-center gap-3">
                      {/* Cash Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentType('cash');
                          setReceivedAmount(0);
                        }}
                        className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all w-20 ${paymentType === 'cash' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                      >
                        <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${paymentType === 'cash' ? 'bg-yellow-400' : 'bg-gray-100'}`}>
                          <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect x='8' y='20' width='48' height='28' rx='2' fill='%2322c55e'/%3E%3Crect x='12' y='24' width='40' height='20' rx='1' fill='%234ade80'/%3E%3Ccircle cx='32' cy='34' r='8' fill='%2322c55e'/%3E%3Ctext x='32' y='38' text-anchor='middle' fill='white' font-size='10' font-weight='bold'%3E$%3C/text%3E%3Crect x='4' y='16' width='48' height='28' rx='2' fill='%2316a34a'/%3E%3Crect x='8' y='20' width='40' height='20' rx='1' fill='%2322c55e'/%3E%3Ccircle cx='28' cy='30' r='8' fill='%2316a34a'/%3E%3Ctext x='28' y='34' text-anchor='middle' fill='white' font-size='10' font-weight='bold'%3E$%3C/text%3E%3C/svg%3E" alt="Cash" className="w-10 h-10" />
                        </div>
                        <span className={`mt-1 text-xs font-medium ${paymentType === 'cash' ? 'text-yellow-700' : 'text-gray-600'}`}>Cash</span>
                      </button>

                      {/* Card Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentType('card');
                          setReceivedAmount(invoice?.balance_amount || 0);
                        }}
                        className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all w-20 ${paymentType === 'card' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                      >
                        <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${paymentType === 'card' ? 'bg-red-400' : 'bg-gray-100'}`}>
                          <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect x='6' y='14' width='52' height='36' rx='4' fill='%23ef4444'/%3E%3Crect x='6' y='22' width='52' height='10' fill='%23991b1b'/%3E%3Crect x='12' y='38' width='20' height='4' rx='1' fill='%23fbbf24'/%3E%3Crect x='44' y='16' width='10' height='8' rx='1' fill='%23fbbf24'/%3E%3C/svg%3E" alt="Card" className="w-10 h-10" />
                        </div>
                        <span className={`mt-1 text-xs font-medium ${paymentType === 'card' ? 'text-red-700' : 'text-gray-600'}`}>Card</span>
                      </button>

                      {/* Split/Partial Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentType('partial');
                          setCashAmount(0);
                          setCardAmount(0);
                        }}
                        className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all w-20 ${paymentType === 'partial' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                      >
                        <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${paymentType === 'partial' ? 'bg-blue-400' : 'bg-gray-100'}`}>
                          <span className="text-2xl">🔀</span>
                        </div>
                        <span className={`mt-1 text-xs font-medium ${paymentType === 'partial' ? 'text-blue-700' : 'text-gray-600'}`}>Split</span>
                      </button>
                    </div>
                  </div>

                  {/* Payment Amount Input - Only show if invoice exists and has balance */}
                  {invoice && invoice.balance_amount > 0 && (
                    <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg space-y-3">
                      {paymentType === 'partial' ? (
                        <>
                          {/* Split Payment Inputs */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">💵</span>
                              <div className="flex-1">
                                <Label className="text-xs text-gray-600">Cash Amount</Label>
                                <Input
                                  type="number"
                                  value={cashAmount || ''}
                                  onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                  className="text-gray-900"
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xl">💳</span>
                              <div className="flex-1">
                                <Label className="text-xs text-gray-600">Card Amount</Label>
                                <Input
                                  type="number"
                                  value={cardAmount || ''}
                                  onChange={(e) => setCardAmount(parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                  className="text-gray-900"
                                />
                              </div>
                            </div>
                            {cardAmount > 0 && (
                              <div>
                                <Label className="text-xs text-gray-600">Card Reference</Label>
                                <Input
                                  value={cardReference}
                                  onChange={(e) => setCardReference(e.target.value)}
                                  placeholder="Transaction ID"
                                  className="text-gray-900"
                                />
                              </div>
                            )}
                            {/* Split Total */}
                            <div className="pt-2 border-t border-gray-200">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Split Total:</span>
                                <span className={`font-semibold ${(cashAmount + cardAmount) >= invoice.balance_amount ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(cashAmount + cardAmount)}
                                </span>
                              </div>
                              {(cashAmount + cardAmount) < invoice.balance_amount && (
                                <p className="text-xs text-red-500 mt-1">
                                  Remaining: {formatCurrency(invoice.balance_amount - (cashAmount + cardAmount))}
                                </p>
                              )}
                              {(cashAmount + cardAmount) > invoice.balance_amount && (
                                <p className="text-xs text-green-500 mt-1">
                                  Change: {formatCurrency((cashAmount + cardAmount) - invoice.balance_amount)}
                                </p>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Single Payment Input */}
                          <div>
                            <Label className="text-sm text-gray-900 font-medium">
                              {paymentType === 'cash' ? '💵 Cash Received' : '💳 Card Amount'}
                            </Label>
                            <Input
                              type="number"
                              value={receivedAmount || ''}
                              onChange={(e) => setReceivedAmount(parseFloat(e.target.value) || 0)}
                              placeholder="Enter amount..."
                              className="mt-1 text-lg font-semibold text-gray-900"
                            />
                          </div>
                          
                          {paymentType === 'card' && (
                            <div>
                              <Label className="text-xs text-gray-600">Card Reference / Transaction ID</Label>
                              <Input
                                value={cardReference}
                                onChange={(e) => setCardReference(e.target.value)}
                                placeholder="Enter reference number"
                                className="text-gray-900"
                              />
                            </div>
                          )}
                          
                          {/* Balance/Change Display */}
                          {receivedAmount > 0 && (
                            <div className="pt-2 border-t border-gray-200">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">
                                  {calculateBalance() >= 0 ? 'Change to Return:' : 'Remaining Balance:'}
                                </span>
                                <span className={`text-lg font-bold ${calculateBalance() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(Math.abs(calculateBalance()))}
                                </span>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-4 space-y-2">
                    {/* Confirm Payment Button - Only show if not yet paid */}
                    {invoice && invoice.payment_status !== 'paid' && (
                      <Button
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 text-base font-semibold"
                        disabled={!invoice || invoice.subtotal === 0 || !canProcessPayment() || isLoading}
                        onClick={handleDirectPayment}
                      >
                        {isLoading ? (
                          'Processing...'
                        ) : (
                          <>
                            <CheckCircleIcon className="w-5 h-5 mr-2" />
                            CONFIRM PAYMENT
                          </>
                        )}
                      </Button>
                    )}

                    {/* Print Bill Button - Only enabled after payment */}
                    <Button
                      variant={invoice?.payment_status === 'paid' ? 'default' : 'outline'}
                      className={`w-full py-3 ${
                        invoice?.payment_status === 'paid' 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'border-gray-300 text-gray-400 cursor-not-allowed'
                      }`}
                      disabled={!invoice || invoice.payment_status !== 'paid'}
                      onClick={() => {
                        if (invoice) {
                          window.open(`/pos/invoices/${invoice.id}/print`, '_blank');
                        }
                      }}
                    >
                      <PrinterIcon className="w-5 h-5 mr-2" />
                      {invoice?.payment_status === 'paid' ? 'PRINT BILL' : 'Pay First to Print'}
                    </Button>

                    {/* Add More Items Button - Show after payment for add-ons */}
                    {invoice?.payment_status === 'paid' && selectedCustomer && (
                      <Button
                        variant="outline"
                        className="w-full py-3 border-teal-500 text-teal-600 hover:bg-teal-50"
                        onClick={async () => {
                          // Create a new invoice for the same customer to add more items
                          try {
                            const response = await axios.post('/pos/invoices', {
                              customer_id: selectedCustomer.id,
                              invoice_type: 'addon',
                              parent_invoice_id: invoice.id,
                            });
                            setInvoice(response.data.invoice);
                            // Reset payment state for new invoice
                            setPaymentType('cash');
                            setReceivedAmount(0);
                            setCashAmount(0);
                            setCardAmount(0);
                            setCardReference('');
                          } catch (error: any) {
                            alert(error.response?.data?.message || 'Failed to create addon invoice');
                          }
                        }}
                      >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        ADD MORE ITEMS (Add-ons)
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Search Modal */}
      <Dialog open={showBookingSearch} onOpenChange={setShowBookingSearch}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Find Existing Booking</DialogTitle>
            <DialogDescription>Search for an existing booking by booking number, customer name, or phone number.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search by booking number, name or phone..."
                value={bookingSearchQuery}
                onChange={(e) => setBookingSearchQuery(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {searchResults.length === 0 && bookingSearchQuery.length >= 2 && (
                <p className="text-center text-gray-500 py-4">No bookings found</p>
              )}
              {searchResults.map((booking) => (
                <button
                  key={booking.id}
                  className="w-full p-3 border rounded-lg text-left hover:bg-gray-50 transition-colors"
                  onClick={() => handleSelectBooking(booking)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-teal-700">{booking.booking_number}</p>
                      <p className="text-sm text-gray-600">{booking.customer.name} • {booking.customer.phone}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {booking.package.name} • Bed {booking.bed.bed_number}
                      </p>
                    </div>
                    <Badge className={booking.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>
                      {booking.payment_status}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Customer Modal */}
      <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>Create a new customer profile with their contact information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={customerForm.name}
                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                placeholder="Enter customer name"
              />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input
                value={customerForm.phone}
                onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <Label>Email (Optional)</Label>
              <Input
                type="email"
                value={customerForm.email}
                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>
            <div>
              <Label>NIC</Label>
              <Input
                value={customerForm.nic || ''}
                onChange={(e) => setCustomerForm({ ...customerForm, nic: e.target.value })}
                placeholder="Enter NIC number"
              />
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={customerForm.address || ''}
                onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                placeholder="Enter address"
              />
            </div>
            <div>
              <Label>Age</Label>
              <Input
                type="number"
                min="0"
                value={customerForm.age || ''}
                onChange={(e) => setCustomerForm({ ...customerForm, age: e.target.value.replace(/\D/g, '') })}
                placeholder="Enter age"
              />
            </div>
            <div>
              <Label>Date of Birth</Label>
              <Input
                type="date"
                value={customerForm.dob || ''}
                onChange={(e) => setCustomerForm({ ...customerForm, dob: e.target.value })}
                placeholder="Select date of birth"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={customerForm.description || ''}
                onChange={(e) => setCustomerForm({ ...customerForm, description: e.target.value })}
                placeholder="Enter description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50" onClick={() => setShowCustomerModal(false)}>Cancel</Button>
            <Button onClick={handleCreateCustomer} className="bg-teal-600 hover:bg-teal-700 text-white">Save Customer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Process Payment</DialogTitle>
            <DialogDescription>Select payment method and enter the amount received from the customer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Total Amount</span>
                <span className="font-bold text-lg text-gray-900">{formatCurrency(invoice?.total_amount || 0)}</span>
              </div>
              {(invoice?.paid_amount || 0) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Already Paid</span>
                  <span>{formatCurrency(invoice?.paid_amount || 0)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t mt-2">
                <span className="font-semibold text-gray-900">Balance Due</span>
                <span className="font-bold text-red-600">{formatCurrency(invoice?.balance_amount || 0)}</span>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">Payment Method</Label>
              <div className="flex justify-center gap-4">
                {/* Cash Option */}
                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('cash');
                    setCashAmount(invoice?.balance_amount || 0);
                    setCardAmount(0);
                  }}
                  className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all w-28 ${
                    paymentType === 'cash'
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-3xl ${
                    paymentType === 'cash' ? 'bg-yellow-400' : 'bg-gray-100'
                  }`}>
                    💵
                  </div>
                  <span className={`mt-2 text-sm font-medium ${
                    paymentType === 'cash' ? 'text-yellow-700' : 'text-gray-600'
                  }`}>Cash</span>
                </button>

                {/* Card Option */}
                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('card');
                    setCashAmount(0);
                    setCardAmount(invoice?.balance_amount || 0);
                  }}
                  className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all w-28 ${
                    paymentType === 'card'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-3xl ${
                    paymentType === 'card' ? 'bg-red-400' : 'bg-gray-100'
                  }`}>
                    💳
                  </div>
                  <span className={`mt-2 text-sm font-medium ${
                    paymentType === 'card' ? 'text-red-700' : 'text-gray-600'
                  }`}>Card</span>
                </button>

                {/* Partial Payment Option */}
                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('partial');
                    setCashAmount(Math.floor((invoice?.balance_amount || 0) / 2));
                    setCardAmount(Math.ceil((invoice?.balance_amount || 0) / 2));
                  }}
                  className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all w-28 ${
                    paymentType === 'partial'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-3xl ${
                    paymentType === 'partial' ? 'bg-blue-400' : 'bg-gray-100'
                  }`}>
                    🔀
                  </div>
                  <span className={`mt-2 text-sm font-medium ${
                    paymentType === 'partial' ? 'text-blue-700' : 'text-gray-600'
                  }`}>Split</span>
                </button>
              </div>
            </div>

            {/* Payment Details based on type */}
            {paymentType === 'card' && (
              <div className="p-4 border border-gray-200 rounded-lg space-y-3">
                <div>
                  <Label className="text-sm text-gray-700">Card Reference / Transaction ID</Label>
                  <Input
                    placeholder="Enter reference number"
                    value={cardReference}
                    onChange={(e) => setCardReference(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {paymentType === 'partial' && (
              <div className="p-4 border border-gray-200 rounded-lg space-y-4">
                <h4 className="font-medium text-gray-900">Split Payment Details</h4>
                
                {/* Cash Amount */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-yellow-400 flex items-center justify-center text-xl">
                    💵
                  </div>
                  <div className="flex-1">
                    <Label className="text-sm text-gray-700">Cash Amount</Label>
                    <Input
                      type="number"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Card Amount */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-red-400 flex items-center justify-center text-xl">
                    💳
                  </div>
                  <div className="flex-1">
                    <Label className="text-sm text-gray-700">Card Amount</Label>
                    <Input
                      type="number"
                      value={cardAmount}
                      onChange={(e) => setCardAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                </div>

                {cardAmount > 0 && (
                  <div>
                    <Label className="text-sm text-gray-700">Card Reference / Transaction ID</Label>
                    <Input
                      placeholder="Enter reference number"
                      value={cardReference}
                      onChange={(e) => setCardReference(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                )}

                {/* Split Summary */}
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Cash:</span>
                    <span className="font-medium text-gray-900">{formatCurrency(cashAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Card:</span>
                    <span className="font-medium text-gray-900">{formatCurrency(cardAmount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-gray-900">Total:</span>
                    <span className={cashAmount + cardAmount >= (invoice?.balance_amount || 0) ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(cashAmount + cardAmount)}
                    </span>
                  </div>
                  {cashAmount + cardAmount < (invoice?.balance_amount || 0) && (
                    <p className="text-xs text-red-500 mt-1">
                      Remaining: {formatCurrency((invoice?.balance_amount || 0) - (cashAmount + cardAmount))}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Previous Payments Display */}
            {invoice && invoice.payments && invoice.payments.length > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">Previous Payments</h4>
                {invoice.payments.map((payment, index) => (
                  <div key={index} className="flex justify-between text-sm text-green-700">
                    <span className="capitalize">{payment.payment_method}:</span>
                    <span>{formatCurrency(payment.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Confirm Button */}
          <div className="mt-4">
            <Button 
              onClick={handleProcessPayment} 
              disabled={isLoading}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 text-base font-medium"
            >
              {isLoading ? (
                'Processing...'
              ) : (
                <>
                  <PlusIcon className="w-5 h-5 mr-2" />
                  CONFIRM ORDER
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Modal */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600 font-bold text-sm">
                {selectedBed?.bed_number}
              </span>
              Create Booking
            </DialogTitle>
            <DialogDescription>Select a customer and set the date and time for this booking.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Customer Selection */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Select Customer *</Label>
              <div className="flex gap-2">
                <Select
                  value={bookingForm.customer_id}
                  onValueChange={(value) => setBookingForm({ ...bookingForm, customer_id: value })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Choose customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name} - {customer.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBookingModal(false);
                    setCustomerForm({ name: '', phone: '', email: '' });
                    setShowCustomerModal(true);
                  }}
                  className="shrink-0"
                >
                  <UserPlusIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Selected Package Display (Read-only) */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Selected Package</Label>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                {selectedPackageForBooking ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-yellow-800">{selectedPackageForBooking.name}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {selectedPackageForBooking.duration_minutes} min • {formatCurrency(selectedPackageForBooking.price)}
                      </p>
                    </div>
                    <ClockIcon className="w-5 h-5 text-yellow-600" />
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No package selected</p>
                )}
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Date</Label>
                <Input
                  type="date"
                  value={bookingForm.date}
                  onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Start Time</Label>
                <Input
                  type="time"
                  value={bookingForm.start_time}
                  onChange={(e) => setBookingForm({ ...bookingForm, start_time: e.target.value })}
                />
              </div>
            </div>

            {/* Selected Package Details */}
            {selectedPackageForBooking && (
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
                {(() => {
                  // Calculate end time
                  const startDateTime = new Date(`${bookingForm.date}T${bookingForm.start_time}`);
                  const endDateTime = new Date(startDateTime.getTime() + selectedPackageForBooking.duration_minutes * 60000);
                  const endTimeStr = endDateTime.toTimeString().slice(0, 5);
                  
                  return (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-teal-800">Booking Summary</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Duration:</span>
                          <span className="ml-2 font-medium text-gray-900">{selectedPackageForBooking.duration_minutes} min</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Price:</span>
                          <span className="ml-2 font-medium text-teal-700">{formatCurrency(selectedPackageForBooking.price)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Start:</span>
                          <span className="ml-2 font-medium text-gray-900">{bookingForm.start_time}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">End:</span>
                          <span className="ml-2 font-medium text-gray-900">{endTimeStr}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              className="border-gray-300 text-gray-700 hover:bg-gray-50" 
              onClick={() => setShowBookingModal(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateBooking} 
              disabled={isLoading || !bookingForm.customer_id || !bookingForm.package_id}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isLoading ? 'Creating...' : 'Create Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HeaderLayout>
  );
};

export default POSBilling;
