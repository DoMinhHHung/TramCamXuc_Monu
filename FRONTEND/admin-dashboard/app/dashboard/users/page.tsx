'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import {
    CaretLeft,
    CaretRight,
    Eye,
    Prohibit,
    Check,
    X,
    ArrowClockwise,
    MagnifyingGlass,
    Funnel,
    CaretDown,
} from '@phosphor-icons/react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = 'ACTIVE' | 'BANNED' | 'PENDING_VERIFICATION';
type Role   = 'USER' | 'ADMIN' | 'ARTIST';

interface User {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
    dob?: string;
    gender?: string;
    role: Role;
    status: Status;
    pickFavorite?: boolean;
    favoriteGenreIds?: string[];
    favoriteArtistIds?: string[];
}

interface PageResult {
    content: User[];
    totalElements: number;
    totalPages: number;
    number: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<Status, string> = {
    ACTIVE:               'Hoạt động',
    BANNED:               'Bị khóa',
    PENDING_VERIFICATION: 'Chờ xác minh',
};

const STATUS_CLS: Record<Status, string> = {
    ACTIVE:               'text-emerald-600 dark:text-emerald-400 bg-emerald-50  dark:bg-emerald-400/10 border-emerald-200  dark:border-emerald-400/20',
    BANNED:               'text-red-600     dark:text-red-400     bg-red-50      dark:bg-red-400/10     border-red-200      dark:border-red-400/20',
    PENDING_VERIFICATION: 'text-amber-600   dark:text-amber-400   bg-amber-50    dark:bg-amber-400/10   border-amber-200    dark:border-amber-400/20',
};

const ROLE_LABEL: Record<Role, string> = { USER: 'User', ADMIN: 'Admin', ARTIST: 'Artist' };

const ROLE_CLS: Record<Role, string> = {
    USER:   'text-zinc-600   dark:text-zinc-400   bg-zinc-100   dark:bg-zinc-400/10   border-zinc-300   dark:border-zinc-400/20',
    ADMIN:  'text-purple-600 dark:text-purple-400 bg-purple-50  dark:bg-purple-400/10 border-purple-200  dark:border-purple-400/20',
    ARTIST: 'text-sky-600    dark:text-sky-400    bg-sky-50     dark:bg-sky-400/10    border-sky-200     dark:border-sky-400/20',
};

const ROLE_OPTIONS:   Array<{ value: Role   | 'ALL'; label: string }> = [
    { value: 'ALL',    label: 'Tất cả Role'   },
    { value: 'USER',   label: 'User'           },
    { value: 'ARTIST', label: 'Artist'         },
];

const STATUS_OPTIONS: Array<{ value: Status | 'ALL'; label: string }> = [
    { value: 'ALL',                  label: 'Tất cả trạng thái' },
    { value: 'ACTIVE',               label: 'Hoạt động'          },
    { value: 'BANNED',               label: 'Bị khóa'            },
    { value: 'PENDING_VERIFICATION', label: 'Chờ xác minh'       },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ label, cls }: { label: string; cls: string }) {
    return (
        <span className={`inline-flex items-center px-1.5 py-px text-[10px] font-medium border ${cls}`}>
      {label}
    </span>
    );
}

function Avatar({ user }: { user: User }) {
    return (
        <div className="size-7 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.06] flex items-center justify-center text-[11px] text-zinc-500 dark:text-zinc-400 shrink-0 overflow-hidden">
            {user.avatarUrl
                ? (
                    <img 
                        src={`${user.avatarUrl}?w=32&h=32&q=75`}
                        alt={user.fullName} 
                        className="size-full object-cover"
                        loading="lazy"
                        decoding="async"
                    />
                )
                : (user.fullName?.[0] ?? '?').toUpperCase()
            }
        </div>
    );
}

function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err'; onClose: () => void }) {
    return (
        <div className={`
      fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-2.5
      text-xs border animate-in fade-in slide-in-from-bottom-2 duration-200 shadow-lg
      ${type === 'ok'
            ? 'bg-white dark:bg-emerald-950 border-zinc-200 dark:border-emerald-800 text-zinc-700 dark:text-emerald-300'
            : 'bg-white dark:bg-red-950     border-zinc-200 dark:border-red-800     text-zinc-700 dark:text-red-300'
        }
    `}>
            {type === 'ok'
                ? <Check    size={12} weight="bold" className="text-emerald-500 dark:text-emerald-400" />
                : <Prohibit size={12}               className="text-red-500     dark:text-red-400"     />
            }
            {msg}
            <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100 transition-opacity">
                <X size={11} />
            </button>
        </div>
    );
}

