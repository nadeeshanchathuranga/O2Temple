import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

interface AuthLayoutProps {
    name?: string;
    title?: string;
    description?: string;
}

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: PropsWithChildren<AuthLayoutProps>) {
    return (
        <div className="spa-auth-layout flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
            <div className="spa-auth-card w-full max-w-sm">
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col items-center gap-4">
                        <Link
                            href="/"
                            className="flex flex-col items-center gap-2 font-medium"
                        >
                            {/* Logo */}
                            <div className="flex justify-center mb-6">
                                <img 
                                    src="/images/logo.jpeg" 
                                    alt="Company Logo" 
                                    className="h-12 w-auto"
                                />
                            </div>
                            <div className="mb-1 flex items-center justify-center">
                                <span className="text-3xl font-bold spa-logo">
                                    O<sub className="text-lg">2</sub> Temple
                                </span>
                            </div>
                            <span className="sr-only">{title}</span>
                        </Link>

                        <div className="space-y-2 text-center">
                            <h1 className="spa-title text-2xl font-semibold">{title}</h1>
                            <p className="text-center text-sm spa-description">
                                {description}
                            </p>
                        </div>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
