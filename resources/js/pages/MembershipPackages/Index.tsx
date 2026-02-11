import {
    ArrowLeftIcon,
    BuildingOfficeIcon,
    ClockIcon,
    CreditCardIcon,
    IdentificationIcon,
    MagnifyingGlassIcon, 
    MapPinIcon,
    PencilIcon, 
    PhoneIcon,
    PlusIcon, 
    TrashIcon, 
    UserIcon
} from '@heroicons/react/24/outline';
import { Head, router } from '@inertiajs/react';
import React, { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import HeaderLayout from '@/layouts/header-layout';

import CreateMembershipPackageModal from './Components/CreateMembershipPackageModal';
import DeleteMembershipPackageModal from './Components/DeleteMembershipPackageModal';
import EditMembershipPackageModal from './Components/EditMembershipPackageModal';
import SettlePaymentModal from './Components/SettlePaymentModal';

interface MembershipPackage {
    id: number;
    package_id?: number;
    type: 'individual' | 'company';
    name: string;
    address: string;
    birthday?: string;
    nic?: string;
    phone: string;
    num_of_sessions: number;
    discount_percentage: number;
    full_payment: number;
    advance_payment: number;
    remaining_balance: number;
    sessions_used: number;
    status: 'active' | 'inactive' | 'expired';
    remaining_sessions?: number;
    created_at: string;
    package?: {
        id: number;
        name: string;
        duration_minutes: number;
        price: number;
    };
}

interface Package {
    id: number;
    name: string;
    duration_minutes: number;
    price: number;
}

interface PaginatedData {
    data: MembershipPackage[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

interface Props {
    packages: PaginatedData;
    availablePackages: Package[];
    filters: {
        type: string;
        status: string;
        search: string;
    };
}

const MembershipPackagesIndex: React.FC<Props> = ({ packages: paginatedPackages, availablePackages, filters }) => {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [typeFilter, setTypeFilter] = useState(filters.type || 'all');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showSettleModal, setShowSettleModal] = useState(false);
    const [editingPackage, setEditingPackage] = useState<MembershipPackage | null>(null);

    const packages = paginatedPackages.data;

    const handleFilter = () => {
        router.get('/membership-packages', {
            type: typeFilter,
            status: statusFilter,
            search: searchTerm,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleEdit = (pkg: MembershipPackage) => {
        setEditingPackage(pkg);
        setShowEditModal(true);
    };

    const handleDelete = (pkg: MembershipPackage) => {
        setEditingPackage(pkg);
        setShowDeleteModal(true);
    };

    const handleSettle = (pkg: MembershipPackage) => {
        setEditingPackage(pkg);
        setShowSettleModal(true);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>;
            case 'inactive':
                return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Inactive</Badge>;
            case 'expired':
                return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Expired</Badge>;
            default:
                return null;
        }
    };

    const getTypeBadge = (type: string) => {
        return type === 'individual' 
            ? <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Individual</Badge>
            : <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">Company</Badge>;
    };

    return (
        <HeaderLayout>
            <Head title="Company & Individual Packages" />

            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <Button 
                                variant="ghost" 
                                onClick={() => window.history.back()} 
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                            </Button>
                            <h1 className="text-xl font-semibold text-gray-900">Company & Individual Packages</h1>
                        </div>

                        <div className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-sm font-medium">
                            {paginatedPackages.total} Packages
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm">
                        <div className="flex flex-col gap-4 p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <Input
                                            type="text"
                                            placeholder="Search by name, phone, or NIC..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleFilter()}
                                            className="pl-10 w-80 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                                        />
                                    </div>

                                    <select
                                        value={typeFilter}
                                        onChange={(e) => setTypeFilter(e.target.value)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-indigo-500 bg-white text-gray-900"
                                    >
                                        <option value="all">All Types</option>
                                        <option value="individual">Individual</option>
                                        <option value="company">Company</option>
                                    </select>

                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-indigo-500 bg-white text-gray-900"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="expired">Expired</option>
                                    </select>

                                    <Button
                                        onClick={handleFilter}
                                        className="bg-indigo-500 hover:bg-indigo-600 text-white"
                                    >
                                        Apply Filters
                                    </Button>
                                </div>

                                <Button 
                                    className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium" 
                                    onClick={() => setShowCreateModal(true)}
                                >
                                    <PlusIcon className="w-4 h-4 mr-2" /> New Package
                                </Button>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span>Showing {packages.length} of {paginatedPackages.total} packages</span>
                            </div>
                        </div>

                        {/* Cards Grid */}
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {packages.map((pkg) => {
                                    const isIndividual = pkg.type === 'individual';
                                    const cardClass = isIndividual
                                        ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:shadow-blue-100'
                                        : 'bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200 hover:shadow-purple-100';
                                    
                                    const headerClass = isIndividual
                                        ? 'bg-gradient-to-r from-blue-400 to-indigo-400'
                                        : 'bg-gradient-to-r from-purple-400 to-violet-400';

                                    const remainingSessions = pkg.num_of_sessions - pkg.sessions_used;
                                    const progressPercentage = (pkg.sessions_used / pkg.num_of_sessions) * 100;

                                    return (
                                        <div 
                                            key={pkg.id} 
                                            className={`${cardClass} border rounded-xl p-6 hover:shadow-lg transition-all duration-300 transform hover:scale-105`}
                                        >
                                            {/* Status Indicator Bar */}
                                            <div className={`h-1 ${headerClass} rounded-full mb-4`}></div>

                                            {/* Card Header */}
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 ${isIndividual ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'} rounded-xl flex items-center justify-center`}>
                                                        {isIndividual ? (
                                                            <UserIcon className="w-6 h-6" />
                                                        ) : (
                                                            <BuildingOfficeIcon className="w-6 h-6" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h3 className={`${isIndividual ? 'text-blue-900' : 'text-purple-900'} font-bold text-lg mb-1`}>
                                                            {pkg.name}
                                                        </h3>
                                                        <div className="flex gap-2">
                                                            {getTypeBadge(pkg.type)}
                                                            {getStatusBadge(pkg.status)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Card Content */}
                                            <div className="space-y-3 mb-4">
                                                {pkg.package && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-700 bg-white bg-opacity-50 rounded-lg p-2">
                                                        <span className="font-medium">Package:</span>
                                                        <span>{pkg.package.name}</span>
                                                        <span className="text-xs text-gray-500">
                                                            ({pkg.package.duration_minutes} min - Rs {Number(pkg.package.price).toFixed(2)})
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                                    <PhoneIcon className="w-4 h-4" />
                                                    <span>{pkg.phone}</span>
                                                </div>

                                                {pkg.nic && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                                        <IdentificationIcon className="w-4 h-4" />
                                                        <span className="font-medium">NIC:</span>
                                                        <span>{pkg.nic}</span>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                                    <ClockIcon className="w-4 h-4" />
                                                    <span className="font-medium">Sessions:</span>
                                                    <span>
                                                        {pkg.sessions_used} / {pkg.num_of_sessions} used
                                                    </span>
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div 
                                                        className={`${isIndividual ? 'bg-blue-500' : 'bg-purple-500'} h-2 rounded-full transition-all`}
                                                        style={{ width: `${progressPercentage}%` }}
                                                    ></div>
                                                </div>

                                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                                    <CreditCardIcon className="w-4 h-4" />
                                                    <div className="flex flex-col">
                                                        <span className="font-bold">Rs {Number(pkg.full_payment).toFixed(2)}</span>
                                                        {pkg.remaining_balance > 0 && (
                                                            <span className="text-xs text-orange-600">
                                                                Balance: Rs {Number(pkg.remaining_balance).toFixed(2)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {pkg.discount_percentage > 0 && (
                                                    <div className="flex items-center gap-2 text-sm text-green-600">
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                                        </svg>
                                                        <span>{pkg.discount_percentage}% Discount Applied</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Card Actions */}
                                            <div className="flex items-center justify-end gap-2 pt-4 border-t border-opacity-20">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(pkg)}
                                                    className={`p-2 rounded-lg transition-colors ${isIndividual ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-100' : 'text-purple-600 hover:text-purple-800 hover:bg-purple-100'}`}
                                                    title="Edit"
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                </Button>
                                                {pkg.remaining_balance > 0 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleSettle(pkg)}
                                                        className="p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-lg transition-colors"
                                                        title="Settle Payment"
                                                    >
                                                        <CreditCardIcon className="w-4 h-4" />
                                                    </Button>
                                                )}
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

                        {packages.length === 0 && (
                            <div className="p-6">
                                <div className="text-center py-12 text-gray-500">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <UserIcon className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No packages found</h3>
                                    <p className="text-gray-500 mb-4">Create your first membership package to get started.</p>
                                    <Button 
                                        className="bg-indigo-500 hover:bg-indigo-600 text-white" 
                                        onClick={() => setShowCreateModal(true)}
                                    >
                                        <PlusIcon className="w-4 h-4 mr-2" />
                                        Create Package
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Pagination */}
                        {paginatedPackages.last_page > 1 && (
                            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                                <div className="text-sm text-gray-600">
                                    Page {paginatedPackages.current_page} of {paginatedPackages.last_page}
                                </div>
                                <div className="flex gap-2">
                                    {paginatedPackages.current_page > 1 && (
                                        <Button
                                            variant="outline"
                                            onClick={() => router.get(`/membership-packages?page=${paginatedPackages.current_page - 1}&type=${typeFilter}&status=${statusFilter}&search=${searchTerm}`)}
                                        >
                                            Previous
                                        </Button>
                                    )}
                                    {paginatedPackages.current_page < paginatedPackages.last_page && (
                                        <Button
                                            variant="outline"
                                            onClick={() => router.get(`/membership-packages?page=${paginatedPackages.current_page + 1}&type=${typeFilter}&status=${statusFilter}&search=${searchTerm}`)}
                                        >
                                            Next
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <CreateMembershipPackageModal 
                open={showCreateModal} 
                onOpenChange={setShowCreateModal}
                availablePackages={availablePackages}
            />
            <EditMembershipPackageModal 
                open={showEditModal} 
                onOpenChange={setShowEditModal} 
                package={editingPackage}
                availablePackages={availablePackages}
            />
            <DeleteMembershipPackageModal 
                open={showDeleteModal} 
                onOpenChange={setShowDeleteModal} 
                package={editingPackage}
            />
            <SettlePaymentModal 
                open={showSettleModal} 
                onOpenChange={setShowSettleModal} 
                package={editingPackage}
            />
        </HeaderLayout>
    );
};

export default MembershipPackagesIndex;
