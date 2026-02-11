import { useForm } from '@inertiajs/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import React from 'react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';

interface MembershipPackage {
    id: number;
    type: 'individual' | 'company';
    name: string;
    num_of_sessions: number;
    sessions_used: number;
}

interface DeleteMembershipPackageModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    package: MembershipPackage | null;
}

const DeleteMembershipPackageModal: React.FC<DeleteMembershipPackageModalProps> = ({ 
    open, 
    onOpenChange, 
    package: pkg 
}) => {
    const { delete: destroy, processing } = useForm();

    const handleDelete = () => {
        if (pkg) {
            destroy(`/membership-packages/${pkg.id}`, {
                onSuccess: () => {
                    onOpenChange(false);
                },
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md p-0 gap-0 bg-white">
                <div className="relative bg-white rounded-lg">
                    <div className="flex items-center gap-3 p-6 pb-4">
                        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Delete Membership Package</h2>
                            <p className="text-sm text-gray-500 mt-1">This action cannot be undone</p>
                        </div>
                    </div>

                    <div className="px-6 pb-4">
                        <p className="text-gray-700">
                            Are you sure you want to delete the membership package for{' '}
                            <span className="font-semibold">{pkg?.name}</span>?
                        </p>
                        
                        {pkg && pkg.sessions_used > 0 && (
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm text-yellow-800">
                                    <span className="font-medium">Warning:</span> This package has {pkg.sessions_used} sessions 
                                    already used out of {pkg.num_of_sessions}. The session history will be lost.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-2 px-6 pb-6">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => onOpenChange(false)} 
                            className="px-4 py-2"
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="button"
                            onClick={handleDelete}
                            disabled={processing}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white"
                        >
                            {processing ? 'Deleting...' : 'Delete Package'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default DeleteMembershipPackageModal;
