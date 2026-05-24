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
                bg-white/96 dark:bg-[#0b1020]/95 backdrop-blur-sm
                border-r border-slate-200 dark:border-slate-800/80
                transition-transform duration-300 ease-out
                ${open ? 'translate-x-0' : '-translate-x-full'}
                lg:translate-x-0
            `}>

                {/* Brand */}
                <div className="h-16 flex items-center px-5 border-b border-slate-200 dark:border-slate-800/80 shrink-0 gap-3 bg-white/85 dark:bg-[#0b1020]/85">
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <LogoIcon size={40} />
                            <div className="min-w-0">
                                <p className="text-[13px] font-semibold tracking-tight text-slate-900 dark:text-slate-100 leading-none">
                                    Trạm Cảm Xúc
                                </p>
                                <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 font-medium">
                                    Bảng quản trị
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
                    {NAV.map(({ href, label, icon: Icon, exact }) => {
                        const active = isActive(href, exact);
                        return (
                            <Link
                                key={href}
                                href={href}
                                onClick={() => setOpen(false)}
                            className={`
                                group flex items-center gap-3 px-3.5 h-10 text-[13px] rounded-2xl transition-all duration-200 font-medium
                                ${active
                                    ? 'bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/20'
                                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                                }
                            `}
                            >
                                <span className={`size-7 rounded-xl flex items-center justify-center transition-colors ${
                                    active
                                        ? 'bg-white/20'
                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800/90 dark:text-slate-300 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                                }`}>
                                    <Icon
                                        size={17}
                                        weight={active ? 'fill' : 'regular'}
                                    />
                                </span>
                                <span className="truncate">{label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom */}
                <div className="px-3 py-4 border-t border-slate-200 dark:border-slate-800/80 shrink-0 space-y-2">
                    <button
                        onClick={toggle}
                        className="flex items-center gap-3 px-4 h-10 text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60 w-full rounded-2xl transition-all duration-200"
                    >
                        {isDark
                            ? <Sun size={18} weight="regular" className="opacity-70" />
                            : <Moon size={18} weight="regular" className="opacity-70" />}
                        <span className="truncate">{isDark ? 'Chế độ sáng' : 'Chế độ tối'}</span>
                    </button>
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 px-4 h-10 text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100/60 dark:hover:bg-red-950/40 w-full rounded-2xl transition-all duration-200"
                    >
                        <SignOut size={18} weight="regular" className="opacity-70" />
                        <span className="truncate">Đăng xuất</span>
                    </button>

                    {/* User profile section */}
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 hover:from-slate-200 dark:hover:from-slate-700 transition-all duration-200 cursor-pointer">
                            <div className="size-9 bg-gradient-to-br from-yellow-400 via-pink-500 to-blue-500 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-sm">
                                Q
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold text-slate-900 dark:text-slate-100 truncate leading-none">
                                    Quản trị viên
                                </p>
                                <p className="text-[9px] text-slate-600 dark:text-slate-400 mt-0.5 font-mono">
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
                <header className="h-14 border-b border-slate-200 dark:border-slate-800/80 flex items-center px-5 gap-4 shrink-0 bg-white/90 dark:bg-[#0b1020]/90 backdrop-blur-sm sticky top-0 z-30 shadow-sm dark:shadow-lg dark:shadow-slate-900/20">

                    {/* Mobile menu toggle */}
                    <button
                        className="lg:hidden text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
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
                                            ? 'font-semibold bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 bg-clip-text text-transparent truncate'
                                            : 'text-slate-600 dark:text-slate-400 truncate'
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
                        <div className="flex items-center gap-2 px-4 h-9 bg-slate-100/90 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/70 rounded-full shadow-sm">
                            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Hoạt động</span>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-5 lg:p-8 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-[#090d1a] dark:via-[#0b1020] dark:to-[#0e152b]">
                    {children}
                </main>
            </div>
        </div>
    );
}
