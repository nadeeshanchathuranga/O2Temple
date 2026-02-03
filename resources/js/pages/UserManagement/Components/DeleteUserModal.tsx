import React from 'react';
import { useForm } from '@inertiajs/react';
import { AlertTriangle, User, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface User {
  id: number;
  name: string;
  email: string;
  role: {
    id: number;
    name: string;
  };
}

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

export default function DeleteUserModal({ isOpen, onClose, user }: DeleteUserModalProps) {
  const { delete: deleteUser, processing } = useForm();

  const handleDelete = () => {
    deleteUser(`/users/${user.id}`, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  const getRoleBadgeClass = (roleName: string) => {
    const classes: Record<string, string> = {
      Admin: 'bg-red-100 text-red-700',
      Cashier: 'bg-blue-100 text-blue-700',
      Staff: 'bg-green-100 text-green-700',
    };
    return classes[roleName] || 'bg-gray-100 text-gray-700';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Delete User
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the user account.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* User Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-lg">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="ml-4 flex-1">
                <div className="font-medium text-gray-900">{user.name}</div>
                <div className="text-sm text-gray-500">{user.email}</div>
                <div className="mt-1">
                  <Badge className={getRoleBadgeClass(user.role.name)}>
                    <Shield className="w-3 h-3 mr-1" />
                    {user.role.name}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Warning Message */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <p className="font-medium mb-1">Warning!</p>
                <p>
                  Deleting this user will permanently remove their account and access to the system.
                  This action cannot be undone.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={processing}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {processing ? 'Deleting...' : 'Delete User'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}