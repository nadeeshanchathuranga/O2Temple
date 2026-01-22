import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import CreateCustomerModal from './CreateCustomerModal';
import EditCustomerModal from './EditCustomerModal';
import DeleteCustomerModal from './DeleteCustomerModal';

interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

interface Props {
  customers: {
    data: Customer[];
    links: any;
    meta: any;
  };
  filters: {
    search?: string;
    active_only: boolean;
  };
}

const CustomerManagement: React.FC<Props> = ({ customers, filters }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Search form
  const { data: searchData, setData: setSearchData } = useForm({
    search: filters.search || '',
    active_only: filters.active_only,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.get('/customers', searchData, {
      preserveState: true,
      preserveScroll: true,
    });
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowEditModal(true);
  };

  const handleDelete = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowDeleteModal(true);
  };

  return (
    <>
      <Head title="Customer Management" />
      
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
              
              <img 
                src="/jaanNetworklogo.jpeg" 
                alt="JAAN Network" 
                className="h-8 w-auto object-contain"
              />
              
              <h1 className="text-xl font-semibold text-gray-900">Customer Management</h1>
            </div>
            
            <div className="px-3 py-1.5 bg-teal-500 text-white rounded-lg text-sm font-medium">
              Customers
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm">
            {/* Controls Bar */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="active_only"
                    checked={searchData.active_only}
                    onCheckedChange={(checked) => setSearchData('active_only', checked as boolean)}
                  />
                  <Label htmlFor="active_only" className="text-sm text-gray-700">Active only</Label>
                </div>
                
                <form onSubmit={handleSearch} className="flex items-center gap-2">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      type="text"
                      placeholder="Search customers..."
                      value={searchData.search}
                      onChange={(e) => setSearchData('search', e.target.value)}
                      className="pl-10 w-80 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                    />
                  </div>
                </form>
              </div>

              <Button 
                className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-medium"
                onClick={() => setShowCreateModal(true)}
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                New Customer
              </Button>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-5 gap-6 px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">NAME</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">PHONE</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">EMAIL</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">JOINED</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ACTIONS</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200">
              {customers.data.map((customer) => (
                <div key={customer.id} className="grid grid-cols-5 gap-6 px-6 py-4 items-center hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                      <span className="text-teal-600 font-medium text-sm">
                        {customer.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">{customer.name}</span>
                  </div>
                  <div className="text-gray-700">{customer.phone}</div>
                  <div className="text-gray-700">{customer.email || 'None'}</div>
                  <div className="text-gray-700">{new Date(customer.created_at).toLocaleDateString()}</div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(customer)}
                      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(customer)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {customers.data.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
                <p className="text-gray-500">Get started by adding your first customer.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateCustomerModal 
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
      
      <EditCustomerModal 
        open={showEditModal}
        onOpenChange={setShowEditModal}
        customer={editingCustomer}
      />
      
      <DeleteCustomerModal 
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        customer={editingCustomer}
      />
    </>
  );
};

export default CustomerManagement;