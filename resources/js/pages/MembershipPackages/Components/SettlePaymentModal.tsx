import { useForm } from '@inertiajs/react';
import React, { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MembershipPackage {
    id: number;
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
}

interface SettlePaymentModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    package: MembershipPackage | null;
}

const SettlePaymentModal: React.FC<SettlePaymentModalProps> = ({ 
    open, 
    onOpenChange, 
    package: pkg 
}) => {
    const [paymentAmount, setPaymentAmount] = useState(0);

    const { data, setData, post, processing, errors, reset } = useForm({
        payment_amount: 0
    });

    useEffect(() => {
        if (pkg && open) {
            setPaymentAmount(pkg.remaining_balance);
            setData('payment_amount', pkg.remaining_balance);
        }
    }, [pkg, open]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (pkg && paymentAmount > 0) {
            post(`/membership-packages/${pkg.id}/settle-payment`, {
                onSuccess: () => {
                    onOpenChange(false);
                    reset();
                    setPaymentAmount(0);
                },
            });
        }
    };

    useEffect(() => {
        if (!open) {
            reset();
            setPaymentAmount(0);
        }
    }, [open]);

    if (!pkg) return null;

    const isIndividual = pkg.type === 'individual';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md p-0 gap-0 bg-white">
                <div className="relative bg-white rounded-lg">
                    <div className="flex items-center gap-3 p-6 pb-4 border-b border-gray-100">
                        <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Settle Payment</h2>
                            <p className="text-sm text-gray-600">{pkg.name}</p>
                        </div>
                        <button
                            onClick={() => onOpenChange(false)}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="p-6">
                        {/* Package Info */}
                        <div className={`p-4 rounded-lg mb-6 ${isIndividual ? 'bg-blue-50 border border-blue-200' : 'bg-purple-50 border border-purple-200'}`}>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Package Type:</span>
                                    <span className={`font-medium ${isIndividual ? 'text-blue-700' : 'text-purple-700'}`}>
                                        {pkg.type === 'individual' ? 'Individual' : 'Company'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Full Amount:</span>
                                    <span className="text-gray-900">Rs {Number(pkg.full_payment).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Paid Amount:</span>
                                    <span className="text-gray-900">Rs {Number(pkg.advance_payment).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-lg font-bold border-t border-gray-300 pt-2">
                                    <span className="text-red-700">Outstanding Balance:</span>
                                    <span className="text-red-700">Rs {Number(pkg.remaining_balance).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="payment_amount" className="text-sm font-medium text-gray-700 mb-2 block">
                                    Payment Amount (Rs) <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="payment_amount"
                                    type="number"
                                    min="0.01"
                                    max={pkg.remaining_balance}
                                    step="0.01"
                                    value={paymentAmount}
                                    onChange={(e) => {
                                        const amount = Number(e.target.value);
                                        setPaymentAmount(amount);
                                        setData('payment_amount', amount);
                                    }}
                                    className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:border-green-500 text-black"
                                    required
                                />
                                {errors.payment_amount && <p className="text-red-500 text-xs mt-1">{errors.payment_amount}</p>}
                                <p className="text-xs text-gray-500 mt-1">
                                    Maximum: Rs {Number(pkg.remaining_balance).toFixed(2)}
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    onClick={() => {
                                        setPaymentAmount(pkg.remaining_balance);
                                        setData('payment_amount', pkg.remaining_balance);
                                    }}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    Pay Full Balance
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => {
                                        const halfAmount = pkg.remaining_balance / 2;
                                        setPaymentAmount(halfAmount);
                                        setData('payment_amount', halfAmount);
                                    }}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    Pay Half
                                </Button>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => onOpenChange(false)} 
                                    className="px-6"
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    type="submit" 
                                    disabled={processing || paymentAmount <= 0 || paymentAmount > pkg.remaining_balance} 
                                    className="px-6 bg-green-500 hover:bg-green-600 text-white"
                                >
                                    {processing ? 'Processing...' : `Pay Rs ${Number(paymentAmount).toFixed(2)}`}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default SettlePaymentModal;