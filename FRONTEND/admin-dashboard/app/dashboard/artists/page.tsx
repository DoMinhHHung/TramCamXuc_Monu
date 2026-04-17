'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { openAdminRealtime } from '@/lib/realtime';
import { User, ArrowClockwise, Trash, PencilSimple, MagnifyingGlass } from '@phosphor-icons/react';

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

export default function ArtistsPage() {
    const [artists, setArtists] = useState<Artist[]>([]);
    const [totalArtists, setTotalArtists] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize] = useState(12);

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<ArtistRequest>({ stageName: '', fullName: '', biography: '' });

    const loadArtists = useCallback(async () => {
        setLoading(true);
        try {
            const query = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
            const result = await apiFetch<PageResult<Artist>>(
                `/artists?page=${page}&size=${pageSize}${query}`,
                { ttlMs: 5_000 }
            );
            setArtists(result?.content ?? []);
            setTotalArtists(result?.totalElements ?? 0);
            setError(null);
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Không thể tải danh sách nghệ sĩ');
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
            setError('Vui lòng nhập tên nghệ sĩ');
            return;
        }

        try {
            if (editingId) {
                await apiFetch(`/admin/artists/${editingId}`, {
                    method: 'PUT',
                    body: JSON.stringify(form),
                });
            } else {
                await apiFetch('/admin/artists', {
                    method: 'POST',
                    body: JSON.stringify(form),
                });
            }
            setShowModal(false);
            setForm({ stageName: '', fullName: '', biography: '' });
            setEditingId(null);
            await loadArtists();
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Không thể lưu nghệ sĩ');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn chắc chắn muốn xóa nghệ sĩ này?')) return;
        try {
            await apiFetch(`/admin/artists/${id}`, { method: 'DELETE' });
            await loadArtists();
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Không thể xóa nghệ sĩ');
        }
    };

    const totalPages = Math.ceil(totalArtists / pageSize);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Quản lý Nghệ sĩ</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Tổng cộng {totalArtists} nghệ sĩ</p>
                </div>
                <button
                    onClick={handleAddArtist}
                    className="flex items-center gap-2 px-4 h-10 rounded-full bg-gradient-to-r from-yellow-400 via-pink-500 to-blue-500 text-white font-medium hover:shadow-lg hover:shadow-pink-500/30 transition-all duration-200"
                >
                    <User size={18} weight="fill" />
                    Thêm Nghệ sĩ
                </button>
            </div>

            {/* Search bar */}
            <div className="relative">
                <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder="Tìm kiếm nghệ sĩ..."
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setPage(1);
                    }}
                    className="w-full pl-10 pr-4 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
            </div>

            {/* Error message */}
            {error && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60">
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
            )}

            {/* Loading state */}
            {loading && (
                <div className="flex justify-center items-center py-12">
                    <ArrowClockwise size={24} className="text-pink-500 animate-spin" />
                </div>
            )}

            {/* Artists table */}
            {!loading && artists.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Tên Nghệ sĩ
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Tên Thật
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Thống kê
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Hành động
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {artists.map((artist) => (
                                <tr
                                    key={artist.id}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            {artist.avatarUrl ? (
                                                <img
                                                    src={artist.avatarUrl}
                                                    alt={artist.stageName}
                                                    className="w-10 h-10 rounded-full object-cover"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-blue-500 flex items-center justify-center text-white font-bold">
                                                    {artist.stageName.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white">
                                                    {artist.stageName}
                                                </p>
                                                {artist.biography && (
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                                                        {artist.biography}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                        {artist.fullName || '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-3 text-xs text-slate-600 dark:text-slate-400">
                                            {artist.totalSongs && <span>🎵 {artist.totalSongs} bài</span>}
                                            {artist.totalAlbums && <span>📀 {artist.totalAlbums} album</span>}
                                            {artist.followerCount && <span>👥 {artist.followerCount}</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEditArtist(artist)}
                                                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                                                title="Chỉnh sửa"
                                            >
                                                <PencilSimple size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(artist.id)}
                                                className="p-2 rounded-lg bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-all"
                                                title="Xóa"
                                            >
                                                <Trash size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Empty state */}
            {!loading && artists.length === 0 && (
                <div className="text-center py-12">
                    <User size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-slate-600 dark:text-slate-400">Chưa có nghệ sĩ nào</p>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPage(p)}
                            className={`px-3 h-9 rounded-lg text-sm font-medium transition-all ${
                                page === p
                                    ? 'bg-gradient-to-r from-yellow-400 via-pink-500 to-blue-500 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                            {editingId ? 'Chỉnh sửa Nghệ sĩ' : 'Thêm Nghệ sĩ Mới'}
                        </h2>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Tên Nghệ sĩ *
                                </label>
                                <input
                                    type="text"
                                    value={form.stageName}
                                    onChange={(e) => setForm({ ...form, stageName: e.target.value })}
                                    placeholder="Nhập tên nghệ sĩ"
                                    className="w-full px-3 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Tên Thật
                                </label>
                                <input
                                    type="text"
                                    value={form.fullName}
                                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                                    placeholder="Nhập tên thật"
                                    className="w-full px-3 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Tiểu sử
                                </label>
                                <textarea
                                    value={form.biography}
                                    onChange={(e) => setForm({ ...form, biography: e.target.value })}
                                    placeholder="Nhập tiểu sử nghệ sĩ"
                                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                                    rows={3}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all font-medium"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 h-9 rounded-lg bg-gradient-to-r from-yellow-400 via-pink-500 to-blue-500 text-white hover:shadow-lg hover:shadow-pink-500/30 transition-all font-medium"
                                >
                                    {editingId ? 'Cập nhật' : 'Tạo mới'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
