'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Building2, X, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import NotificationsBell from '@/components/NotificationsBell';
import { useAuth } from '@/contexts/AuthContext';

interface StandaloneHeaderProps {
    /** Subtitle shown below the brand name */
    subtitle?: string;
    /** Route to navigate when close/back button is clicked */
    backRoute?: string;
}

/**
 * System chrome header for standalone pages (outside AdminDashboard shell).
 * Provides branding, notifications bell, and profile avatar dropdown —
 * keeping consistency with the AdminDashboard header and PropertyForm standalone mode.
 */
export default function StandaloneHeader({
    subtitle = 'Layout Management',
    backRoute = '/dashboard',
}: StandaloneHeaderProps) {
    const router = useRouter();
    const { user, logout } = useAuth();

    const handleClose = () => router.push(backRoute);

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    return (
        <header className="bg-card border-b border-[var(--border)] sticky top-0 z-30">
            <div className="flex items-center justify-between px-6 py-3">
                {/* ── Left: Branding ── */}
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                        <p className="text-base font-semibold text-foreground">EaseInspect</p>
                        <p className="text-xs text-muted-foreground">{subtitle}</p>
                    </div>
                </div>

                {/* ── Right: Actions ── */}
                <div className="flex items-center gap-3">
                    {/* Notifications */}
                    <NotificationsBell />

                    {/* Profile avatar dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                className="relative h-10 w-10 rounded-full focus:outline-none"
                                aria-label="Open profile menu"
                            >
                                <Avatar className="h-10 w-10">
                                    {(() => {
                                        const src =
                                            (user as any)?.profileImage ||
                                            (user as any)?.ProfileImage ||
                                            undefined;
                                        return src ? <AvatarImage src={src} alt="Profile" /> : null;
                                    })()}
                                    <AvatarFallback>
                                        {(() => {
                                            if (!user) return 'U';
                                            const first = (
                                                (user as any).firstName ||
                                                (user as any).FirstName ||
                                                ''
                                            )
                                                .toString()
                                                .trim();
                                            const last = (
                                                (user as any).lastName ||
                                                (user as any).LastName ||
                                                ''
                                            )
                                                .toString()
                                                .trim();
                                            const initials = `${first.charAt(0) || ''}${last.charAt(0) || ''}`.toUpperCase();
                                            if (initials) return initials;
                                            const email = ((user as any).email || '').toString();
                                            return email ? email.slice(0, 2).toUpperCase() : 'U';
                                        })()}
                                    </AvatarFallback>
                                </Avatar>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end">
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col">
                                    <p className="text-sm font-semibold leading-tight">
                                        {(() => {
                                            if (!user) return 'User';
                                            const first = (
                                                (user as any).firstName ||
                                                (user as any).FirstName ||
                                                ''
                                            )
                                                .toString()
                                                .trim();
                                            const last = (
                                                (user as any).lastName ||
                                                (user as any).LastName ||
                                                ''
                                            )
                                                .toString()
                                                .trim();
                                            const full = `${first} ${last}`.trim();
                                            return full || 'User';
                                        })()}
                                    </p>
                                    <p className="text-xs text-[var(--muted-400)] mt-0.5">
                                        {user
                                            ? ((user as any).email || '').toString()
                                            : '-'}
                                    </p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                                <User className="mr-2 h-4 w-4" />
                                <span>Dashboard</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleLogout} className="text-[var(--destructive)] hover:!bg-[var(--destructive-50)]">
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Log out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Divider */}
                    <div className="h-8 w-px bg-[var(--border)] mx-1" />

                    {/* Close / Back button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleClose}
                        className="rounded-full hover:bg-destructive/10 hover:text-destructive"
                        title="Back to Dashboard"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>
            </div>
        </header>
    );
}