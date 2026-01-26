import React from 'react';
import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

interface CreateCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateCustomerModal: React.FC<CreateCustomerModalProps> = ({ open, onOpenChange }) => {
  const { data, setData, post, processing, errors, reset } = useForm({
    name: '',
    phone: '',
    email: '',
    nic: '',
    address: '',
    age: '',
    dob: '',
    description: '',
  });

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 10) { // Limit to 10 digits
      setData('phone', value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Phone validation: must be exactly 10 digits
    if (data.phone.length !== 10) {
      return; // Let HTML required handle empty field, but prevent submission for invalid length
    }

    post('/customers', {
      onSuccess: () => {
        onOpenChange(false);
        reset();
      },
    });
  };

  // Reset form when modal closes
  React.useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  // Optionally, add client-side validation for new fields if needed

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 bg-white">
        <div className="relative bg-white rounded-lg">
          {/* Header */}
          <div className="flex items-center gap-3 p-6 pb-4 border-b border-gray-100">
            <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Create Customer</h2>
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 pb-6 bg-white">
            <div className="space-y-5 mt-4">
              
              <div>
                <Label htmlFor="create_name" className="text-sm font-medium text-gray-700 mb-2 block">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="create_name"
                  type="text"
                  placeholder="Enter customer name"
                  value={data.name}
                  onChange={(e) => setData('name', e.target.value)}
                  required
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm bg-white placeholder:text-gray-500 text-gray-900"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="create_phone" className="text-sm font-medium text-gray-700 mb-2 block">
                  Phone <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="create_phone"
                  type="text"
                  placeholder="Enter 10-digit phone number"
                  value={data.phone}
                  onChange={handlePhoneChange}
                  required
                  maxLength={10}
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm bg-white placeholder:text-gray-500 text-gray-900"
                />
                {errors.phone && (
                  <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                )}
                {data.phone && data.phone.length !== 10 && (
                  <p className="text-red-500 text-xs mt-1">Phone number must be exactly 10 digits</p>
                )}
                {data.phone && data.phone.length > 0 && (
                  <p className="text-gray-500 text-xs mt-1">{data.phone.length}/10 digits</p>
                )}
              </div>

              <div>
                <Label htmlFor="create_email" className="text-sm font-medium text-gray-700 mb-2 block">
                  Email
                </Label>
                <Input
                  id="create_email"
                  type="email"
                  placeholder="Enter email address"
                  value={data.email}
                  onChange={(e) => setData('email', e.target.value)}
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm bg-white placeholder:text-gray-500 text-gray-900"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>
              <div>
                <Label htmlFor="create_nic" className="text-sm font-medium text-gray-700 mb-2 block">
                  NIC
                </Label>
                <Input
                  id="create_nic"
                  type="text"
                  placeholder="Enter NIC number"
                  value={data.nic}
                  onChange={e => setData('nic', e.target.value)}
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm bg-white placeholder:text-gray-500 text-gray-900"
                />
                {errors.nic && (
                  <p className="text-red-500 text-xs mt-1">{errors.nic}</p>
                )}
              </div>

              <div>
                <Label htmlFor="create_address" className="text-sm font-medium text-gray-700 mb-2 block">
                  Address
                </Label>
                <Input
                  id="create_address"
                  type="text"
                  placeholder="Enter address"
                  value={data.address}
                  onChange={e => setData('address', e.target.value)}
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm bg-white placeholder:text-gray-500 text-gray-900"
                />
                {errors.address && (
                  <p className="text-red-500 text-xs mt-1">{errors.address}</p>
                )}
              </div>

              <div>
                <Label htmlFor="create_age" className="text-sm font-medium text-gray-700 mb-2 block">
                  Age
                </Label>
                <Input
                  id="create_age"
                  type="number"
                  min="0"
                  placeholder="Enter age"
                  value={data.age}
                  onChange={e => setData('age', e.target.value.replace(/\D/g, ''))}
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm bg-white placeholder:text-gray-500 text-gray-900"
                />
                {errors.age && (
                  <p className="text-red-500 text-xs mt-1">{errors.age}</p>
                )}
              </div>

              <div>
                <Label htmlFor="create_dob" className="text-sm font-medium text-gray-700 mb-2 block">
                  Date of Birth
                </Label>
                <Input
                  id="create_dob"
                  type="date"
                  placeholder="Select date of birth"
                  value={data.dob}
                  onChange={e => setData('dob', e.target.value)}
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm bg-white placeholder:text-gray-500 text-gray-900"
                />
                {errors.dob && (
                  <p className="text-red-500 text-xs mt-1">{errors.dob}</p>
                )}
              </div>

              <div>
                <Label htmlFor="create_description" className="text-sm font-medium text-gray-700 mb-2 block">
                  Description
                </Label>
                <Input
                  id="create_description"
                  type="text"
                  placeholder="Enter description"
                  value={data.description}
                  onChange={e => setData('description', e.target.value)}
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm bg-white placeholder:text-gray-500 text-gray-900"
                />
                {errors.description && (
                  <p className="text-red-500 text-xs mt-1">{errors.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="create_active"
                  defaultChecked={true}
                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 bg-white"
                />
                <Label htmlFor="create_active" className="text-sm font-medium text-gray-700">
                  Active
                </Label>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="px-6 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 font-medium"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={processing || (data.phone && data.phone.length !== 10)}
                className="px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Customer
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCustomerModal;
