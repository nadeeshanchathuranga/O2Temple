import React, { useState, useEffect, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  formatTimeString, 
  formatTimeRange, 
  formatDisplayDate, 
  getCurrentSriLankaTimeString, 
  getCurrentSriLankaDateString 
} from '@/utils/time';
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

interface MembershipPackage {
  id: number;
  type: string;
  name: string;
  phone: string;
  num_of_sessions: number;
  sessions_used: number;
  remaining_sessions: number; // Now always available from backend
  full_payment: number;
  remaining_balance: number;
  status: string;
  package: Package;
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
  payment_status?: string;
  status?: string;
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
  bed: { id: number; bed_number: string; display_name?: string };
  package: Package;
  start_time: string;
  end_time: string;
  status: string;
  payment_status: string;
  total_amount?: number;
  final_amount?: number;
  advance_paid?: number;
  balance_amount?: number;
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
  membershipPackages: MembershipPackage[];
  activeInvoice?: Invoice | null;
  selectedBedId?: number | null;
  loadedBooking?: Booking | null;
}

const POSBilling: React.FC<Props> = ({ 
  beds: initialBeds,
  packages, 
  customers: initialCustomers,
  membershipPackages,
  activeInvoice: initialInvoice,
  selectedBedId: initialSelectedBedId,
  loadedBooking,
}) => {
  // State
  const [beds, setBeds] = useState<Bed[]>(initialBeds);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedBed, setSelectedBed] = useState<Bed | null>(
    initialSelectedBedId ? initialBeds.find(b => b.id === initialSelectedBedId) || null : null
  );
  const [selectedPackageForBooking, setSelectedPackageForBooking] = useState<Package | null>(null);
  const [selectedMembershipPackage, setSelectedMembershipPackage] = useState<MembershipPackage | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(initialInvoice || null);
  const [showBookingSearch, setShowBookingSearch] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Customer form
  const [customerForm, setCustomerForm] = useState<{
    name: string;
    phone: string;
    phone_2?: string;
    email: string;
    nic?: string;
    address?: string;
    age?: string;
    dob?: string;
    description?: string;
  }>({
    name: '',
    phone: '',
    phone_2: '',
    email: '',
    nic: '',
    address: '',
    age: '',
    dob: '',
    description: '',
  });
  
  // Booking form - use Sri Lanka time
  const [bookingForm, setBookingForm] = useState({
    customer_id: '',
    package_id: '',
    start_time: getCurrentSriLankaTimeString(),
    date: getCurrentSriLankaDateString(),
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

  // Auto-check for membership when customer or package selection changes
  useEffect(() => {
    if (selectedCustomer && selectedPackageForBooking) {
      const customerMembership = membershipPackages.find(mp => 
        mp.phone === selectedCustomer.phone && 
        mp.package.id === selectedPackageForBooking.id && 
        mp.status === 'active' &&
        mp.remaining_sessions > 0
      );
      
      if (customerMembership) {
        setSelectedMembershipPackage(customerMembership);
      } else {
        setSelectedMembershipPackage(null);
      }
    } else {
      setSelectedMembershipPackage(null);
    }
  }, [selectedCustomer, selectedPackageForBooking, membershipPackages]);

  // Auto-select package when customer with membership is selected
  useEffect(() => {
    if (selectedCustomer && !selectedPackageForBooking) {
      // Find active membership for this customer
      const customerMembership = membershipPackages.find(mp => 
        mp.phone === selectedCustomer.phone && 
        mp.status === 'active' &&
        mp.remaining_sessions > 0
      );
      
      if (customerMembership) {
        // Auto-select the package from the membership
        const pkg = packages.find(p => p.id === customerMembership.package.id);
        if (pkg) {
          setSelectedPackageForBooking(pkg);
          setSelectedMembershipPackage(customerMembership);
        }
      }
    }
  }, [selectedCustomer, membershipPackages, packages, selectedPackageForBooking]);

  // Auto-load booking if navigating from Booking Management
  useEffect(() => {
    if (loadedBooking) {
      // Set customer from loaded booking
      setSelectedCustomer(loadedBooking.customer);
      
      // Find and select the bed
      const bed = beds.find(b => b.id === loadedBooking.bed.id);
      if (bed) {
        setSelectedBed(bed);
      }
      
      // Auto-select the package to highlight it in the packages section
      const packageToSelect = packages.find(p => p.id === loadedBooking.package.id);
      if (packageToSelect) {
        setSelectedPackageForBooking(packageToSelect);
      }
      
      // If invoice is already provided from backend (with advance payment handling), use it
      // Otherwise create invoice via API
      if (!invoice) {
        handleSelectBooking(loadedBooking);
      }
    }
  }, [loadedBooking]); // Only run once when component mounts with loadedBooking

  // Select booking from search
  const handleSelectBooking = async (booking: Booking) => {
    setShowBookingSearch(false);
    setBookingSearchQuery('');
    setSearchResults([]);
    setSelectedCustomer(booking.customer);
    
    // Find and select the bed
    const bed = beds.find(b => b.id === booking.bed.id);
    if (bed) {
      setSelectedBed(bed);
    }
    
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
    
    // Check if balance is already 0 (100% discount) - complete invoice directly
    if (invoice.balance_amount <= 0) {
      setIsLoading(true);
      try {
        const response = await axios.post(`/pos/invoices/${invoice.id}/complete`, {});
        
        if (response.data.success) {
          setInvoice(response.data.invoice);
          setShowPaymentModal(false);
          
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
          
          alert('Order completed successfully (100% discount applied)!');
          // Redirect to POS page
          router.visit('/pos');
        }
      } catch (error: any) {
        alert(error.response?.data?.message || 'Failed to complete order');
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
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
        setCustomerForm({ name: '', phone: '', phone_2: '', email: '', nic: '', address: '', age: '', dob: '', description: '' });
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
  const handleBedClick = async (bed: Bed) => {
    if (bed.status === 'maintenance') {
      alert('This bed is under maintenance.');
      return;
    }
    
    // If bed has a pending (unpaid) allocation, allow clicking to bill it
    if (bed.status === 'booked_soon' && bed.current_allocation && bed.current_allocation.payment_status === 'pending') {
      // Load the booking into billing
      try {
        const response = await axios.post('/pos/invoices', {
          allocation_id: bed.current_allocation.id,
          invoice_type: 'booking',
          customer_id: bed.current_allocation.customer?.id,
        });
        setInvoice(response.data.invoice);
        
        // Set customer
        if (bed.current_allocation.customer) {
          setSelectedCustomer({
            id: bed.current_allocation.customer.id,
            name: bed.current_allocation.customer.name,
            phone: bed.current_allocation.customer.phone,
          });
        }
        
        setSelectedBed(bed);
        return;
      } catch (error) {
        console.error('Error loading booking:', error);
        alert('Failed to load booking for billing');
        return;
      }
    }
    
    setSelectedBed(bed);
    
    // For occupied or booked_soon beds, inform user but allow selection for different time slots
    if (bed.status === 'occupied') {
      // Check if package and customer are selected first
      if (!selectedPackageForBooking) {
        alert('This bed is currently occupied. Please select a package first to book a different time slot.');
        return;
      }
      if (!selectedCustomer) {
        alert('This bed is currently occupied. Please select a customer first to book a different time slot.');
        return;
      }
      
      alert('This bed is currently occupied. You can create a booking for a later time slot.');
      // Open booking modal for scheduling
      setBookingForm({
        customer_id: selectedCustomer?.id.toString() || '',
        package_id: selectedPackageForBooking.id.toString(),
        start_time: getCurrentSriLankaTimeString(),
        date: getCurrentSriLankaDateString(),
      });
      setShowBookingModal(true);
      return;
    }
    
    // Allow booking on booked_soon beds for different time slots
    if (bed.status === 'booked_soon' && bed.current_allocation?.payment_status === 'paid') {
      // Check if package and customer are selected first
      if (!selectedPackageForBooking) {
        alert('This bed has an upcoming booking. Please select a package first to book a different time slot.');
        return;
      }
      if (!selectedCustomer) {
        alert('This bed has an upcoming booking. Please select a customer first to book a different time slot.');
        return;
      }
      
      alert('This bed has an upcoming booking. You can create a booking for a different time slot.');
      // Open booking modal for scheduling
      setBookingForm({
        customer_id: selectedCustomer?.id.toString() || '',
        package_id: selectedPackageForBooking.id.toString(),
        start_time: getCurrentSriLankaTimeString(),
        date: getCurrentSriLankaDateString(),
      });
      setShowBookingModal(true);
      return;
    }
    
    if (bed.status === 'available') {
      // Check if a package is selected first
      if (!selectedPackageForBooking) {
        alert('Please select a package first from the packages list');
        return;
      }
      
      // Check if customer is selected
      if (!selectedCustomer) {
        alert('Please select a customer first');
        return;
      }
      
      // Open booking modal for both membership and regular customers
      setBookingForm({
        customer_id: selectedCustomer?.id.toString() || '',
        package_id: selectedPackageForBooking.id.toString(),
        start_time: getCurrentSriLankaTimeString(),
        date: getCurrentSriLankaDateString(),
      });
      setShowBookingModal(true);
    }
  };

  // Handle package selection for booking
  const handlePackageSelectForBooking = (pkg: Package) => {
    setSelectedPackageForBooking(pkg);
    
    // Check if selected customer has a membership for this package
    if (selectedCustomer) {
      const customerMembership = membershipPackages.find(mp => 
        mp.phone === selectedCustomer.phone && 
        mp.package.id === pkg.id && 
        mp.status === 'active' &&
        mp.remaining_sessions > 0
      );
      
      if (customerMembership) {
        // Auto-select the membership package for this customer
        setSelectedMembershipPackage(customerMembership);
      } else {
        setSelectedMembershipPackage(null);
      }
    } else {
      setSelectedMembershipPackage(null);
    }
  };

  // Create booking from modal
  const handleCreateBooking = async () => {
    if (!bookingForm.customer_id || !bookingForm.package_id || !selectedBed) {
      alert('Please select customer and package');
      return;
    }
    
    setIsLoading(true);
    try {
      let actualCustomerId = parseInt(bookingForm.customer_id);
      
      // If customer_id is negative, it's a membership customer - find by phone
      if (actualCustomerId < 0) {
        const membershipCustomer = allCustomersWithMembership.find(c => c.id === actualCustomerId);
        if (membershipCustomer) {
          // Find actual customer by phone number
          const actualCustomer = customers.find(c => c.phone === membershipCustomer.phone);
          if (actualCustomer) {
            actualCustomerId = actualCustomer.id;
          } else {
            // Create new customer from membership data using quick endpoint
            const createResponse = await axios.post('/pos/customers/quick', {
              name: membershipCustomer.name,
              phone: membershipCustomer.phone,
            });
            if (createResponse.data.success && createResponse.data.customer) {
              actualCustomerId = createResponse.data.customer.id;
              // Add to customers list
              setCustomers(prev => [...prev, createResponse.data.customer]);
            } else {
              throw new Error('Failed to create customer');
            }
          }
        }
      }
      
      // Check if this is a membership booking
      const selectedCustomerForBooking = allCustomersWithMembership.find(c => c.id === parseInt(bookingForm.customer_id));
      const membershipPkgForBooking = selectedCustomerForBooking 
        ? membershipPackages.find(mp => 
            mp.phone === selectedCustomerForBooking.phone && 
            mp.package.id === parseInt(bookingForm.package_id) && 
            mp.status === 'active' && 
            mp.remaining_sessions > 0
          )
        : null;
      
      // Build start_time from date and time inputs
      const startDateTime = `${bookingForm.date} ${bookingForm.start_time}`;
      
      const response = await axios.post('/pos/bookings', {
        bed_id: selectedBed.id,
        customer_id: actualCustomerId,
        package_id: parseInt(bookingForm.package_id),
        membership_package_id: membershipPkgForBooking?.id || null,
        start_time: startDateTime,
      });
      
      if (response.data.success) {
        // Update beds list
        setBeds(response.data.beds);
        
        // Set the selected customer
        const customer = customers.find(c => c.id === actualCustomerId);
        if (customer) {
          setSelectedCustomer(customer);
        }
        
        // Update selected bed with new allocation
        const updatedBed = response.data.beds.find((b: Bed) => b.id === selectedBed.id);
        if (updatedBed) {
          setSelectedBed(updatedBed);
        }
        
        // Create invoice for this booking (don't complete it yet)
        if (response.data.allocation) {
          const invoiceResponse = await axios.post('/pos/invoices', {
            allocation_id: response.data.allocation.id,
            invoice_type: 'booking',
            customer_id: actualCustomerId,
          });
          
          if (invoiceResponse.data.invoice) {
            // Load the invoice but don't complete it - wait for CONFIRM BOOKING button
            const reloadedInvoice = await axios.get(`/pos/invoices/${invoiceResponse.data.invoice.id}`);
            setInvoice(reloadedInvoice.data.invoice || invoiceResponse.data.invoice);
          }
        }
        
        setShowBookingModal(false);
        
        // Auto-select the package for membership customers
        const pkg = packages.find(p => p.id === parseInt(bookingForm.package_id));
        if (pkg && membershipPkgForBooking) {
          handlePackageSelectForBooking(pkg);
        } else {
          setSelectedPackageForBooking(null);
        }
        
        alert(membershipPkgForBooking 
          ? 'Booking created! Click "CONFIRM BOOKING" to confirm.' 
          : 'Booking created successfully!'
        );
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create booking');
    } finally {
      setIsLoading(false);
    }
  };

  // Process payment directly from billing section
  const handleDirectPayment = async () => {
    if (!invoice) return;
    
    // Check if balance is already 0 (100% discount) - complete invoice directly
    if (invoice.balance_amount <= 0) {
      setIsLoading(true);
      try {
        const response = await axios.post(`/pos/invoices/${invoice.id}/complete`, {});
        
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
          
          alert('Payment completed successfully (100% discount applied)!');
          // Redirect to POS page
          router.visit('/pos');
        }
      } catch (error: any) {
        alert(error.response?.data?.message || 'Failed to complete payment');
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // For non-zero balance, check if payment can be processed
    if (!canProcessPayment()) return;
    
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

  // Filter customers by search (including membership customers)
  const filteredCustomers = customerSearchQuery 
    ? (() => {
        // Search in regular customers
        const matchedCustomers = customers.filter(c => 
          c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
          c.phone.includes(customerSearchQuery)
        );
        
        // Search in membership packages for customers not already in the list
        const membershipCustomers = membershipPackages
          .filter(mp => 
            mp.status === 'active' &&
            (mp.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
             mp.phone.includes(customerSearchQuery))
          )
          .map(mp => ({
            id: mp.id * -1, // Use negative ID to distinguish membership customers
            name: mp.name,
            phone: mp.phone,
            isMember: true
          }))
          .filter(mc => !matchedCustomers.some(c => c.phone === mc.phone)); // Avoid duplicates
        
        return [...matchedCustomers, ...membershipCustomers];
      })()
    : customers;

  // Combined list of all customers including membership customers (for dropdowns)
  const allCustomersWithMembership = (() => {
    const membershipOnlyCustomers = membershipPackages
      .filter(mp => mp.status === 'active')
      .map(mp => ({
        id: mp.id * -1, // Use negative ID to distinguish
        name: mp.name,
        phone: mp.phone,
        isMember: true
      }))
      .filter(mc => !customers.some(c => c.phone === mc.phone)); // Avoid duplicates
    
    return [...customers, ...membershipOnlyCustomers];
  })();

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
                  <div className="flex items-center gap-4 text-xs text-black">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-green-500"></span>
                      Available
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-red-500"></span>
                      Occupied
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                      Pending Pay
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                      Upcoming
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-6 gap-2">
                  {beds.map((bed) => {
                    // Check if this is a pending (unpaid) booking that can be billed
                    const isPendingBilling = bed.status === 'booked_soon' && 
                      bed.current_allocation && 
                      bed.current_allocation.payment_status === 'pending';
                    
                    return (
                      <button
                        key={bed.id}
                        onClick={() => handleBedClick(bed)}
                        disabled={bed.status === 'maintenance' || (bed.status === 'occupied')}
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
                                ? isPendingBilling
                                  ? 'bg-orange-100 hover:bg-orange-200 text-orange-800 cursor-pointer border-orange-300'
                                  : 'bg-yellow-100 text-yellow-800 cursor-not-allowed opacity-75'
                                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          }
                        `}
                      >
                        <div className="font-bold text-sm">{bed.bed_number}</div>
                        {bed.current_allocation && (
                          <div className="text-[10px] mt-1 truncate" title={bed.current_allocation.customer?.name}>
                            {isPendingBilling ? bed.current_allocation.customer?.name : bed.current_allocation.time_remaining}
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
                        {isPendingBilling && (
                          <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-[8px] px-1 py-0.5 rounded-full font-bold animate-pulse">
                            PAY
                          </div>
                        )}
                        {bed.status === 'booked_soon' && !isPendingBilling && bed.current_allocation && (
                          <div className="absolute -top-1 -right-1 bg-yellow-500 text-white text-[8px] px-1 py-0.5 rounded-full font-bold">
                            SOON
                          </div>
                        )}
                      </button>
                    );
                  })}
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
                    {packages.map((pkg) => {
                      // Check if this package is included in any of the customer's membership packages
                      const isInMembership = selectedCustomer && membershipPackages.some(membershipPkg => 
                        membershipPkg.phone === selectedCustomer.phone && 
                        membershipPkg.package.id === pkg.id && 
                        membershipPkg.status === 'active' &&
                        membershipPkg.remaining_sessions > 0
                      );
                      
                      return (
                        <button
                          key={pkg.id}
                          onClick={() => handlePackageSelectForBooking(pkg)}
                          className={`p-4 border-2 rounded-xl text-left transition-all group relative ${
                            selectedPackageForBooking?.id === pkg.id
                              ? 'border-teal-500 bg-teal-50'
                              : isInMembership
                                ? 'border-purple-300 bg-purple-50 hover:border-purple-500'
                                : 'border-yellow-200 hover:border-yellow-400 hover:bg-yellow-50'
                          }`}
                        >
                          {/* Membership badge */}
                          {isInMembership && (
                            <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                              💎 MEMBER
                            </div>
                          )}
                          
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className={`font-semibold ${
                                selectedPackageForBooking?.id === pkg.id
                                  ? 'text-teal-700'
                                  : isInMembership
                                    ? 'text-purple-700 group-hover:text-purple-800'
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
                              : isInMembership
                                ? 'text-purple-600'
                                : 'text-yellow-600'
                          }`}>
                            {isInMembership ? (
                              (() => {
                                const membershipPkg = membershipPackages.find(mp => 
                                  mp.phone === selectedCustomer?.phone && 
                                  mp.package.id === pkg.id && 
                                  mp.status === 'active'
                                );
                                return membershipPkg?.remaining_balance > 0 ? 'PARTIAL PAID' : 'FREE SESSION';
                              })()
                            ) : formatCurrency(pkg.price)}
                          </div>
                          {isInMembership && (
                            (() => {
                              const membershipPkg = membershipPackages.find(mp => 
                                mp.phone === selectedCustomer?.phone && 
                                mp.package.id === pkg.id && 
                                mp.status === 'active'
                              );
                              return (
                                <div className="mt-2 text-xs text-purple-600 font-medium">
                                  💎 {membershipPkg?.remaining_balance > 0 
                                    ? `Available in membership (Balance: ${formatCurrency(membershipPkg.remaining_balance)})` 
                                    : 'Available in membership (Fully Paid)'}
                                </div>
                              );
                            })()
                          )}
                          {selectedPackageForBooking?.id === pkg.id && (
                            <div className="mt-2 text-xs text-teal-600 font-medium">
                              ✓ Selected - Click a bed to assign
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {packages.length === 0 && (
                    <div className="py-12 text-center text-gray-500">
                      <ShoppingCartIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No packages available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Membership Packages Section - Pre-paid packages for existing members */}
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    💎 <span>Membership Packages</span>
                    <span className="text-xs text-gray-500 font-normal ml-2">Pre-paid packages - select a customer first</span>
                  </h2>
                </div>

                <div className="p-4">
                  {selectedCustomer ? (
                    (() => {
                      const customerPackages = membershipPackages.filter(pkg => {                        
                        return pkg.phone === selectedCustomer.phone && 
                               pkg.status === 'active' && 
                               pkg.remaining_sessions > 0;
                      });
                      
                      const totalBalance = customerPackages.reduce((sum, pkg) => sum + pkg.remaining_balance, 0);
                      const totalPaid = customerPackages.reduce((sum, pkg) => sum + (pkg.full_payment - pkg.remaining_balance), 0);
                      
                      return customerPackages.length > 0 ? (
                        <div>
                          {/* Payment Summary */}
                          {customerPackages.length > 0 && (
                            <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="text-center">
                                  <div className="text-green-600 font-bold text-lg">
                                    {formatCurrency(totalPaid)}
                                  </div>
                                  <div className="text-gray-600">Total Paid</div>
                                </div>
                                <div className="text-center">
                                  <div className={`font-bold text-lg ${totalBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                    {formatCurrency(totalBalance)}
                                  </div>
                                  <div className="text-gray-600">Remaining Balance</div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-2 gap-4">
                          {customerPackages.map((membershipPkg) => (
                            <button
                              key={membershipPkg.id}
                              onClick={() => {
                                // Auto-select the corresponding regular package
                                const correspondingPackage = packages.find(pkg => pkg.id === membershipPkg.package.id);
                                if (correspondingPackage) {
                                  setSelectedPackageForBooking(correspondingPackage);
                                  setSelectedMembershipPackage(membershipPkg);
                                }
                                
                                // Provide user feedback
                                alert(`Membership package "${membershipPkg.package.name}" selected! Now click on an available bed to create a FREE booking.`);
                              }}
                              className={`p-4 border-2 rounded-xl text-left transition-all group ${
                                selectedMembershipPackage?.id === membershipPkg.id
                                  ? 'border-purple-500 bg-purple-100 ring-2 ring-purple-300'
                                  : 'border-purple-200 hover:border-purple-400 hover:bg-purple-50'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-purple-700 group-hover:text-purple-800">
                                    {membershipPkg.package.name}
                                  </h3>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {membershipPkg.type === 'individual' ? '👤' : '🏢'} {membershipPkg.name}
                                  </p>
                                  <p className="text-xs text-gray-500 flex items-center mt-1">
                                    <ClockIcon className="w-3 h-3 mr-1" />
                                    {membershipPkg.package.duration_minutes} min
                                  </p>
                                  {/* Payment Status */}
                                  <div className="mt-2 text-xs">
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-500">Package Price:</span>
                                      <span className="font-medium text-gray-700">
                                        {formatCurrency(membershipPkg.full_payment)}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-green-600">Paid:</span>
                                      <span className="font-medium text-green-600">
                                        {formatCurrency(membershipPkg.full_payment - membershipPkg.remaining_balance)}
                                      </span>
                                    </div>
                                    {membershipPkg.remaining_balance > 0 && (
                                      <div className="flex items-center justify-between">
                                        <span className="text-orange-600">Balance:</span>
                                        <span className="font-medium text-orange-600">
                                          {formatCurrency(membershipPkg.remaining_balance)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 flex items-center justify-between">
                                <div className="text-sm">
                                  <span className="text-green-600 font-bold">
                                    {membershipPkg.remaining_sessions} sessions left
                                  </span>
                                  <span className="text-gray-500 text-xs block">
                                    of {membershipPkg.num_of_sessions} total
                                  </span>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-green-600">
                                    FREE SESSION
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {membershipPkg.remaining_balance > 0 ? 'Partial Payment' : 'Fully Paid'}
                                  </div>
                                  {membershipPkg.remaining_balance > 0 && (
                                    <div className="text-xs text-orange-600 font-medium mt-1">
                                      Balance: {formatCurrency(membershipPkg.remaining_balance)}
                                    </div>
                                  )}
                                </div>
                                {/* Selection indicator */}
                                {selectedMembershipPackage?.id === membershipPkg.id && (
                                  <div className="mt-2 text-xs text-purple-600 font-bold">
                                    ✓ SELECTED - Click a bed to create FREE booking
                                  </div>
                                )}
                              </div>
                            </button>
                          ))}
                          </div>
                        </div>
                      ) : (
                        <div className="py-8 text-center text-gray-400">
                          <span className="text-4xl">💎</span>
                          <p className="text-sm mt-2">No active membership packages</p>
                          <p className="text-xs mt-1">Customer has no pre-paid sessions available</p>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <span className="text-4xl">👤</span>
                      <p className="text-sm mt-2">Select a customer first</p>
                      <p className="text-xs mt-1">Choose a customer to see their membership packages</p>
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
                        setCustomerForm({ name: '', phone: '', phone_2: '', email: '', nic: '', address: '', age: '', dob: '', description: '' });
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
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">{customer.name}</span>
                                {'isMember' in customer && customer.isMember && (
                                  <Badge className="bg-purple-100 text-purple-700 text-xs">MEMBER</Badge>
                                )}
                              </div>
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
                  {/* Membership Package Info - Show if membership selected WITHOUT payment fields */}
                  {selectedMembershipPackage ? (
                    <div className="text-center p-6 bg-purple-50 border-2 border-purple-300 rounded-lg">
                      <div className="text-4xl mb-3">💎</div>
                      <h3 className="font-bold text-purple-800 text-xl mb-2">Membership Package</h3>
                      <p className="text-purple-700 font-semibold text-lg mb-2">{selectedMembershipPackage.package.name}</p>
                      <p className="text-sm text-gray-600 mb-3">
                        {selectedMembershipPackage.remaining_sessions} sessions remaining
                      </p>
                      <div className="bg-green-100 border border-green-300 rounded-lg py-3 px-4 mb-3">
                        <p className="text-2xl font-bold text-green-700">FREE SESSION</p>
                        <p className="text-xs text-gray-600 mt-1">Pre-paid membership - No payment required</p>
                      </div>
                      
                      {/* Customer Info */}
                      {selectedCustomer && (
                        <div className="mt-4 p-3 bg-white rounded-lg text-left">
                          <p className="text-sm text-gray-600">Customer</p>
                          <p className="font-semibold text-gray-900">{selectedCustomer.name}</p>
                          <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>
                        </div>
                      )}
                      
                      {/* Selected Bed Info */}
                      {selectedBed && (
                        <div className="mt-3 p-3 bg-white rounded-lg text-left">
                          <p className="text-sm text-gray-600">Bed</p>
                          <p className="font-semibold text-gray-900">Bed {selectedBed.bed_number}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Regular Payment Flow - Show only for non-membership customers */}
                      <div className="space-y-3">
                        {/* Subtotal */}
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-900 font-medium">Subtotal</span>
                          <span className="font-semibold text-gray-900">{formatCurrency(invoice?.subtotal || 0)}</span>
                        </div>

                        {/* Discount */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-900 font-medium w-24">Discount</span>
                          <div className="flex-1 flex items-center gap-1">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={discountPercent || ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                if (val >= 0 && val <= 100) {
                                  setDiscountPercent(val);
                                }
                              }}
                              onBlur={handleUpdateInvoice}
                              placeholder="0"
                              className="h-8 text-sm text-gray-900"
                            />
                            <span className="text-sm text-gray-600 whitespace-nowrap">%</span>
                          </div>
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
                      </div>

                      {/* Advance Payment Display - Show if booking has advance payment */}
                      {invoice && invoice.allocation && loadedBooking && loadedBooking.advance_paid && loadedBooking.advance_paid > 0 && (
                        <div className="pt-3 border-t border-dashed border-blue-300 bg-blue-50 -mx-4 px-4 py-3 rounded-lg">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-blue-700 font-medium">📌 Original Package Price</span>
                              <span className="font-semibold text-blue-900">{formatCurrency(loadedBooking.total_amount || 0)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-green-600 font-medium">✓ Advance Paid</span>
                              <span className="font-semibold text-green-600">-{formatCurrency(loadedBooking.advance_paid)}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-blue-200">
                              <span className="font-bold text-blue-900">Balance to Pay</span>
                              <span className="font-bold text-orange-600">{formatCurrency(loadedBooking.balance_amount || 0)}</span>
                            </div>
                          </div>
                        </div>
                      )}

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
                    </>
                  )}

                    {/* Action Buttons */}
                    <div className="mt-4 space-y-2">
                      {selectedMembershipPackage ? (
                        <>
                          {/* Membership Customer - Confirm Booking Button */}
                          {(!invoice || invoice.payment_status !== 'paid') && selectedBed && (
                            <Button
                              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-base font-semibold"
                              disabled={!selectedBed || !selectedCustomer || !selectedMembershipPackage || !invoice || isLoading}
                              onClick={async () => {
                                if (!invoice || !selectedCustomer || !selectedMembershipPackage) return;
                                
                                setIsLoading(true);
                                try {
                                  // Complete the existing invoice (session will be deducted)
                                  const completeResponse = await axios.post(`/pos/invoices/${invoice.id}/complete`, {});
                                  
                                  if (completeResponse.data.success) {
                                    setInvoice(completeResponse.data.invoice);
                                    // Update beds if returned
                                    if (completeResponse.data.beds) {
                                      setBeds(completeResponse.data.beds);
                                      if (selectedBed) {
                                        const updBed = completeResponse.data.beds.find((b: Bed) => b.id === selectedBed.id);
                                        if (updBed) setSelectedBed(updBed);
                                      }
                                    }
                                    alert('Membership booking confirmed! Session deducted.');
                                  }
                                } catch (error: any) {
                                  alert(error.response?.data?.message || 'Failed to confirm booking');
                                } finally {
                                  setIsLoading(false);
                                }
                              }}
                            >
                              {isLoading ? (
                                'Processing...'
                              ) : (
                                <>
                                  <CheckCircleIcon className="w-5 h-5 mr-2" />
                                  CONFIRM BOOKING
                                </>
                              )}
                            </Button>
                          )}

                          {/* Print Bill Button - Only enabled after confirmation */}
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
                            {invoice?.payment_status === 'paid' ? 'PRINT BILL' : 'Confirm First to Print'}
                          </Button>
                        </>
                      ) : (
                        <>
                          {/* Regular Customer - Confirm Payment Button */}
                          {invoice && invoice.payment_status !== 'paid' && (
                            <Button
                              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 text-base font-semibold"
                              disabled={!invoice || invoice.subtotal === 0 || (invoice.balance_amount > 0 && !canProcessPayment()) || isLoading}
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
                        </>
                      )}
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Search Modal - Enhanced for booking-to-billing workflow */}
      <Dialog open={showBookingSearch} onOpenChange={setShowBookingSearch}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Find Booking for Billing</DialogTitle>
            <DialogDescription>
              Search for a booking by booking number, customer name, or phone number.
              <span className="block mt-1 text-teal-600 font-medium">
                Pending (unpaid) bookings are shown first for quick billing.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search by booking number, customer name or phone..."
                value={bookingSearchQuery}
                onChange={(e) => setBookingSearchQuery(e.target.value)}
                className="pl-10 text-lg"
                autoFocus
              />
            </div>
            <div className="max-h-[400px] overflow-y-auto space-y-3">
              {searchResults.length === 0 && bookingSearchQuery.length >= 2 && (
                <p className="text-center text-gray-500 py-8">No bookings found matching your search</p>
              )}
              {bookingSearchQuery.length < 2 && (
                <p className="text-center text-gray-400 py-8">Enter at least 2 characters to search</p>
              )}
              {searchResults.map((booking) => (
                <button
                  key={booking.id}
                  className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                    booking.payment_status === 'pending' 
                      ? 'border-orange-300 bg-orange-50 hover:border-orange-500 hover:bg-orange-100' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => handleSelectBooking(booking)}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-lg text-teal-700">{booking.booking_number}</span>
                        <Badge className={
                          booking.payment_status === 'pending' 
                            ? 'bg-orange-500 text-white animate-pulse' 
                            : 'bg-green-100 text-green-700'
                        }>
                          {booking.payment_status === 'pending' ? '💳 AWAITING PAYMENT' : '✓ Paid'}
                        </Badge>
                        {booking.advance_paid && booking.advance_paid > 0 && (
                          <Badge className="bg-blue-100 text-blue-700">
                            Advance Paid
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Customer:</span>
                          <span className="ml-2 font-medium text-gray-900">{booking.customer.name}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Phone:</span>
                          <span className="ml-2 text-gray-700">{booking.customer.phone}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Package:</span>
                          <span className="ml-2 font-medium text-gray-900">{booking.package.name}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Bed:</span>
                          <span className="ml-2 font-medium text-teal-600">{booking.bed.bed_number}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Time:</span>
                          <span className="ml-2 text-gray-700">
                            {formatTimeRange(booking.start_time, booking.end_time)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Date:</span>
                          <span className="ml-2 text-gray-700">
                            {formatDisplayDate(booking.start_time)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-teal-600">
                        {new Intl.NumberFormat('en-LK', { style: 'decimal', minimumFractionDigits: 2 }).format(booking.package.price)} LKR
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {booking.package.duration_minutes} min
                      </div>
                      {booking.advance_paid && booking.advance_paid > 0 && (
                        <div className="mt-2 space-y-1">
                          <div className="text-xs text-blue-600">
                            Advance: {new Intl.NumberFormat('en-LK', { style: 'decimal', minimumFractionDigits: 2 }).format(booking.advance_paid)} LKR
                          </div>
                          <div className="text-sm font-bold text-orange-600">
                            Balance: {new Intl.NumberFormat('en-LK', { style: 'decimal', minimumFractionDigits: 2 }).format(booking.balance_amount || 0)} LKR
                          </div>
                        </div>
                      )}
                      {booking.payment_status === 'pending' && (
                        <div className="mt-2 px-3 py-1 bg-orange-500 text-white text-xs font-semibold rounded-full">
                          Click to Bill
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Customer Modal - Responsive */}
<Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
  <DialogContent className="max-w-[95vw] sm:max-w-lg md:max-w-xl p-0 bg-white rounded-lg mx-2 sm:mx-0">
    <DialogHeader className="flex items-center gap-3 p-4 sm:p-6 pb-4 border-b border-gray-100">
      <div className="flex items-center gap-3 w-full">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-teal-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <DialogTitle className="text-base sm:text-lg font-semibold text-gray-900">Add New Customer</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-gray-600 mt-0.5">
            Create a new customer profile with their contact information.
          </DialogDescription>
        </div>
      </div>
    </DialogHeader>

      {/* Form */}
      <div className="px-4 sm:px-6 pb-4 sm:pb-6 bg-white overflow-y-auto max-h-[70vh] sm:max-h-[80vh]">
        <div className="space-y-4 sm:space-y-5">
          <div>
            <Label htmlFor="modal_name" className="text-sm font-medium text-gray-700 mb-1 sm:mb-2 block">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="modal_name"
              type="text"
              placeholder="Enter customer name"
              value={customerForm.name}
              onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
              required
              className="w-full h-10 sm:h-11 px-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm bg-white placeholder:text-gray-500 text-gray-900"
            />
          </div>

          <div>
            <Label htmlFor="modal_phone" className="text-sm font-medium text-gray-700 mb-1 sm:mb-2 block">
              Phone <span className="text-red-500">*</span>
            </Label>
            <Input
              id="modal_phone"
              type="text"
              placeholder="Enter 10-digit phone number"
              value={customerForm.phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                if (val.length <= 10) {
                  setCustomerForm({ ...customerForm, phone: val });
                }
              }}
              required
              maxLength={10}
              className="w-full h-10 sm:h-11 px-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm bg-white placeholder:text-gray-500 text-gray-900"
            />
            {customerForm.phone && customerForm.phone.length !== 10 && (
              <p className="text-red-500 text-xs mt-1">Phone number must be exactly 10 digits</p>
            )}
            {customerForm.phone && customerForm.phone.length > 0 && (
              <p className="text-gray-500 text-xs mt-1">{customerForm.phone.length}/10 digits</p>
            )}
          </div>

          <div>
            <Label htmlFor="modal_phone_2" className="text-sm font-medium text-gray-700 mb-1 sm:mb-2 block">
              Phone 2 (Optional)
            </Label>
            <Input
              id="modal_phone_2"
              type="text"
              placeholder="Enter 10-digit second phone number"
              value={customerForm.phone_2 || ''}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                if (val.length <= 10) {
                  setCustomerForm({ ...customerForm, phone_2: val });
                }
              }}
              maxLength={10}
              className="w-full h-10 sm:h-11 px-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm bg-white placeholder:text-gray-500 text-gray-900"
            />
            {customerForm.phone_2 && customerForm.phone_2.length > 0 && customerForm.phone_2.length !== 10 && (
              <p className="text-red-500 text-xs mt-1">Phone number must be exactly 10 digits</p>
            )}
            {customerForm.phone_2 && customerForm.phone_2.length > 0 && (
              <p className="text-gray-500 text-xs mt-1">{customerForm.phone_2.length}/10 digits</p>
            )}
          </div>


          <div>
            <Label htmlFor="modal_email" className="text-sm font-medium text-gray-700 mb-1 sm:mb-2 block">
              Email (Optional)
            </Label>
            <Input
              id="modal_email"
              type="email"
              placeholder="Enter email address"
              value={customerForm.email}
              onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
              className="w-full h-10 sm:h-11 px-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm bg-white placeholder:text-gray-500 text-gray-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <Label htmlFor="modal_nic" className="text-sm font-medium text-gray-700 mb-1 sm:mb-2 block">
                NIC
              </Label>
              <Input
                id="modal_nic"
                type="text"
                placeholder="Enter NIC number"
                value={customerForm.nic || ''}
                onChange={(e) => setCustomerForm({ ...customerForm, nic: e.target.value })}
                className="w-full h-10 sm:h-11 px-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm bg-white placeholder:text-gray-500 text-gray-900"
              />
            </div>

            <div>
              <Label htmlFor="modal_age" className="text-sm font-medium text-gray-700 mb-1 sm:mb-2 block">
                Age
              </Label>
              <Input
                id="modal_age"
                type="number"
                min="0"
                placeholder="Enter age"
                value={customerForm.age || ''}
                onChange={(e) => setCustomerForm({ ...customerForm, age: e.target.value.replace(/\D/g, '') })}
                className="w-full h-10 sm:h-11 px-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm bg-white placeholder:text-gray-500 text-gray-900"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="modal_address" className="text-sm font-medium text-gray-700 mb-1 sm:mb-2 block">
              Address
            </Label>
            <Input
              id="modal_address"
              type="text"
              placeholder="Enter address"
              value={customerForm.address || ''}
              onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
              className="w-full h-10 sm:h-11 px-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm bg-white placeholder:text-gray-500 text-gray-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <Label htmlFor="modal_dob" className="text-sm font-medium text-gray-700 mb-1 sm:mb-2 block">
                Date of Birth
              </Label>
              <Input
                id="modal_dob"
                type="date"
                placeholder="Select date of birth"
                value={customerForm.dob || ''}
                onChange={(e) => setCustomerForm({ ...customerForm, dob: e.target.value })}
                className="w-full h-10 sm:h-11 px-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm bg-white placeholder:text-gray-500 text-gray-900"
              />
            </div>

            <div>
              <Label htmlFor="modal_description" className="text-sm font-medium text-gray-700 mb-1 sm:mb-2 block">
                Description
              </Label>
              <Input
                id="modal_description"
                type="text"
                placeholder="Enter description"
                value={customerForm.description || ''}
                onChange={(e) => setCustomerForm({ ...customerForm, description: e.target.value })}
                className="w-full h-10 sm:h-11 px-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm bg-white placeholder:text-gray-500 text-gray-900"
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowCustomerModal(false)}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 font-medium order-2 sm:order-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateCustomer}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
          >
            {isLoading ? 'Saving...' : 'Save Customer'}
          </Button>
        </div>
      </div>
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
                    {allCustomersWithMembership.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name} - {customer.phone} {'isMember' in customer && customer.isMember ? '💎' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBookingModal(false);
                    setCustomerForm({ name: '', phone: '', phone_2: '', email: '', nic: '', address: '', age: '', dob: '', description: '' });
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
                  min={getCurrentSriLankaDateString()}
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
                  // Calculate end time using simple arithmetic (no timezone conversion)
                  const [hours, minutes] = bookingForm.start_time.split(':').map(Number);
                  const totalMinutes = hours * 60 + minutes + selectedPackageForBooking.duration_minutes;
                  const endHours = Math.floor(totalMinutes / 60) % 24;
                  const endMinutes = totalMinutes % 60;
                  const endTimeStr = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
                  
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
