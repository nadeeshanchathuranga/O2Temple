import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import CreateBedModal from './Components/CreateBedModal';
import EditBedModal from './Components/EditBedModal';
import DeleteBedModal from './Components/DeleteBedModal';
import HeaderLayout from '@/layouts/header-layout';

interface Bed {
  id: number;
  bed_number: string;
  status: 'available' | 'occupied' | 'maintenance';
  created_at: string;
  updated_at: string;
}

interface Props {
  beds: Bed[];
}

const BedManagement: React.FC<Props> = ({ beds: initialBeds }) => {
  const [beds, setBeds] = useState<Bed[]>(initialBeds);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingBed, setEditingBed] = useState<Bed | null>(null);

  const filteredBeds = beds.filter(bed => {
    const matchesSearch = bed.bed_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || bed.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

  const getCardStyling = (status: string) => {
    switch (status) {
      case 'available':
        return {
          cardClass: 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:shadow-green-100',
          headerClass: 'bg-green-500',
          iconClass: 'w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-semibold',
          titleClass: 'font-semibold text-green-900',
          contentClass: 'text-green-700',
          labelClass: 'font-medium text-green-800'
        };
      case 'occupied':
        return {
          cardClass: 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:shadow-blue-100',
          headerClass: 'bg-blue-500',
          iconClass: 'w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold',
          titleClass: 'font-semibold text-blue-900',
          contentClass: 'text-blue-700',
          labelClass: 'font-medium text-blue-800'
        };
      case 'maintenance':
        return {
          cardClass: 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 hover:shadow-yellow-100',
          headerClass: 'bg-yellow-500',
          iconClass: 'w-8 h-8 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center text-sm font-semibold',
          titleClass: 'font-semibold text-yellow-900',
          contentClass: 'text-yellow-700',
          labelClass: 'font-medium text-yellow-800'
        };
      default:
        return {
          cardClass: 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200 hover:shadow-gray-100',
          headerClass: 'bg-gray-500',
          iconClass: 'w-8 h-8 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center text-sm font-semibold',
          titleClass: 'font-semibold text-gray-900',
          contentClass: 'text-gray-700',
          labelClass: 'font-medium text-gray-800'
        };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return (
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'occupied':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
          </svg>
        );
      case 'maintenance':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  const handleEdit = (bed: Bed) => {
    setEditingBed(bed);
    setShowEditModal(true);
  };

  const handleDelete = (bed: Bed) => {
    setEditingBed(bed);
    setShowDeleteModal(true);
  };

  const handleCreateSuccess = (newBed: Bed) => {
    setBeds([...beds, newBed]);
    setShowCreateModal(false);
  };

  const handleEditSuccess = (updatedBed: Bed) => {
    setBeds(beds.map(bed => bed.id === updatedBed.id ? updatedBed : bed));
    setShowEditModal(false);
    setEditingBed(null);
  };

  const handleDeleteSuccess = () => {
    if (editingBed) {
      setBeds(beds.filter(bed => bed.id !== editingBed.id));
    }
    setShowDeleteModal(false);
    setEditingBed(null);
  };

  return (
    <HeaderLayout>
      <Head title="Bed Management" />

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


              <h1 className="text-xl font-semibold text-gray-900">Bed Management</h1>
            </div>

            <div className="px-3 py-1.5 bg-teal-500 text-white rounded-lg text-sm font-medium">
              {beds.length} Beds
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm">
            {/* Controls Bar */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Search beds..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-80 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                  />
                </div>
                
                {/* Status Filter */}
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-10 px-4 pr-8 border border-gray-300 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm bg-white text-gray-700 appearance-none cursor-pointer min-w-[140px]"
                  >
                    <option value="all">All Status</option>
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                  <svg className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
                {/* Filter Summary */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Showing {filteredBeds.length} of {beds.length} beds</span>
                  {statusFilter !== 'all' && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      statusFilter === 'available' ? 'bg-green-100 text-green-700' :
                      statusFilter === 'occupied' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                    </span>
                  )}
                </div>
              </div>

              <Button
                className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-medium"
                onClick={() => setShowCreateModal(true)}
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                New Bed
              </Button>
            </div>

            {/* Cards Grid */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredBeds.map((bed, index) => {
                  const styling = getCardStyling(bed.status);
                  return (
                    <div key={bed.id} className={`${styling.cardClass} border rounded-xl p-6 hover:shadow-lg transition-all duration-300 transform hover:scale-105`}>
                      {/* Status Indicator Bar */}
                      <div className={`h-1 ${styling.headerClass} rounded-full mb-4`}></div>
                      
                      {/* Card Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={styling.iconClass}>
                            {index + 1}
                          </div>
                          <div>
                            <h3 className={`${styling.titleClass} text-lg`}>{bed.bed_number}</h3>
                            <div className="flex items-center gap-1 mt-1">
                              {getStatusIcon(bed.status)}
                              <span className={`text-sm ${styling.contentClass} font-medium`}>
                                {bed.status.charAt(0).toUpperCase() + bed.status.slice(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge className={getStatusBadgeColor(bed.status)}>
                          {bed.status.charAt(0).toUpperCase() + bed.status.slice(1)}
                        </Badge>
                      </div>

                      {/* Card Content */}
                      <div className="space-y-3 mb-4">
                        <div className={`text-sm ${styling.contentClass}`}>
                          <span className={styling.labelClass}>Bed Number:</span>
                          <span className="ml-2 font-medium">{bed.bed_number}</span>
                        </div>
                        
                        <div className={`text-sm ${styling.contentClass}`}>
                          <span className={styling.labelClass}>Status:</span>
                          <span className="ml-2 font-medium">{bed.status.charAt(0).toUpperCase() + bed.status.slice(1)}</span>
                        </div>

                        <div className={`text-sm ${styling.contentClass}`}>
                          <span className={styling.labelClass}>Created:</span>
                          <span className="ml-2 font-medium">
                            {bed.created_at ? new Date(bed.created_at).toLocaleDateString() : 'Invalid Date'}
                          </span>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className={`flex items-center justify-end gap-2 pt-4 border-t border-opacity-20 ${bed.status === 'available' ? 'border-green-200' : bed.status === 'occupied' ? 'border-blue-200' : 'border-yellow-200'}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(bed)}
                          className={`p-2 rounded-lg transition-colors ${
                            bed.status === 'available' 
                              ? 'text-green-600 hover:text-green-800 hover:bg-green-100' 
                              : bed.status === 'occupied' 
                              ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-100'
                              : 'text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100'
                          }`}
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(bed)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {filteredBeds.length === 0 && (
              <div className="p-6">
                <div className="text-center py-12 text-gray-500">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.5 1.5H3.75A2.25 2.25 0 001.5 3.75v12.5A2.25 2.25 0 003.75 18.5h12.5a2.25 2.25 0 002.25-2.25V9.5M10.5 1.5v4.5m0-4.5L6 6m4.5-4.5L15 6" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No beds found</h3>
                  <p className="text-gray-500 mb-4">Get started by adding your first bed.</p>
                  <Button
                    className="bg-teal-500 hover:bg-teal-600 text-white"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Create First Bed
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateBedModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={handleCreateSuccess}
      />

      <EditBedModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        bed={editingBed}
        onSuccess={handleEditSuccess}
      />

      <DeleteBedModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        bed={editingBed}
        onSuccess={handleDeleteSuccess}
      />
    </HeaderLayout>
  );
};

export default BedManagement;
