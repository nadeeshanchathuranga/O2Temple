import React from 'react';
import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
// using native select for status to avoid rendering raw select HTML

interface CreateBedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (bed: any) => void;
}

const CreateBedModal: React.FC<CreateBedModalProps> = ({ open, onOpenChange, onSuccess }) => {
  const { data, setData, post, processing, errors, reset } = useForm({
    bed_number: '',
    status: 'available',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    post('/beds', {
      onSuccess: (response: any) => {
        onSuccess(response.props?.bed || data);
        onOpenChange(false);
        reset();
      },
      onError: (errors) => {
        // Errors are automatically handled by Inertia and displayed in the form
        console.log('Validation errors:', errors);
      },
    });
  };

  React.useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 bg-white">
        <div className="relative bg-white rounded-lg">
          {/* Header */}
          <div className="flex items-center gap-3 p-6 pb-4 border-b border-gray-100">
            <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.5 1.5H3.75A2.25 2.25 0 001.5 3.75v12.5A2.25 2.25 0 003.75 18.5h12.5a2.25 2.25 0 002.25-2.25V9.5M10.5 1.5v4.5m0-4.5L6 6m4.5-4.5L15 6" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Create Bed</h2>
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
                <Label htmlFor="bed_number" className="text-sm font-medium text-gray-700 mb-2 block">
                  Seat Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="bed_number"
                  type="text"
                  placeholder="e.g., SEAT-001, Room A1"
                  value={data.bed_number}
                  onChange={(e) => setData('bed_number', e.target.value)}
                  required
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm bg-white placeholder:text-gray-500 text-gray-900"
                />
                {errors.bed_number && (
                  <p className="text-red-500 text-xs mt-1">{errors.bed_number}</p>
                )}
              </div>

              <div>
                <Label htmlFor="status" className="text-sm font-medium text-gray-700 mb-2 block">
                  Status <span className="text-red-500">*</span>
                </Label>
                <select
                  id="status"
                  value={data.status}
                  onChange={(e) => setData('status', e.target.value as 'available' | 'occupied' | 'maintenance')}
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm bg-white text-gray-900"
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="maintenance">Maintenance</option>
                </select>
                {errors.status && (
                  <p className="text-red-500 text-xs mt-1">{errors.status}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-6 mt-6 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-gray-900 focus:ring-2 focus:ring-gray-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={processing}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white"
              >
                {processing ? 'Creating...' : 'Create Bed'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateBedModal;
