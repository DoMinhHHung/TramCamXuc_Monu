'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { openAdminRealtime } from '@/lib/realtime';
import { ArrowClockwise, Trash, PencilSimple, Plus, X, Warning, Check } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { INPUT_STYLES, TYPOGRAPHY, BUTTON_STYLES, TABLE_STYLES } from '@/lib/styles/constants';

interface Artist {
    id: string;
    stageName: string;
    fullName?: string;
    biography?: string;
    avatarUrl?: string;
    followerCount?: number;
    totalSongs?: number;
    totalAlbums?: number;
    genres?: string[];
    createdAt?: string;
    updatedAt?: string;
}

interface PageResult<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
}

interface ArtistRequest {
    stageName: string;
    fullName?: string;
    biography?: string;
}



function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className={TYPOGRAPHY.label}>
                {label.toUpperCase()}
            </label>
            {children}
        </div>
    );
}

function Toast({ msg, type, onClose }: { msg: string; type: 'ok'|'err'; onClose: () => void }) {
    return (
        <div className={`fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-2.5 text-xs border shadow-lg
      animate-in fade-in slide-in-from-bottom-2 duration-200
      ${type === 'ok'
            ? 'bg-white dark:bg-emerald-950 border-zinc-200 dark:border-emerald-800 text-zinc-700 dark:text-emerald-300'
            : 'bg-white dark:bg-red-950 border-zinc-200 dark:border-red-800 text-zinc-700 dark:text-red-300'}`}>
            {type === 'ok' ? <Check size={12} weight="bold" className="text-emerald-500" /> : <Warning size={12} className="text-red-500" />}
            {msg}
            <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100 transition-opacity"><X size={11} /></button>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ArtistsPage() {
    const [artists, setArtists] = useState<Artist[]>([]);
    const [totalArtists, setTotalArtists] = useState(0);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize] = useState(12);
    const [totalPages, setTotalPages] = useState(1);
    const [toast, setToast] = useState<{ msg: string; type: 'ok'|'err' } | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const notify = (msg: string, type: 'ok'|'err') => {
        clearTimeout(timerRef.current);
        setToast({ msg, type });
        timerRef.current = setTimeout(() => setToast(null), 3500);
    };

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<ArtistRequest>({ stageName: '', fullName: '', biography: '' });
    const [busy, setBusy] = useState(false);

    const loadArtists = useCallback(async () => {
        setLoading(true);
        try {
            const query = searchQuery ? `&keyword=${encodeURIComponent(searchQuery)}` : '';
            const result = await apiFetch<PageResult<Artist>>(
                `/artists?page=${page}&size=${pageSize}${query}`,
                { ttlMs: 0 } // Disable cache for search results
            );
            setArtists(result?.content ?? []);
            setTotalArtists(result?.totalElements ?? 0);
            setTotalPages(result?.totalPages ?? 1);
        } catch (e: unknown) {
            notify((e as Error).message, 'err');
            setArtists([]);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, page, pageSize]);

    useEffect(() => {
        loadArtists();
    }, [loadArtists]);

    useEffect(() => {
        const close = openAdminRealtime(() => loadArtists());
        return () => close();
    }, [loadArtists]);

    const handleAddArtist = () => {
        setForm({ stageName: '', fullName: '', biography: '' });
        setEditingId(null);
        setShowModal(true);
    };

    const handleEditArtist = (artist: Artist) => {
        setForm({
            stageName: artist.stageName,
            fullName: artist.fullName || '',
            biography: artist.biography || '',
        });
        setEditingId(artist.id);
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.stageName.trim()) {
            notify('Vui lòng nhập tên nghệ sĩ', 'err');
            return;
        }

        setBusy(true);
        try {
            if (editingId) {
                await apiFetch(`/admin/artists/${editingId}`, {
                    method: 'PUT',
                    body: JSON.stringify(form),
                });
                notify('Cập nhật thành công', 'ok');
            } else {
                await apiFetch('/admin/artists', {
                    method: 'POST',
                    body: JSON.stringify(form),
                });
                notify('Tạo nghê sĩ thành công', 'ok');
            }
            setShowModal(false);
            setForm({ stageName: '', fullName: '', biography: '' });
            setEditingId(null);
            await loadArtists();
        } catch (e: unknown) {
            notify((e as Error).message, 'err');
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn chắc chắn muốn xóa nghệ sĩ này?')) return;
        try {
            await apiFetch(`/admin/artists/${id}`, { method: 'DELETE' });
            notify('Đã xóa nghệ sĩ', 'ok');
            await loadArtists();
        } catch (e: unknown) {
            notify((e as Error).message, 'err');
        }
    };

    return (
        <>
            {toast && <Toast {...toast} onClose={() => setToast(null)} />}
            
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 px-4 backdrop-blur-[2px]" onClick={() => setShowModal(false)}>
                    <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/[0.08] shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                         onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-white/[0.06]">
                            <div>
                                <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                                    {editingId ? 'Chỉnh sửa Nghệ sĩ' : 'Thêm Nghệ sĩ Mới'}
                                </p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white transition-colors">
                                <X size={14} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="px-5 py-4 space-y-4">
                            <Field label="Tên Nghệ sĩ *">
                                <input
                                    type="text"
                                    value={form.stageName}
                                    onChange={(e) => setForm({ ...form, stageName: e.target.value })}
                                    placeholder="Nhập tên nghệ sĩ..."
                                    className={INPUT_STYLES.base}
                                />
                            </Field>

                            <Field label="Tên Thật">
                                <input
                                    type="text"
                                    value={form.fullName}
                                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                                    placeholder="Nhập tên thật..."
                                    className={INPUT_STYLES.base}
                                />
                            </Field>

                            <Field label="Tiểu sử">
                                <textarea
                                    value={form.biography}
                                    onChange={(e) => setForm({ ...form, biography: e.target.value })}
                                    placeholder="Nhập tiểu sử nghệ sĩ..."
                                    className={`${INPUT_STYLES.base} h-20 py-2 resize-none`}
                                />
                            </Field>

                            <div className="pt-2 border-t border-zinc-100 dark:border-white/[0.06] flex gap-2">
                                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setShowModal(false)}>Hủy</Button>
                                <Button type="submit" size="sm" className="flex-1" disabled={busy}>
                                    {busy ? '···' : (editingId ? 'Cập nhật' : 'Tạo mới')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
                <div>
                    <h1 className="text-sm font-semibold text-zinc-900 dark:text-white">Quản lý Nghệ sĩ</h1>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mt-0.5">
                        {loading ? '···' : `${totalArtists.toLocaleString()} nghệ sĩ`}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon-sm" disabled={loading} onClick={() => loadArtists()} title="Làm mới">
                        <ArrowClockwise size={12} className={loading ? 'animate-spin' : ''} />
                    </Button>
                    <Button size="sm" className="gap-1.5" onClick={handleAddArtist}>
                        <Plus size={12} /> Thêm Nghệ sĩ
                    </Button>
                </div>
            </div>

            {/* Search */}
            <div className="mb-4 max-w-sm">
                <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onSearch={loadArtists}
                    placeholder="Tìm kiếm nghệ sĩ theo tên..."
                    label="Tìm kiếm"
                    clearable={true}
                />
            </div>

            {/* Table */}
            <div className={TABLE_STYLES.container + ' overflow-x-auto'}>
                <table className="w-full text-[11px] min-w-[640px]">
                    <thead>
                    <tr className="border-b border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-zinc-950">
                        {['Tên Nghệ sĩ', 'Tên Thật', 'Thống kê', ''].map(h => (
                            <th key={h} className={TABLE_STYLES.headerCell}>
                                {h.toUpperCase()}
                            </th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {loading
                        ? Array.from({ length: 4 }).map((_, i) => (
                            <tr key={i} className="border-b border-zinc-100 dark:border-white/[0.05]">
                                {Array.from({ length: 4 }).map((_, j) => (
                                    <td key={j} className="px-4 py-3">
                                        <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                                    </td>
                                ))}
                            </tr>
                        ))
                        : artists.length === 0
                            ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-12 text-center text-[11px] text-zinc-400 dark:text-zinc-600">
                                        Không tìm thấy nghệ sĩ nào.
                                    </td>
                                </tr>
                            )
                            : artists.map(artist => (
                                <tr key={artist.id}
                                    className="border-b border-zinc-100 dark:border-white/[0.05] hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            {artist.avatarUrl ? (
                                                <img src={artist.avatarUrl} alt={artist.stageName} className="size-8 rounded border border-white/10 object-cover" />
                                            ) : (
                                                <div className="size-8 rounded bg-zinc-100 dark:bg-zinc-800 border border-white/5 flex items-center justify-center text-zinc-500 font-medium text-[10px]">
                                                    {artist.stageName.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-medium text-zinc-900 dark:text-white">{artist.stageName}</p>
                                                {artist.biography && (
                                                    <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5 max-w-[150px] truncate">{artist.biography}</p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-500">
                                        {artist.fullName || '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2 items-center flex-wrap">
                                            <span className="inline-flex px-1.5 py-px text-[9px] bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500">
                                                {artist.totalSongs ?? 0} bài
                                            </span>
                                            <span className="inline-flex px-1.5 py-px text-[9px] bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500">
                                                {artist.totalAlbums ?? 0} album
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon-sm" onClick={() => handleEditArtist(artist)} title="Sửa">
                                                <PencilSimple size={12} />
                                            </Button>
                                            <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(artist.id)} title="Xóa">
                                                <Trash size={12} className="text-red-400" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                    }
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-600">
                        Trang <span className="text-zinc-600 dark:text-zinc-400 font-medium">{page}</span> / {totalPages}
                    </span>
                    <div className="flex gap-1">
                        <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                            <span className="text-[9px]">‹</span>
                        </Button>
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            const p = Math.max(1, page - 2) + i;
                            if (p > totalPages) return null;
                            return (
                                <Button key={p} variant={p === page ? 'default' : 'outline'} size="icon-sm" onClick={() => setPage(p)}>
                                    {p}
                                </Button>
                            );
                        })}
                        <Button variant="outline" size="icon-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                            <span className="text-[9px]">›</span>
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
}
