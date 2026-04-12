'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    SquaresFour,
    Users,
    SignOut,
    List,
    X,
    Sun,
    Moon,
    MusicNote,
    CreditCard,
    SpeakerHigh,
    Warning,
    ChartBar,
} from '@phosphor-icons/react';
import { useTheme } from '@/lib/theme';

const NAV = [
    { href: '/dashboard',           label: 'Tổng quan',     icon: SquaresFour, exact: true  },
    { href: '/dashboard/users',     label: 'Người dùng',   icon: Users,       exact: false },
    { href: '/dashboard/music',     label: 'Nhạc & Album',        icon: MusicNote,   exact: false },
    { href: '/dashboard/payments',  label: 'Gói cước',     icon: CreditCard,  exact: false },
    { href: '/dashboard/ads',       label: 'Quảng cáo',   icon: SpeakerHigh, exact: false },
    { href: '/dashboard/reports',   label: 'Báo cáo',     icon: Warning,     exact: false },
    { href: '/dashboard/analytics', label: 'Thống kê',    icon: ChartBar,    exact: false },
];

// Map segment → tên đẹp hơn cho breadcrumb
const SEGMENT_LABELS: Record<string, string> = {
    dashboard:  'Trang chủ',
    users:      'Người dùng',
    music:      'Nhạc & Album',
    payments:   'Gói cước',
    ads:        'Quảng cáo',
    reports:    'Báo cáo',
    analytics:  'Thống kê',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router   = useRouter();
    const pathname = usePathname();
    const { theme, toggle } = useTheme();
    const [open, setOpen] = useState(false);
    const [authenticated] = useState<boolean>(() =>
        typeof window !== 'undefined' && Boolean(localStorage.getItem('access_token')),
    );

    useEffect(() => {
        if (!authenticated) router.replace('/login');
    }, [router, authenticated]);

    const logout = () => { localStorage.clear(); router.replace('/login'); };
    const isActive = (href: string, exact: boolean) =>
        exact ? pathname === href : pathname.startsWith(href);

    if (!authenticated) return <div className="min-h-screen bg-background" />;

    const isDark = theme === 'dark';
    const segments = pathname.split('/').filter(Boolean);

    return (
        <div className="min-h-screen bg-background text-foreground flex transition-colors duration-200">

            {/* ── Sidebar ───────────────────────────────────────── */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-56 flex flex-col
                bg-zinc-50 dark:bg-[#0f0f0f]
                border-r border-zinc-200 dark:border-white/[0.06]
                transition-transform duration-200 ease-out
                ${open ? 'translate-x-0' : '-translate-x-full'}
                lg:translate-x-0
            `}>

                {/* Brand */}
                <div className="h-14 flex items-center px-5 border-b border-zinc-200 dark:border-white/[0.06] shrink-0 gap-3">
                    <div className="size-7 bg-zinc-900 dark:bg-white flex items-center justify-center shrink-0">
                        <MusicNote size={14} weight="fill" className="text-white dark:text-black" />
                    </div>
                    <div>
                        <p className="text-[12px] font-semibold tracking-tight text-zinc-900 dark:text-white leading-none">
                            Music Admin
                        </p>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 font-mono">
                            v0.1.0
                        </p>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
                    {/* Label section */}
                    <p className="text-[9px] font-semibold tracking-[0.15em] text-zinc-400 dark:text-zinc-600 px-2.5 pt-1 pb-2 uppercase">
                        Menu
                    </p>
                    {NAV.map(({ href, label, icon: Icon, exact }) => {
                        const active = isActive(href, exact);
                        return (
                            <Link
                                key={href}
                                href={href}
                                onClick={() => setOpen(false)}
                                className={`
                                    flex items-center gap-2.5 px-2.5 h-9 text-[13px] rounded-md transition-all
                                    ${active
                                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-black font-semibold'
                                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.06] font-medium'
                                    }
                                `}
                            >
                                <Icon
                                    size={15}
                                    weight={active ? 'fill' : 'regular'}
                                    className={active ? '' : 'opacity-70'}
                                />
                                {label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom */}
                <div className="px-2.5 py-3 border-t border-zinc-200 dark:border-white/[0.06] shrink-0 space-y-0.5">
                    <button
                        onClick={toggle}
                        className="flex items-center gap-2.5 px-2.5 h-9 text-[13px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.06] w-full rounded-md transition-all"
                    >
                        {isDark
                            ? <Sun size={15} weight="regular" className="opacity-70" />
                            : <Moon size={15} weight="regular" className="opacity-70" />}
                        {isDark ? 'Chế độ sáng' : 'Chế độ tối'}
                    </button>
                    <button
                        onClick={logout}
                        className="flex items-center gap-2.5 px-2.5 h-9 text-[13px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/[0.06] w-full rounded-md transition-all"
                    >
                        <SignOut size={15} weight="regular" className="opacity-70" />
                        Đăng xuất
                    </button>

                    {/* User pill */}
                    <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-white/[0.06] px-2.5 pb-1">
                        <div className="flex items-center gap-2">
                            <div className="size-6 bg-zinc-900 dark:bg-white rounded-full flex items-center justify-center shrink-0">
                                <span className="text-[9px] font-bold text-white dark:text-black">A</span>
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 truncate leading-none">
                                    Admin
                                </p>
                                <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-0.5 font-mono">
                                    ROLE_ADMIN
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Overlay mobile */}
            {open && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 dark:bg-black/70 lg:hidden backdrop-blur-sm"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* ── Main ──────────────────────────────────────────── */}
            <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">

                {/* Top header */}
                <header className="h-14 border-b border-zinc-200 dark:border-white/[0.06] flex items-center px-5 gap-4 shrink-0 bg-white dark:bg-[#0a0a0a] sticky top-0 z-30">

                    {/* Mobile menu toggle */}
                    <button
                        className="lg:hidden text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                        onClick={() => setOpen(!open)}
                    >
                        {open ? <X size={18} /> : <List size={18} />}
                    </button>

                    {/* Breadcrumb */}
                    <div className="flex items-center gap-1.5 text-[12px] min-w-0">
                        {segments.map((seg, i) => {
                            const isLast = i === segments.length - 1;
                            return (
                                <span key={seg} className="flex items-center gap-1.5 min-w-0">
                                    {i > 0 && (
                                        <span className="text-zinc-300 dark:text-zinc-700 select-none">/</span>
                                    )}
                                    <span className={
                                        isLast
                                            ? 'font-semibold text-zinc-900 dark:text-white truncate'
                                            : 'text-zinc-400 dark:text-zinc-500 truncate'
                                    }>
                                        {SEGMENT_LABELS[seg] ?? seg}
                                    </span>
                                </span>
                            );
                        })}
                    </div>

                    {/* Right side actions */}
                    <div className="ml-auto flex items-center gap-2">
                        {/* Theme toggle (desktop) */}
                        <button
                            onClick={toggle}
                            className="hidden lg:flex size-8 items-center justify-center rounded-md text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-all"
                        >
                            {isDark ? <Sun size={15} /> : <Moon size={15} />}
                        </button>

                        {/* Status indicator */}
                        <div className="flex items-center gap-1.5 px-2.5 h-7 bg-emerald-50 dark:bg-emerald-400/10 border border-emerald-200 dark:border-emerald-400/20 rounded-full">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">Online</span>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-5 lg:p-7 bg-white dark:bg-[#0a0a0a]">
                    {children}
                </main>
            </div>
        </div>
    );
}