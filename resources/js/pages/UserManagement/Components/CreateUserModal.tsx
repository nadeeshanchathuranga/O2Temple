import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { X, User, Mail, Lock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Role {
  id: number;
  name: string;
}

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  roles: Role[];
}

export default function CreateUserModal({ isOpen, onClose, roles }: CreateUserModalProps) {
  const { data, setData, post, processing, errors, reset } = useForm({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role_id: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/users', {
      onSuccess: () => {
        reset();
        onClose();
      }
    });
  };

  const handleClose = () => {
    reset();
    onClose();
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
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Create New User
          </DialogTitle>
          <DialogDescription>
            Add a new user to the system with appropriate role and permissions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                name="name"
                id="name"
                value={data.name || ''}
                onChange={(e) => setData('name', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500"
                placeholder="Enter full name"
                autoComplete="name"
                disabled={processing}
                style={{ color: '#111827', backgroundColor: '#ffffff' }}
                required
              />
            </div>
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="email"
                name="email"
                id="email"
                value={data.email || ''}
                onChange={(e) => setData('email', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500"
                placeholder="Enter email address"
                autoComplete="email"
                disabled={processing}
                style={{ color: '#111827', backgroundColor: '#ffffff' }}
                required
              />
            </div>
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="password"
                name="password"
                id="password"
                value={data.password || ''}
                onChange={(e) => setData('password', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500"
                placeholder="Enter password"
                autoComplete="new-password"
                disabled={processing}
                style={{ color: '#111827', backgroundColor: '#ffffff' }}
                required
              />
            </div>
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="password"
                name="password_confirmation"
                id="password_confirmation"
                value={data.password_confirmation || ''}
                onChange={(e) => setData('password_confirmation', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500"
                placeholder="Confirm password"
                autoComplete="new-password"
                disabled={processing}
                style={{ color: '#111827', backgroundColor: '#ffffff' }}
                required
              />
            </div>
            {errors.password_confirmation && <p className="text-red-500 text-sm mt-1">{errors.password_confirmation}</p>}
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <div className="grid grid-cols-1 gap-2">
              {roles.map((role) => (
                <label
                  key={role.id}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    data.role_id === role.id.toString()
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="role_id"
                    value={role.id}
                    checked={data.role_id === role.id.toString()}
                    onChange={(e) => setData('role_id', e.target.value)}
                    className="sr-only"
                  />
                  <Shield className="w-4 h-4 mr-3 text-gray-400" />
                  <div className="flex-1">
                    <Badge className={getRoleBadgeClass(role.name)}>
                      {role.name}
                    </Badge>
                  </div>
                  {data.role_id === role.id.toString() && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </label>
              ))}
            </div>
            {errors.role_id && <p className="text-red-500 text-sm mt-1">{errors.role_id}</p>}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={processing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {processing ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}