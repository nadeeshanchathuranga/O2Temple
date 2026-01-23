import React from 'react';
import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Bed {
  id: number;
  bed_number: string;
  status: 'available' | 'occupied' | 'maintenance';
  created_at: string;
  updated_at: string;
}

interface DeleteBedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bed: Bed | null;
  onSuccess: () => void;
}

const DeleteBedModal: React.FC<DeleteBedModalProps> = ({ open, onOpenChange, bed, onSuccess }) => {
  const { delete: deleteBed, processing } = useForm();

  const handleDelete = () => {
    if (bed) {
      deleteBed(`/beds/${bed.id}`, {
        onSuccess: () => {
          onSuccess();
          onOpenChange(false);
        },
      });
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'occupied':
        return 'bg-blue-100 text-blue-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
            <h2 className="text-lg font-semibold text-gray-900">Delete Bed</h2>
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
              <p className="text-gray-700 mb-3">
                Are you sure you want to delete this bed?
              </p>
              {bed && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="font-medium text-gray-900 mb-2">{bed.bed_number}</p>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getStatusBadgeColor(
                      bed.status
                    )}`}
                  >
                    {bed.status.charAt(0).toUpperCase() + bed.status.slice(1)}
                  </span>
                </div>
              )}
              <p className="text-sm text-red-600 mt-4">
                This action cannot be undone. The bed will be permanently removed from the system.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-gray-900 focus:ring-2 focus:ring-gray-200"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDelete}
                disabled={processing}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white"
              >
                {processing ? 'Deleting...' : 'Delete Bed'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteBedModal;
