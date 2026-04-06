'use client';

import { useState, useEffect } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { Info } from '@phosphor-icons/react';

interface Album {
    id: string;
    title: string;
    ownerStageName: string;
    status: string;
    totalSongs: number;
    createdAt: string;
}

interface PageData {
    content: Album[];
    totalElements: number;
    totalPages: number;
}

export default function AlbumsPage() {
    const [albums, setAlbums] = useState<Album[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadAlbums = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await apiFetch<PageData>('/albums?size=100');
            setAlbums(data.content || []);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Lỗi tải danh sách Album');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAlbums();
    }, []);

    const handleChangeAlert = () => {
        alert("Chức năng Admin quản lý Album/Sửa/Xóa hiện đang được xây dựng ở Backend. Vui lòng quay lại sau.");
    }

    return (
        <div className="p-6 max-w-6xl mx-auto w-full font-sans">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Danh sách Albums (Public)</h1>
                    <p className="text-base text-zinc-500 mt-2">Xem danh sách các Albums đã được xuất bản bởi Nghệ sĩ</p>
                </div>
            </div>

            <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex gap-3 text-blue-700 dark:text-blue-400">
                <Info size={24} className="shrink-0" />
                <div className="text-base">
                    <strong>Lưu ý:</strong> Hiện tại Admin chỉ có thể <strong>xem</strong> các Album công khai. Việc chỉnh sửa/xóa Album hay kiểm duyệt Album nội bộ là quyền truy cập độc quyền của tác giả (Artist Profile) thông qua Gateway bảo mật.
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
                            <th className="px-6 py-4 font-semibold">Tên Album</th>
                            <th className="px-6 py-4 font-semibold">Nghệ sĩ sở hữu</th>
                            <th className="px-6 py-4 font-semibold">Số bài hát</th>
                            <th className="px-6 py-4 font-semibold">Trạng thái</th>
                            <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-zinc-500 font-medium">Đang tải dữ liệu...</td>
                            </tr>
                        ) : albums.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 font-medium">
                                    Chưa có Album public nào
                                </td>
                            </tr>
                        ) : (
                            albums.map((album) => (
                                <tr key={album.id} className="hover:bg-zinc-50 hover:dark:bg-zinc-800/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                                        {album.title}
                                    </td>
                                    <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300">
                                        {album.ownerStageName}
                                    </td>
                                    <td className="px-6 py-4 text-zinc-500">
                                        {album.totalSongs} bài hát
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 text-sm font-medium border rounded-full bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                                            {album.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={handleChangeAlert}
                                            className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                                        >
                                            Xem chi tiết
                                        </button>
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
