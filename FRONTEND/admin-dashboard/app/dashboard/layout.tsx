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
} from '@phosphor-icons/react';
import { useTheme } from '@/lib/theme';

const NAV = [
    { href: '/dashboard',          label: 'Overview',     icon: SquaresFour, exact: true  },
    { href: '/dashboard/users',    label: 'Người dùng',   icon: Users,       exact: false },
    { href: '/dashboard/music',    label: 'Music',        icon: MusicNote,   exact: false },
    { href: '/dashboard/payments', label: 'Payments',     icon: CreditCard,  exact: false },
    { href: '/dashboard/ads',      label: 'Quảng cáo',   icon: SpeakerHigh, exact: false },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router    = useRouter();
    const pathname  = usePathname();
    const { theme, toggle } = useTheme();
    const [open,    setOpen]    = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (!localStorage.getItem('access_token')) router.replace('/login');
    }, [router]);

    const logout = () => { localStorage.clear(); router.replace('/login'); };
    const isActive = (href: string, exact: boolean) =>
        exact ? pathname === href : pathname.startsWith(href);

    if (!mounted) return null;
    const isDark = theme === 'dark';

    return (
        <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-white flex transition-colors duration-200">

            {/* ── Sidebar ──────────────────────────────────────── */}
            <aside className={`
        fixed inset-y-0 left-0 z-50 w-52 flex flex-col
        bg-zinc-50 dark:bg-zinc-950
        border-r border-zinc-200 dark:border-white/[0.06]
        transition-transform duration-200 ease-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>

                {/* Brand */}
                <div className="h-12 flex items-center px-4 border-b border-zinc-200 dark:border-white/[0.06] shrink-0">
                    <div>
                        <p className="text-[10px] font-semibold tracking-[0.2em] text-zinc-900 dark:text-white">ADMIN</p>
                        <p className="text-[9px] text-zinc-400 dark:text-zinc-600 tracking-[0.1em]">MUSIC SOCIAL</p>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 p-2 space-y-px overflow-y-auto">
                    {NAV.map(({ href, label, icon: Icon, exact }) => {
                        const active = isActive(href, exact);
                        return (
                            <Link
                                key={href}
                                href={href}
                                onClick={() => setOpen(false)}
                                className={`
                  flex items-center gap-2.5 px-3 h-8 text-[11px] transition-all
                  ${active
                                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-black font-medium'
                                    : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.05]'
                                }
                `}
                            >
                                <Icon size={13} weight={active ? 'bold' : 'regular'} />
                                {label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom */}
                <div className="p-2 border-t border-zinc-200 dark:border-white/[0.06] shrink-0 space-y-px">
                    <button
                        onClick={toggle}
                        className="flex items-center gap-2.5 px-3 h-8 text-[11px] text-zinc-500 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.05] w-full transition-all"
                    >
                        {isDark ? <Sun size={13} /> : <Moon size={13} />}
                        {isDark ? 'Chế độ sáng' : 'Chế độ tối'}
                    </button>
                    <button
                        onClick={logout}
                        className="flex items-center gap-2.5 px-3 h-8 text-[11px] text-zinc-500 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.05] w-full transition-all"
                    >
                        <SignOut size={13} />
                        Đăng xuất
                    </button>
                </div>
            </aside>

            {open && (
                <div className="fixed inset-0 z-40 bg-black/60 dark:bg-black/70 lg:hidden" onClick={() => setOpen(false)} />
            )}

            {/* ── Main ─────────────────────────────────────────── */}
            <div className="flex-1 lg:ml-52 flex flex-col min-h-screen">
                <header className="h-12 border-b border-zinc-200 dark:border-white/[0.06] flex items-center px-4 gap-3 shrink-0 bg-white dark:bg-black">
                    <button className="lg:hidden text-zinc-400 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-colors" onClick={() => setOpen(!open)}>
                        {open ? <X size={15} /> : <List size={15} />}
                    </button>
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 dark:text-zinc-600">
                        {pathname.split('/').filter(Boolean).map((seg, i, arr) => (
                            <span key={seg} className="flex items-center gap-1.5">
                {i > 0 && <span>/</span>}
                                <span className={i === arr.length - 1 ? 'text-zinc-600 dark:text-zinc-400' : ''}>{seg}</span>
              </span>
                        ))}
                    </div>
                    <div className="ml-auto flex items-center lg:hidden">
                        <button onClick={toggle} className="text-zinc-400 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-colors p-1">
                            {isDark ? <Sun size={14} /> : <Moon size={14} />}
                        </button>
                    </div>
                </header>
                <main className="flex-1 p-5 lg:p-7 bg-white dark:bg-black">{children}</main>
            </div>
        </div>
    );
}