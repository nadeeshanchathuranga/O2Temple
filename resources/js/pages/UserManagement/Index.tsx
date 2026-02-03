import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { Plus, Search, Edit, Trash2, Shield, Mail, Calendar, UserCheck, UserX } from 'lucide-react';
import HeaderLayout from '@/layouts/header-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CreateUserModal from './Components/CreateUserModal';
import EditUserModal from './Components/EditUserModal';
import DeleteUserModal from './Components/DeleteUserModal';

interface User {
  id: number;
  name: string;
  email: string;
  role: {
    id: number;
    name: string;
  };
  email_verified_at: string | null;
  created_at: string;
}

interface Role {
  id: number;
  name: string;
}

interface UserManagementProps {
  users: {
    data: User[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  roles: Role[];
}

export default function UserManagement({ users, roles }: UserManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const filteredUsers = users.data.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeClass = (roleName: string) => {
    const classes: Record<string, string> = {
      Admin: 'bg-red-100 text-red-700',
      Cashier: 'bg-blue-100 text-blue-700',
      Staff: 'bg-green-100 text-green-700',
    };
    return classes[roleName] || 'bg-gray-100 text-gray-700';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  return (
    <HeaderLayout>
      <Head title="User Management" />
      
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
              <p className="text-gray-600">Manage system users, roles and permissions</p>
            </div>
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search users by name, email, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-semibold">
                                  {user.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500 flex items-center">
                                <Mail className="w-3 h-3 mr-1" />
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={getRoleBadgeClass(user.role.name)}>
                            <Shield className="w-3 h-3 mr-1" />
                            {user.role.name}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          {user.email_verified_at ? (
                            <Badge className="bg-green-100 text-green-700">
                              <UserCheck className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-700">
                              <UserX className="w-3 h-3 mr-1" />
                              Unverified
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatDate(user.created_at)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(user)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(user)}
                            className="text-red-600 hover:text-red-700 hover:border-red-300"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {users.last_page > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Showing {((users.current_page - 1) * users.per_page) + 1} to {Math.min(users.current_page * users.per_page, users.total)} of {users.total} users
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={users.current_page === 1}
                      onClick={() => {
                        const params = new URLSearchParams(window.location.search);
                        params.set('page', (users.current_page - 1).toString());
                        router.get(`/users?${params.toString()}`);
                      }}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-500">
                      Page {users.current_page} of {users.last_page}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={users.current_page === users.last_page}
                      onClick={() => {
                        const params = new URLSearchParams(window.location.search);
                        params.set('page', (users.current_page + 1).toString());
                        router.get(`/users?${params.toString()}`);
                      }}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        roles={roles}
      />

      {selectedUser && (
        <>
          <EditUserModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedUser(null);
            }}
            user={selectedUser}
            roles={roles}
          />

          <DeleteUserModal
            isOpen={isDeleteModalOpen}
            onClose={() => {
              setIsDeleteModalOpen(false);
              setSelectedUser(null);
            }}
            user={selectedUser}
          />
        </>
      )}
    </HeaderLayout>
  );
}