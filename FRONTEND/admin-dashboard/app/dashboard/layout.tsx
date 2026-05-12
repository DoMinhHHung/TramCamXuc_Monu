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
    MusicNotesPlus,
    Microphone,
    TrendUpIcon,
} from '@phosphor-icons/react';
import { useTheme } from '@/lib/theme';
import { LogoIcon } from '@/components/logo-icon';

const NAV = [
    { href: '/dashboard',           label: 'Tổng quan',     icon: SquaresFour, exact: true  },
    { href: '/dashboard/users',     label: 'Quản lý người dùng',   icon: Users,       exact: false },
    { href: '/dashboard/music',     label: 'Quản lý âm nhạc',        icon: MusicNote,   exact: false },
    { href: '/dashboard/artists',   label: 'Quản lý nghệ sĩ',      icon: Microphone, exact: false },
    { href: '/dashboard/payments',  label: 'Quản lý gói cước',     icon: CreditCard,  exact: false },
    { href: '/dashboard/ads',       label: 'Quản lý quảng cáo',   icon: SpeakerHigh, exact: false },
    { href: '/dashboard/reports',   label: 'Quản lý báo cáo',     icon: Warning,     exact: false },
    { href: '/dashboard/analytics', label: 'Thống kê',    icon: ChartBar,    exact: false },
    { href: '/dashboard/trending',  label: 'Xu Hướng Âm Nhạc', icon: TrendUpIcon, exact: false },
];

// Map segment → tên đẹp hơn cho breadcrumb
const SEGMENT_LABELS: Record<string, string> = {
    dashboard:  'Trang chủ',
    users:      'Quản lý người dùng',
    music:      'Quản lý âm nhạc',
    albums:     'Album',
    artists:    'Quản lý nghệ sĩ',
    payments:   'Quản lý gói cước',
    ads:        'Quản lý quảng cáo',
    reports:    'Quản lý báo cáo',
    analytics:  'Thống kê',
    trending:   'Xu Hướng Âm Nhạc',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router   = useRouter();
    const pathname = usePathname();
    const { theme, toggle } = useTheme();
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
        setMounted(true);
        setAuthenticated(Boolean(localStorage.getItem('access_token')));
    }, []);

    useEffect(() => {
        if (mounted && !authenticated) router.replace('/login');
    }, [router, mounted, authenticated]);

    const logout = () => { localStorage.clear(); router.replace('/login'); };
    const isActive = (href: string, exact: boolean) =>
        exact ? pathname === href : pathname.startsWith(href);

    if (!mounted) return <div className="min-h-screen bg-background" />;

    if (!authenticated) return <div className="min-h-screen bg-background" />;

    const isDark = theme === 'dark';
    const segments = pathname.split('/').filter(Boolean);

    return (
        <div className="min-h-screen bg-background text-foreground flex transition-colors duration-200">

            {/* ── Sidebar ───────────────────────────────────────── */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-56 flex flex-col
                bg-white dark:bg-[#0a0a0a]
                border-r border-slate-200 dark:border-slate-800
                transition-transform duration-300 ease-out
                ${open ? 'translate-x-0' : '-translate-x-full'}
                lg:translate-x-0
            `}>

                {/* Brand */}
                <div className="h-16 flex items-center px-5 border-b border-slate-200 dark:border-slate-800 shrink-0 gap-3 bg-white dark:bg-slate-950">
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <LogoIcon size={40} />
                            <div className="min-w-0">
                                <p className="text-[13px] font-bold text-slate-900 dark:text-white leading-none">
                                    Phazel Sound
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                                    Bảng quản trị
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
                    {NAV.map(({ href, label, icon: Icon, exact }) => {
                        const active = isActive(href, exact);
                        return (
                            <Link
                                key={href}
                                href={href}
                                onClick={() => setOpen(false)}
                            className={`
                                flex items-center gap-3 px-4 h-10 text-[13px] rounded-full transition-all duration-200 font-medium
                                ${active
                                    ? 'bg-gradient-to-r from-amber-400 via-pink-500 to-cyan-400 text-white shadow-xl shadow-pink-500/40'
                                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                                }
                            `}
                            >
                                <Icon
                                    size={18}
                                    weight={active ? 'fill' : 'regular'}
                                    className={active ? '' : 'opacity-70'}
                                />
                                <span className="truncate">{label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom */}
                <div className="px-3 py-4 border-t border-slate-200 dark:border-slate-800 shrink-0 space-y-2">
                    <button
                        onClick={toggle}
                        className="flex items-center gap-3 px-4 h-10 text-[13px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60 w-full rounded-full transition-all duration-200"
                    >
                        {isDark
                            ? <Sun size={18} weight="regular" className="opacity-70" />
                            : <Moon size={18} weight="regular" className="opacity-70" />}
                        <span className="truncate">{isDark ? 'Chế độ sáng' : 'Chế độ tối'}</span>
                    </button>
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 px-4 h-10 text-[13px] font-medium text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100/60 dark:hover:bg-red-950/40 w-full rounded-full transition-all duration-200"
                    >
                        <SignOut size={18} weight="regular" className="opacity-70" />
                        <span className="truncate">Đăng xuất</span>
                    </button>

                    {/* User profile section */}
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-3 p-3 rounded-full bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 hover:from-slate-150 dark:hover:from-slate-700 transition-all duration-200 cursor-pointer">
                            <div className="size-9 bg-gradient-to-br from-yellow-400 via-pink-500 to-blue-500 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-sm">
                                Q
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold text-slate-900 dark:text-slate-200 truncate leading-none">
                                    Quản trị viên
                                </p>
                                <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                                    Administrator
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
                <header className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center px-5 gap-4 shrink-0 bg-white dark:bg-slate-950 sticky top-0 z-30 shadow-sm dark:shadow-lg dark:shadow-slate-900/20">

                    {/* Mobile menu toggle */}
                    <button
                        className="lg:hidden text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                        onClick={() => setOpen(!open)}
                    >
                        {open ? <X size={18} /> : <List size={18} />}
                    </button>

                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-[12px] min-w-0">
                        {segments.map((seg, i) => {
                            const isLast = i === segments.length - 1;
                            return (
                                <span key={seg} className="flex items-center gap-2 min-w-0">
                                    {i > 0 && (
                                        <span className="text-slate-300 dark:text-slate-600 select-none">›</span>
                                    )}
                                    <span className={
                                        isLast
                                            ? 'font-bold bg-gradient-to-r from-yellow-500 via-pink-500 to-blue-500 bg-clip-text text-transparent truncate'
                                            : 'text-slate-500 dark:text-slate-400 truncate'
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
                            className="hidden lg:flex size-9 items-center justify-center rounded-full text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-all duration-200"
                        >
                            {isDark ? <Sun size={18} /> : <Moon size={18} />}
                        </button>

                        {/* Status indicator */}
                        <div className="flex items-center gap-2 px-4 h-9 bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/40 border border-emerald-200 dark:border-emerald-800/60 rounded-full shadow-sm dark:shadow-emerald-950/20">
                            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Hoạt động</span>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-5 lg:p-8 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
                    {children}
                </main>
            </div>
        </div>
    );
}
