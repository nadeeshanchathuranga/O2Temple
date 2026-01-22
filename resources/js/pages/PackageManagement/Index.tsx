import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import CreatePackageModal from './Components/CreatePackageModal';
import EditPackageModal from './Components/EditPackageModal';
import DeletePackageModal from './Components/DeletePackageModal';
import HeaderLayout from '@/layouts/header-layout';

interface Package {
  id: number;
  name: string;
  duration_minutes: number;
  price: number;
}

interface Props {
  packages: Package[];
}

const PackageManagement: React.FC<Props> = ({ packages: initialPackages }) => {
  const [packages, setPackages] = useState<Package[]>(initialPackages || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);

  const filtered = packages.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleEdit = (pkg: Package) => { setEditingPackage(pkg); setShowEditModal(true); };
  const handleDelete = (pkg: Package) => { setEditingPackage(pkg); setShowDeleteModal(true); };

  const handleCreateSuccess = (newPkg: Package) => { setPackages([...packages, newPkg]); setShowCreateModal(false); };
  const handleEditSuccess = (updatedPkg: Package) => { setPackages(packages.map(p => p.id === updatedPkg.id ? updatedPkg : p)); setShowEditModal(false); setEditingPackage(null); };
  const handleDeleteSuccess = () => { if (editingPackage) setPackages(packages.filter(p => p.id !== editingPackage.id)); setShowDeleteModal(false); setEditingPackage(null); };

  return (
    <HeaderLayout>
      <Head title="Package Management" />

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => window.history.back()} className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
              </Button>

              <h1 className="text-xl font-semibold text-gray-900">Package Management</h1>
            </div>

            <div className="px-3 py-1.5 bg-teal-500 text-white rounded-lg text-sm font-medium">
              {packages.length} Packages
            </div>
          </div>

          {/* Helper function for package type styling */}
          {(() => {
            const getPackageCardStyling = (price: number) => {
              if (price <= 50) {
                return {
                  cardClass: 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:shadow-green-100',
                  headerClass: 'bg-green-500',
                  iconClass: 'w-10 h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center',
                  titleClass: 'font-bold text-green-900',
                  priceClass: 'text-green-700 font-bold text-xl',
                  contentClass: 'text-green-700',
                  labelClass: 'font-medium text-green-800',
                  badgeClass: 'bg-green-100 text-green-700'
                };
              } else if (price <= 150) {
                return {
                  cardClass: 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:shadow-blue-100',
                  headerClass: 'bg-blue-500',
                  iconClass: 'w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center',
                  titleClass: 'font-bold text-blue-900',
                  priceClass: 'text-blue-700 font-bold text-xl',
                  contentClass: 'text-blue-700',
                  labelClass: 'font-medium text-blue-800',
                  badgeClass: 'bg-blue-100 text-blue-700'
                };
              } else {
                return {
                  cardClass: 'bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200 hover:shadow-purple-100',
                  headerClass: 'bg-purple-500',
                  iconClass: 'w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center',
                  titleClass: 'font-bold text-purple-900',
                  priceClass: 'text-purple-700 font-bold text-xl',
                  contentClass: 'text-purple-700',
                  labelClass: 'font-medium text-purple-800',
                  badgeClass: 'bg-purple-100 text-purple-700'
                };
              }
            };

            const getPackageIcon = (price: number) => {
              if (price <= 50) {
                return (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                );
              } else if (price <= 150) {
                return (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                );
              } else {
                return (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                  </svg>
                );
              }
            };

            const formatDuration = (minutes: number) => {
              if (minutes >= 60) {
                const hours = Math.floor(minutes / 60);
                const remainingMinutes = minutes % 60;
                return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
              }
              return `${minutes}m`;
            };

            return null;
          })()}

          <div className="bg-white rounded-lg shadow-sm">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Search packages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-80 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                  />
                </div>
                
                {/* Package Summary */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Showing {filtered.length} of {packages.length} packages</span>
                </div>
              </div>

              <Button className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-medium" onClick={() => setShowCreateModal(true)}>
                <PlusIcon className="w-4 h-4 mr-2" /> New Package
              </Button>
            </div>

            {/* Cards Grid */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((pkg, idx) => {
                  const getPackageCardStyling = (price: number) => {
                    // All packages use luminous light blue theme
                    return {
                      cardClass: 'bg-gradient-to-br from-sky-50 to-cyan-50 border-sky-200 hover:shadow-sky-100',
                      headerClass: 'bg-gradient-to-r from-sky-400 to-cyan-400',
                      iconClass: 'w-10 h-10 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center',
                      titleClass: 'font-bold text-sky-900',
                      priceClass: 'text-sky-700 font-bold text-2xl',
                      contentClass: 'text-sky-700',
                      labelClass: 'font-medium text-sky-800',
                      badgeClass: 'bg-sky-100 text-sky-700',
                      actionClass: 'text-sky-600 hover:text-sky-800 hover:bg-sky-100'
                    };
                  };

                  const getPackageIcon = (price: number) => {
                    // Luminous package icon for all packages
                    return (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    );
                  };

                  const formatDuration = (minutes: number) => {
                    if (minutes >= 60) {
                      const hours = Math.floor(minutes / 60);
                      const remainingMinutes = minutes % 60;
                      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
                    }
                    return `${minutes}m`;
                  };

                  const getPackageType = (price: number) => {
                    if (price <= 12000) return 'Essential';   // Up to Rs 12,000
                    if (price <= 36000) return 'Popular';    // Rs 12,001 - Rs 36,000  
                    return 'Elite';                          // Rs 36,001+
                  };

                  const styling = getPackageCardStyling(pkg.price);
                  
                  return (
                    <div key={pkg.id} className={`${styling.cardClass} border rounded-xl p-6 hover:shadow-lg transition-all duration-300 transform hover:scale-105`}>
                      {/* Status Indicator Bar */}
                      <div className={`h-1 ${styling.headerClass} rounded-full mb-4`}></div>
                      
                      {/* Card Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={styling.iconClass}>
                            {getPackageIcon(pkg.price)}
                          </div>
                          <div>
                            <h3 className={`${styling.titleClass} text-lg mb-1`}>{pkg.name}</h3>
                            <span className={`${styling.badgeClass} px-2 py-1 rounded-full text-xs font-medium`}>
                              {getPackageType(pkg.price)}
                            </span>
                          </div>
                        </div>
                        <div className={styling.priceClass}>
                          Rs {Number(pkg.price).toFixed(2)}
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="space-y-3 mb-4">
                        <div className={`text-sm ${styling.contentClass}`}>
                          <span className={styling.labelClass}>Package Name:</span>
                          <span className="ml-2 font-medium">{pkg.name}</span>
                        </div>
                        
                        <div className={`text-sm ${styling.contentClass}`}>
                          <span className={styling.labelClass}>Duration:</span>
                          <span className="ml-2 font-medium">{pkg.duration_minutes} minutes</span>
                        </div>

                        <div className={`text-sm ${styling.contentClass}`}>
                          <span className={styling.labelClass}>Price:</span>
                          <span className="ml-2 font-bold">Rs {Number(pkg.price).toFixed(2)}</span>
                        </div>

                        {/* Value per minute indicator */}
                        <div className={`text-sm ${styling.contentClass}`}>
                          <span className={styling.labelClass}>Rate:</span>
                          <span className="ml-2 font-medium">Rs {(pkg.price / pkg.duration_minutes).toFixed(2)}/min</span>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className={`flex items-center justify-end gap-2 pt-4 border-t border-opacity-20 border-sky-200`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(pkg)}
                          className={`p-2 rounded-lg transition-colors ${styling.actionClass}`}
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(pkg)}
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

            {filtered.length === 0 && (
              <div className="p-6">
                <div className="text-center py-12 text-gray-500">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No packages found</h3>
                  <p className="text-gray-500 mb-4">Add your first package to get started.</p>
                  <Button className="bg-teal-500 hover:bg-teal-600 text-white" onClick={() => setShowCreateModal(true)}>
                    <PlusIcon className="w-4 h-4 mr-2"/>Create Package
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <CreatePackageModal open={showCreateModal} onOpenChange={setShowCreateModal} onSuccess={handleCreateSuccess} />
      <EditPackageModal open={showEditModal} onOpenChange={setShowEditModal} package={editingPackage} onSuccess={handleEditSuccess} />
      <DeletePackageModal open={showDeleteModal} onOpenChange={setShowDeleteModal} package={editingPackage} onSuccess={handleDeleteSuccess} />
    </HeaderLayout>
  );
};

export default PackageManagement;
