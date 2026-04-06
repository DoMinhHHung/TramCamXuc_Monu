'use client';

import { useState, useEffect } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { ShieldCheck, ShieldWarning, Ban } from '@phosphor-icons/react';

interface Artist {
    id: string;
    userId: string;
    stageName: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'BANNED';
    createdAt: string;
}

interface PageData {
    content: Artist[];
    totalElements: number;
    totalPages: number;
}

export default function ArtistsPage() {
    const [artists, setArtists] = useState<Artist[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadArtists = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await apiFetch<PageData>('/artists?size=100');
            setArtists(data.content || []);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Lỗi tải danh sách nghệ sĩ');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadArtists();
    }, []);

    const handleChangeStatus = async (id: string, stageName: string, status: string) => {
        if (!window.confirm(`Bạn có chắc chắn muốn đổi trạng thái của "${stageName}" thành ${status}?`)) return;
        
        try {
            await apiFetch(`/artists/${id}/status?status=${status}`, { method: 'PUT' });
            loadArtists();
        } catch (err) {
            alert(err instanceof ApiError ? err.message : 'Lỗi khi đổi trạng thái');
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
            case 'PENDING': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
            case 'REJECTED': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
            case 'BANNED': return 'bg-zinc-200 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700';
            default: return 'bg-zinc-100 text-zinc-700 border-zinc-200';
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto w-full font-sans">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Duyệt Nghệ sĩ (Artists)</h1>
                    <p className="text-base text-zinc-500 mt-2">Quản lý và phê duyệt hồ sơ nghệ sĩ trên hệ thống</p>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-base">
                    {error}
                </div>
            )}

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-base">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                        <tr>
                            <th className="px-6 py-4 font-semibold">Tên nghệ sĩ</th>
                            <th className="px-6 py-4 font-semibold">Trạng thái</th>
                            <th className="px-6 py-4 font-semibold">Ngày tham gia</th>
                            <th className="px-6 py-4 font-semibold text-right w-48">Phê duyệt</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-zinc-500 font-medium">Đang tải dữ liệu...</td>
                            </tr>
                        ) : artists.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-zinc-400 font-medium">
                                    Chưa có nghệ sĩ nào đăng ký
                                </td>
                            </tr>
                        ) : (
                            artists.map((artist) => (
                                <tr key={artist.id} className="hover:bg-zinc-50 hover:dark:bg-zinc-800/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                                        {artist.stageName}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 text-sm font-medium border rounded-full ${getStatusStyle(artist.status)}`}>
                                            {artist.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-zinc-500">
                                        {new Date(artist.createdAt).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            {artist.status !== 'APPROVED' && (
                                                <button 
                                                    onClick={() => handleChangeStatus(artist.id, artist.stageName, 'APPROVED')}
                                                    className="p-2 text-green-600 hover:bg-green-50 dark:text-green-500 dark:hover:bg-green-900/20 rounded-md transition-colors"
                                                    title="Phê duyệt"
                                                >
                                                    <ShieldCheck size={20} weight="fill" />
                                                </button>
                                            )}
                                            {artist.status === 'PENDING' && (
                                                <button 
                                                    onClick={() => handleChangeStatus(artist.id, artist.stageName, 'REJECTED')}
                                                    className="p-2 text-amber-600 hover:bg-amber-50 dark:text-amber-500 dark:hover:bg-amber-900/20 rounded-md transition-colors"
                                                    title="Từ chối"
                                                >
                                                    <ShieldWarning size={20} weight="fill" />
                                                </button>
                                            )}
                                            {artist.status !== 'BANNED' && (
                                                <button 
                                                    onClick={() => handleChangeStatus(artist.id, artist.stageName, 'BANNED')}
                                                    className="p-2 text-red-600 hover:bg-red-50 dark:text-red-500 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                                    title="Khóa vĩnh viễn"
                                                >
                                                    <Ban size={20} weight="fill" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
