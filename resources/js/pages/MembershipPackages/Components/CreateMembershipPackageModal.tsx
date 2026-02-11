import { useForm } from '@inertiajs/react';
import React, { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Package {
    id: number;
    name: string;
    duration_minutes: number;
    price: number;
}

interface CreateMembershipPackageModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    availablePackages: Package[];
}

const CreateMembershipPackageModal: React.FC<CreateMembershipPackageModalProps> = ({ 
    open, 
    onOpenChange,
    availablePackages 
}) => {


    const { data, setData, post, processing, errors, reset } = useForm({
        package_id: '',
        type: 'individual' as 'individual' | 'company',
        name: '',
        address: '',
        birthday: '',
        nic: '',
        phone: '',
        num_of_sessions: 1,
        discount_percentage: 0,
        full_payment: 0,
        advance_payment: 0,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        post('/membership-packages', {
            onSuccess: () => {
                onOpenChange(false);
                reset();
            },
        });
    };

    useEffect(() => {
        if (!open) {
            reset();
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-white">
                <div className="relative bg-white rounded-lg">
                    <div className="flex items-center gap-3 p-6 pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                        <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 2a2 2 0 00-2 2v2H6a2 2 0 00-2 2v6h12V8a2 2 0 00-2-2h-2V4a2 2 0 00-2-2z" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Create Membership Package</h2>
                        <button
                            onClick={() => onOpenChange(false)}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="px-6 pb-6 bg-white">
                        <div className="space-y-5 mt-4">
                            {/* Package Selection */}
                            <div>
                                <Label htmlFor="package_id" className="text-sm font-medium text-gray-700 mb-2 block">
                                    Select Package <span className="text-red-500">*</span>
                                </Label>
                                <select
                                    id="package_id"
                                    value={data.package_id}
                                    onChange={(e) => {
                                        const selectedPackage = availablePackages.find(pkg => pkg.id === Number(e.target.value));
                                        setData('package_id', e.target.value);
                                        if (selectedPackage) {
                                            const calculatedPayment = selectedPackage.price * data.num_of_sessions;
                                            setData(prev => ({
                                                ...prev,
                                                package_id: e.target.value,
                                                full_payment: calculatedPayment
                                            }));
                                        }
                                    }}
                                    className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-indigo-500 bg-white text-gray-900"
                                    required
                                >
                                    <option value="">Select a package</option>
                                    {availablePackages.map((pkg) => (
                                        <option key={pkg.id} value={pkg.id}>
                                            {pkg.name} - {pkg.duration_minutes} min - Rs {Number(pkg.price).toFixed(2)}
                                        </option>
                                    ))}
                                </select>
                                {errors.package_id && <p className="text-red-500 text-xs mt-1">{errors.package_id}</p>}
                            </div>

                            {/* Package Type */}
                            <div>
                                <Label htmlFor="type" className="text-sm font-medium text-gray-700 mb-2 block">
                                    Package Type <span className="text-red-500">*</span>
                                </Label>
                                <select
                                    id="type"
                                    value={data.type}
                                    onChange={(e) => setData('type', e.target.value as 'individual' | 'company')}
                                    className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-indigo-500 bg-white text-gray-900"
                                    required
                                >
                                    <option value="individual">Individual</option>
                                    <option value="company">Company</option>
                                </select>
                                {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type}</p>}
                            </div>

                            {/* Name */}
                            <div>
                                <Label htmlFor="name" className="text-sm font-medium text-gray-700 mb-2 block">
                                    {data.type === 'individual' ? 'Full Name' : 'Company Name'} <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    required
                                    className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:border-indigo-500 text-black"
                                />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                            </div>

                            {/* Address */}
                            <div>
                                <Label htmlFor="address" className="text-sm font-medium text-gray-700 mb-2 block">
                                    Address <span className="text-red-500">*</span>
                                </Label>
                                <Textarea
                                    id="address"
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                    required
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 text-black"
                                />
                                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                            </div>

                            {/* Birthday - Only for Individual */}
                            {data.type === 'individual' && (
                                <div>
                                    <Label htmlFor="birthday" className="text-sm font-medium text-gray-700 mb-2 block">
                                        Birthday <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="birthday"
                                        type="date"
                                        value={data.birthday}
                                        onChange={(e) => setData('birthday', e.target.value)}
                                        required={data.type === 'individual'}
                                        className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:border-indigo-500 text-black [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                    />
                                    {errors.birthday && <p className="text-red-500 text-xs mt-1">{errors.birthday}</p>}
                                </div>
                            )}

                            {/* NIC */}
                            <div>
                                <Label htmlFor="nic" className="text-sm font-medium text-gray-700 mb-2 block">
                                    NIC / Registration Number
                                </Label>
                                <Input
                                    id="nic"
                                    type="text"
                                    value={data.nic}
                                    onChange={(e) => setData('nic', e.target.value)}
                                    className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:border-indigo-500 text-black"
                                />
                                {errors.nic && <p className="text-red-500 text-xs mt-1">{errors.nic}</p>}
                            </div>

                            {/* Phone */}
                            <div>
                                <Label htmlFor="phone" className="text-sm font-medium text-gray-700 mb-2 block">
                                    Phone Number <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    required
                                    className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:border-indigo-500 text-black"
                                />
                                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                            </div>

                            {/* Two Column Layout for Numbers */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Number of Sessions */}
                                <div>
                                    <Label htmlFor="num_of_sessions" className="text-sm font-medium text-gray-700 mb-2 block">
                                        Number of Sessions <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="num_of_sessions"
                                        type="number"
                                        min="1"
                                        value={data.num_of_sessions}
                                        onChange={(e) => {
                                            const sessions = Number(e.target.value);
                                            setData('num_of_sessions', sessions);
                                            
                                            // Recalculate full payment if package is selected
                                            if (data.package_id) {
                                                const selectedPackage = availablePackages.find(pkg => pkg.id === Number(data.package_id));
                                                if (selectedPackage) {
                                                    const calculatedPayment = selectedPackage.price * sessions;
                                                    setData(prev => ({ ...prev, full_payment: calculatedPayment }));
                                                }
                                            }
                                        }}
                                        required
                                        className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:border-indigo-500 text-black"
                                    />
                                    {errors.num_of_sessions && <p className="text-red-500 text-xs mt-1">{errors.num_of_sessions}</p>}
                                </div>

                                {/* Discount Percentage */}
                                <div>
                                    <Label htmlFor="discount_percentage" className="text-sm font-medium text-gray-700 mb-2 block">
                                        Discount (%)
                                    </Label>
                                    <Input
                                        id="discount_percentage"
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={data.discount_percentage}
                                        onChange={(e) => setData('discount_percentage', Number(e.target.value))}
                                        className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:border-indigo-500 text-black"
                                    />
                                    {errors.discount_percentage && <p className="text-red-500 text-xs mt-1">{errors.discount_percentage}</p>}
                                </div>
                            </div>

                            {/* Two Column Layout for Payments */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Full Payment */}
                                <div>
                                    <Label htmlFor="full_payment" className="text-sm font-medium text-gray-700 mb-2 block">
                                        Full Payment (Rs) <span className="text-red-500">*</span>
                                        <span className="text-xs text-gray-500 font-normal ml-1">(Auto-calculated)</span>
                                    </Label>
                                    <Input
                                        id="full_payment"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={data.full_payment}
                                        onChange={(e) => setData('full_payment', Number(e.target.value))}
                                        required
                                        className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:border-indigo-500 text-black"
                                        readOnly
                                    />
                                    {errors.full_payment && <p className="text-red-500 text-xs mt-1">{errors.full_payment}</p>}
                                </div>

                                {/* Advance Payment */}
                                <div>
                                    <Label htmlFor="advance_payment" className="text-sm font-medium text-gray-700 mb-2 block">
                                        Advance Payment (Rs)
                                    </Label>
                                    <Input
                                        id="advance_payment"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={data.advance_payment}
                                        onChange={(e) => setData('advance_payment', Number(e.target.value))}
                                        className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:border-indigo-500 text-black"
                                    />
                                    {errors.advance_payment && <p className="text-red-500 text-xs mt-1">{errors.advance_payment}</p>}
                                </div>
                            </div>

                            {/* Calculated Balance Display */}
                            {data.full_payment > 0 && (
                                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                                    {data.discount_percentage > 0 && (
                                        <>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-600">Original Amount:</span>
                                                <span className="text-gray-900">Rs {Number(data.full_payment).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-600">Discount ({Number(data.discount_percentage).toFixed(2)}%):</span>
                                                <span className="text-green-600">- Rs {(Number(data.full_payment) * Number(data.discount_percentage) / 100).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm font-medium border-t border-gray-200 pt-2">
                                                <span className="text-gray-700">Amount After Discount:</span>
                                                <span className="text-gray-900">Rs {(Number(data.full_payment) - (Number(data.full_payment) * Number(data.discount_percentage) / 100)).toFixed(2)}</span>
                                            </div>
                                        </>
                                    )}
                                    {data.advance_payment > 0 && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-600">Advance Payment:</span>
                                            <span className="text-gray-900">Rs {Number(data.advance_payment).toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center border-t border-gray-300 pt-2">
                                        <span className="text-sm font-medium text-gray-700">Remaining Balance:</span>
                                        <span className="text-lg font-bold text-indigo-600">
                                            Rs {((Number(data.full_payment) - (Number(data.full_payment) * Number(data.discount_percentage) / 100)) - Number(data.advance_payment)).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-6 mt-6 border-t border-gray-100 sticky bottom-0 bg-white">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="px-4 py-2">
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={processing} 
                                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white"
                            >
                                {processing ? 'Creating...' : 'Create Package'}
                            </Button>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default CreateMembershipPackageModal;
