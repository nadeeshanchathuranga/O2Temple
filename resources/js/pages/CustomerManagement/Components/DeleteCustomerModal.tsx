import React from 'react';
import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

interface DeleteCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

const DeleteCustomerModal: React.FC<DeleteCustomerModalProps> = ({ open, onOpenChange, customer }) => {
  const { delete: deleteCustomer, processing } = useForm();

  const handleDelete = () => {
    if (customer) {
      deleteCustomer(`/customers/${customer.id}`, {
        onSuccess: () => {
          onOpenChange(false);
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 bg-white">
        <div className="relative bg-white rounded-lg">
          {/* Header */}
          <div className="flex items-center gap-3 p-6 pb-4">
            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
              <ExclamationTriangleIcon className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Delete Customer</h2>
            <button 
              onClick={() => onOpenChange(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Content */}
          <div className="px-6 pb-6 bg-white">
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete this customer?
              </p>
              {customer && (
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <p className="font-medium text-gray-900">{customer.name}</p>
                  <p className="text-sm text-gray-600">{customer.phone}</p>
                  {customer.email && (
                    <p className="text-sm text-gray-600">{customer.email}</p>
                  )}
                </div>
              )}
              <p className="text-sm text-red-600 mt-3">
                This action cannot be undone. The customer will be permanently removed from the system.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3">
              <Button 
                type="button" 
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="px-6 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 font-medium"
              >
                Cancel
              </Button>
              <Button 
                type="button"
                onClick={handleDelete}
                disabled={processing} 
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium"
              >
                {processing ? 'Deleting...' : 'Delete Customer'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteCustomerModal;