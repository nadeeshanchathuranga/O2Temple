import { Head, Link } from '@inertiajs/react';
import {
    ShoppingCart,
    Bed,
    Package,
    Users,
    CreditCard,
    BarChart3,
    Activity,
    Calendar
} from 'lucide-react';

import HeaderLayout from '@/layouts/header-layout';

interface DashboardProps {
    user: {
        name: string;
        email: string;
        role: string;
    };
}

const dashboardModules = [
    {
        id: 'pos-billing',
        title: 'POS BILLING',
        description: 'Quick billing and payment processing for oxygen therapy sessions',
        icon: ShoppingCart,
        color: 'bg-gradient-to-br from-green-400 to-green-600',
        textColor: 'text-white',
        href: '/pos'
    },
    {
        id: 'bed-management',
        title: 'SEAT MANAGEMENT',
        description: 'Monitor and manage oxygen therapy bed availability and status',
        icon: Bed,
        color: 'bg-gradient-to-br from-teal-400 to-teal-600',
        textColor: 'text-white',
        href: '/beds'
    },
    {
        id: 'package-management',
        title: 'PACKAGE MANAGEMENT',
        description: 'Create and manage therapy packages with pricing',
        icon: Package,
        color: 'bg-gradient-to-br from-blue-400 to-blue-600',
        textColor: 'text-white',
        href: '/packages'
    },
     {
        id: 'booking-management',
        title: 'BOOKING MANAGEMENT',
        description: 'Manage therapy session bookings and schedules',
        icon: Calendar,
        color: 'bg-gradient-to-br from-yellow-400 to-yellow-600',
        textColor: 'text-white',
        href: '/bookings'
    },
    {
        id: 'customer-management',
        title: 'CUSTOMER MANAGEMENT',
        description: 'Manage customer information and therapy history',
        icon: Users,
        color: 'bg-gradient-to-br from-indigo-400 to-indigo-600',
        textColor: 'text-white',
        href: '/customers'
    },
    {
        id: 'payment-history',
        title: 'PAYMENT HISTORY',
        description: 'Track and manage all payment transactions',
        icon: CreditCard,
        color: 'bg-gradient-to-br from-purple-400 to-purple-600',
        textColor: 'text-white',
        href: '/payment-history'
    },
    {
        id: 'reports',
        title: 'REPORTS & ANALYTICS',
        description: 'Generate comprehensive business reports and analytics',
        icon: BarChart3,
        color: 'bg-gradient-to-br from-pink-400 to-pink-600',
        textColor: 'text-white',
        href: '/reports'
    }
];

export default function Dashboard({ user }: DashboardProps) {
    return (
        <HeaderLayout user={user}>
            <Head title="O2 Temple Dashboard" />

            {/* Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dashboardModules.map((module) => {
                    const IconComponent = module.icon;
                    const ModuleCard = (
                        <div
                            className={`${module.color} rounded-2xl p-6 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl group relative overflow-hidden`}
                        >
                            {/* Background decoration */}
                            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 rounded-full bg-white/10"></div>
                            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-20 h-20 rounded-full bg-black/5"></div>

                            {/* Content */}
                            <div className="relative z-10">
                                {/* Icon */}
                                <div className="mb-4">
                                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                        <IconComponent className="w-6 h-6 text-white" />
                                    </div>
                                </div>

                                {/* Title */}
                                <h3 className={`${module.textColor} text-lg font-bold mb-2 leading-tight`}>
                                    {module.title}
                                </h3>

                                {/* Description */}
                                <p className={`${module.textColor} text-sm opacity-90 leading-relaxed`}>
                                    {module.description}
                                </p>
                            </div>

                            {/* Hover effect overlay */}
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                        </div>
                    );

                    return (
                        <div key={module.id}>
                            {module.href === '#' ? (
                                ModuleCard
                            ) : (
                                <Link href={module.href}>
                                    {ModuleCard}
                                </Link>
                            )}
                        </div>
                    );
                })}
            </div>
        </HeaderLayout>
    );
}