// Custom Select dropdown
function Select<T extends string>({
                                      value,
                                      onChange,
                                      options,
                                      icon,
                                  }: {
    value: T;
    onChange: (v: T) => void;
    options: Array<{ value: T; label: string }>;
    icon?: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const selected = options.find(o => o.value === value);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(p => !p)}
                className={`
          flex items-center gap-1.5 h-8 px-2.5 text-[11px]
          border transition-all outline-none
          ${open
                    ? 'border-zinc-400 dark:border-white/30 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white'
                    : 'border-zinc-200 dark:border-white/10 bg-white dark:bg-black text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-white/20 hover:text-zinc-900 dark:hover:text-white'
                }
        `}
            >
                {icon && <span className="text-zinc-400 dark:text-zinc-500">{icon}</span>}
                <span>{selected?.label}</span>
                <CaretDown size={10} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="
          absolute top-full left-0 mt-1 z-50 min-w-[160px]
          bg-white dark:bg-zinc-950
          border border-zinc-200 dark:border-white/[0.1]
          shadow-lg dark:shadow-black/50
          animate-in fade-in slide-in-from-top-1 duration-100
        ">
                    {options.map(o => (
                        <button
                            key={o.value}
                            onClick={() => { onChange(o.value); setOpen(false); }}
                            className={`
                flex items-center w-full px-3 h-8 text-[11px] text-left transition-colors
                ${o.value === value
                                ? 'bg-zinc-100 dark:bg-white/[0.08] text-zinc-900 dark:text-white font-medium'
                                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.04] hover:text-zinc-900 dark:hover:text-white'
                            }
              `}
                        >
                            {o.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function UserDetailModal({
                             user,
                             busy,
                             onClose,
                             onBan,
                         }: {
    user: User;
    busy: boolean;
    onClose: () => void;
    onBan: (u: User) => void;
}) {
    const rows: [string, string][] = [
        ['ID',             user.id],
        ['Role',           ROLE_LABEL[user.role]   ?? user.role],
        ['Trạng thái',     STATUS_LABEL[user.status] ?? user.status],
        ['Giới tính',      user.gender ?? '—'],
        ['Ngày sinh',      user.dob    ?? '—'],
        ['Onboarding',     user.pickFavorite ? 'Đã hoàn thành' : 'Chưa hoàn thành'],
        ['Genres yêu thích',  `${user.favoriteGenreIds?.length ?? 0} genres`],
        ['Artists yêu thích', `${user.favoriteArtistIds?.length ?? 0} artists`],
    ];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 px-4 backdrop-blur-[2px]"
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/[0.08] shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-white/[0.06]">
                    <div className="flex items-center gap-3">
                        <Avatar user={user} />
                        <div>
                            <p className="text-xs font-semibold text-zinc-900 dark:text-white">{user.fullName}</p>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-500 mt-0.5">{user.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-600 dark:hover:text-white transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-2.5">
                    {rows.map(([k, v]) => (
                        <div key={k} className="flex items-start justify-between gap-4 text-[11px]">
                            <span className="text-zinc-400 dark:text-zinc-600 shrink-0">{k}</span>
                            <span className="text-zinc-700 dark:text-zinc-300 text-right break-all">{v}</span>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-zinc-100 dark:border-white/[0.06] flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>
                        Đóng
                    </Button>
                    <Button
                        variant={user.status === 'BANNED' ? 'secondary' : 'destructive'}
                        size="sm"
                        className="flex-1"
                        disabled={busy}
                        onClick={() => onBan(user)}
                    >
                        {busy ? '···' : user.status === 'BANNED' ? 'Mở khóa' : 'Khóa tài khoản'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export default function UsersPage() {
    const [users,      setUsers]      = useState<User[]>([]);
    const [total,      setTotal]      = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [page,       setPage]       = useState(1);
    const [loading,    setLoading]    = useState(true);
    const [detail,     setDetail]     = useState<User | null>(null);
    const [busy,       setBusy]       = useState<string | null>(null);
    const [toast,      setToast]      = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

    // ── Filter state ──────────────────────────────────────────────────────
    const [search,       setSearch]       = useState('');
    const [roleFilter,   setRoleFilter]   = useState<Role   | 'ALL'>('ALL');
    const [statusFilter, setStatusFilter] = useState<Status | 'ALL'>('ALL');
    const [showFilters,  setShowFilters]  = useState(false);

    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // ── Helpers ───────────────────────────────────────────────────────────
    const notify = (msg: string, type: 'ok' | 'err') => {
        clearTimeout(timerRef.current);
        setToast({ msg, type });
        timerRef.current = setTimeout(() => setToast(null), 3500);
    };

    // ── Fetch (server-side pagination) ────────────────────────────────────
    const load = useCallback(async (p: number) => {
        setLoading(true);
        try {
            const res = await apiFetch<PageResult>(`/users?page=${p}&size=${PAGE_SIZE}`);
            setUsers(res.content);
            setTotal(res.totalElements);
            setTotalPages(res.totalPages);
        } catch (e: unknown) {
            notify((e as Error).message, 'err');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(page); }, [page, load]);

    // ── Client-side search + filter (applied on top of current page) ──────
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return users.filter(u => {
            const matchSearch =
                !q ||
                u.fullName.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                u.id.toLowerCase().includes(q);
            const matchRole   = roleFilter   === 'ALL' || u.role   === roleFilter;
            const matchStatus = statusFilter === 'ALL' || u.status === statusFilter;
            return matchSearch && matchRole && matchStatus;
        });
    }, [users, search, roleFilter, statusFilter]);

    const hasFilter = search || roleFilter !== 'ALL' || statusFilter !== 'ALL';

    const clearFilters = () => {
        setSearch('');
        setRoleFilter('ALL');
        setStatusFilter('ALL');
    };

    // ── Ban / Unban ───────────────────────────────────────────────────────
    const handleBan = async (user: User) => {
        setBusy(user.id);
        try {
            await apiFetch(`/users/${user.id}/ban`, { method: 'PATCH' });
            const next: Status = user.status === 'BANNED' ? 'ACTIVE' : 'BANNED';
            notify(next === 'BANNED' ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản', 'ok');
            const patch = (u: User) => u.id === user.id ? { ...u, status: next } : u;
            setUsers(prev => prev.map(patch));
            if (detail?.id === user.id) setDetail(d => d ? patch(d) : null);
        } catch (e: unknown) {
            notify((e as Error).message, 'err');
        } finally {
            setBusy(null);
        }
    };

    // ── Pagination helpers ────────────────────────────────────────────────
    const pageNums = useMemo(() => {
        const delta = 2;
        const range: number[] = [];
        for (
            let i = Math.max(1, page - delta);
            i <= Math.min(totalPages, page + delta);
            i++
        ) range.push(i);
        return range;
    }, [page, totalPages]);

    // ─────────────────────────────────────────────────────────────────────

    return (
        <>
            {toast && <Toast {...toast} onClose={() => setToast(null)} />}

            {/* ── Page header ─────────────────────────────────────────────── */}
            <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
                <div>
                    <h1 className="text-sm font-semibold text-zinc-900 dark:text-white">Người dùng</h1>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mt-0.5">
                        {loading
                            ? '···'
                            : hasFilter
                                ? `${filtered.length} kết quả · tổng ${total.toLocaleString()}`
                                : `${total.toLocaleString()} tài khoản`
                        }
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Toggle filter panel */}
                    <Button
                        variant={showFilters ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setShowFilters(p => !p)}
                        className="gap-1.5"
                    >
                        <Funnel size={12} />
                        Bộ lọc
                        {hasFilter && (
                            <span className="size-4 bg-white dark:bg-black text-[9px] font-bold text-black dark:text-white flex items-center justify-center">
                !
              </span>
                        )}
                    </Button>

                    {/* Reload */}
                    <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => { clearFilters(); load(page); }}
                        disabled={loading}
                        title="Làm mới"
                    >
                        <ArrowClockwise size={12} className={loading ? 'animate-spin' : ''} />
                    </Button>
                </div>
            </div>

            {/* ── Filter panel ────────────────────────────────────────────── */}
            {showFilters && (
                <div className="
          mb-4 p-4 border border-zinc-200 dark:border-white/[0.08]
          bg-zinc-50 dark:bg-zinc-950
          animate-in fade-in slide-in-from-top-1 duration-150
        ">
                    <div className="flex flex-wrap items-center gap-3">

                        {/* Search */}
                        <div className="relative flex-1 min-w-[200px]">
                            <MagnifyingGlass
                                size={12}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-600 pointer-events-none"
                            />
                            <input
                                type="text"
                                placeholder="Tên, email, ID..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="
                  w-full h-8 pl-8 pr-3 text-[11px]
                  bg-white dark:bg-black
                  border border-zinc-200 dark:border-white/10
                  text-zinc-900 dark:text-white
                  placeholder:text-zinc-400 dark:placeholder:text-zinc-700
                  outline-none focus:border-zinc-400 dark:focus:border-white/30
                  transition-colors
                "
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:text-zinc-600 dark:hover:text-white transition-colors"
                                >
                                    <X size={11} />
                                </button>
                            )}
                        </div>

                        {/* Role filter */}
                        <Select
                            value={roleFilter}
                            onChange={v => setRoleFilter(v as Role | 'ALL')}
                            options={ROLE_OPTIONS as Array<{ value: Role | 'ALL'; label: string }>}
                        />

                        {/* Status filter */}
                        <Select
                            value={statusFilter}
                            onChange={v => setStatusFilter(v as Status | 'ALL')}
                            options={STATUS_OPTIONS as Array<{ value: Status | 'ALL'; label: string }>}
                        />

                        {/* Clear */}
                        {hasFilter && (
                            <button
                                onClick={clearFilters}
                                className="text-[11px] text-zinc-400 dark:text-zinc-600 hover:text-zinc-700 dark:hover:text-white transition-colors underline underline-offset-2"
                            >
                                Xóa bộ lọc
                            </button>
                        )}
                    </div>

                    {/* Active filter badges */}
                    {hasFilter && (
                        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-zinc-200 dark:border-white/[0.06]">
                            {search && (
                                <FilterTag label={`Tìm: "${search}"`} onRemove={() => setSearch('')} />
                            )}
                            {roleFilter !== 'ALL' && (
                                <FilterTag label={ROLE_LABEL[roleFilter as Role]} onRemove={() => setRoleFilter('ALL')} />
                            )}
                            {statusFilter !== 'ALL' && (
                                <FilterTag label={STATUS_LABEL[statusFilter as Status]} onRemove={() => setStatusFilter('ALL')} />
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Table ───────────────────────────────────────────────────── */}
            <div className="border border-zinc-200 dark:border-white/[0.08] overflow-x-auto">
                <table className="w-full text-[11px] min-w-[560px]">
                    <thead>
                    <tr className="border-b border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-zinc-950">
                        {['Người dùng', 'Email', 'Role', 'Trạng thái', ''].map(h => (
                            <th
                                key={h}
                                className="text-left px-4 py-2.5 text-[10px] tracking-widest text-zinc-400 dark:text-zinc-600 font-medium"
                            >
                                {h.toUpperCase()}
                            </th>
                        ))}
                    </tr>
                    </thead>

                    <tbody>
                    {loading
                        ? Array.from({ length: 8 }).map((_, i) => (
                            <tr key={i} className="border-b border-zinc-100 dark:border-white/[0.05]">
                                {Array.from({ length: 5 }).map((_, j) => (
                                    <td key={j} className="px-4 py-3">
                                        <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800/80 animate-pulse w-full" />
                                    </td>
                                ))}
                            </tr>
                        ))
                        : filtered.length === 0
                            ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-14 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <MagnifyingGlass size={20} className="text-zinc-300 dark:text-zinc-700" />
                                            <p className="text-[11px] text-zinc-400 dark:text-zinc-600">
                                                {hasFilter ? 'Không tìm thấy kết quả phù hợp' : 'Không có dữ liệu'}
                                            </p>
                                            {hasFilter && (
                                                <button
                                                    onClick={clearFilters}
                                                    className="text-[11px] text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white underline underline-offset-2 transition-colors mt-1"
                                                >
                                                    Xóa bộ lọc
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                            : filtered.map(u => (
                                <tr
                                    key={u.id}
                                    className="border-b border-zinc-100 dark:border-white/[0.05] hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors group"
                                >
                                    <td className="px-4 py-2.5">
                                        <div className="flex items-center gap-2.5">
                                            <Avatar user={u} />
                                            <span className="text-zinc-900 dark:text-white font-medium truncate max-w-[130px]">
                          {u.fullName}
                        </span>
                                        </div>
                                    </td>

                                    <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-500 truncate max-w-[180px]">
                                        {/* Highlight search match */}
                                        {search
                                            ? <Highlighted text={u.email} query={search} />
                                            : u.email
                                        }
                                    </td>

                                    <td className="px-4 py-2.5">
                                        <Badge label={ROLE_LABEL[u.role] ?? u.role} cls={ROLE_CLS[u.role] ?? ROLE_CLS.USER} />
                                    </td>

                                    <td className="px-4 py-2.5">
                                        <Badge label={STATUS_LABEL[u.status] ?? u.status} cls={STATUS_CLS[u.status] ?? ''} />
                                    </td>

                                    <td className="px-4 py-2.5">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => setDetail(u)}
                                                title="Xem chi tiết"
                                            >
                                                <Eye size={12} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                disabled={busy === u.id}
                                                onClick={() => handleBan(u)}
                                                title={u.status === 'BANNED' ? 'Mở khóa' : 'Khóa'}
                                            >
                                                {u.status === 'BANNED'
                                                    ? <Check    size={12} className="text-emerald-500" />
                                                    : <Prohibit size={12} className="text-red-500"    />
                                                }
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                    }
                    </tbody>
                </table>
            </div>

            {/* ── Pagination ──────────────────────────────────────────────── */}
            {totalPages > 1 && !hasFilter && (
                <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
          <span className="text-[11px] text-zinc-400 dark:text-zinc-600">
            Trang{' '}
              <span className="text-zinc-600 dark:text-zinc-400 font-medium">{page}</span>
              {' '}/ {totalPages}
              {' '}·{' '}
              <span className="text-zinc-600 dark:text-zinc-400 font-medium">
              {total.toLocaleString()}
            </span>{' '}
              tài khoản
          </span>

                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="icon-sm"
                            disabled={page <= 1}
                            onClick={() => setPage(1)}
                            title="Trang đầu"
                        >
                            <span className="text-[9px] font-bold">«</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="icon-sm"
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                        >
                            <CaretLeft size={11} />
                        </Button>

                        {pageNums[0] > 1 && (
                            <>
                                <Button variant="outline" size="icon-sm" onClick={() => setPage(1)}>1</Button>
                                {pageNums[0] > 2 && (
                                    <span className="text-[10px] text-zinc-400 dark:text-zinc-600 px-1">···</span>
                                )}
                            </>
                        )}

                        {pageNums.map(p => (
                            <Button
                                key={p}
                                variant={p === page ? 'default' : 'outline'}
                                size="icon-sm"
                                onClick={() => setPage(p)}
                            >
                                {p}
                            </Button>
                        ))}

                        {pageNums[pageNums.length - 1] < totalPages && (
                            <>
                                {pageNums[pageNums.length - 1] < totalPages - 1 && (
                                    <span className="text-[10px] text-zinc-400 dark:text-zinc-600 px-1">···</span>
                                )}
                                <Button variant="outline" size="icon-sm" onClick={() => setPage(totalPages)}>
                                    {totalPages}
                                </Button>
                            </>
                        )}

                        <Button
                            variant="outline"
                            size="icon-sm"
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                        >
                            <CaretRight size={11} />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon-sm"
                            disabled={page >= totalPages}
                            onClick={() => setPage(totalPages)}
                            title="Trang cuối"
                        >
                            <span className="text-[9px] font-bold">»</span>
                        </Button>
                    </div>
                </div>
            )}

            {/* ── Detail modal ────────────────────────────────────────────── */}
            {detail && (
                <UserDetailModal
                    user={detail}
                    busy={busy === detail.id}
                    onClose={() => setDetail(null)}
                    onBan={handleBan}
                />
            )}
        </>
    );
}

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
    return (
        <span className="inline-flex items-center gap-1 px-2 py-px text-[10px] bg-zinc-200 dark:bg-white/[0.08] text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-white/[0.1]">
      {label}
            <button onClick={onRemove} className="hover:text-red-500 dark:hover:text-red-400 transition-colors ml-0.5">
        <X size={9} />
      </button>
    </span>
    );
}

function Highlighted({ text, query }: { text: string; query: string }) {
    if (!query.trim()) return <>{text}</>;
    const q = query.trim().toLowerCase();
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return <>{text}</>;
    return (
        <>
            {text.slice(0, idx)}
            <mark className="bg-amber-100 dark:bg-amber-400/20 text-amber-800 dark:text-amber-300 not-italic">
                {text.slice(idx, idx + q.length)}
            </mark>
            {text.slice(idx + q.length)}
        </>
    );
}
