'use client';

import { useState, useEffect } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { Plus, PencilSimple, Trash, X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

interface Genre {
    id: string;
    name: string;
    description: string;
}

export default function GenresPage() {
    const [genres, setGenres] = useState<Genre[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ id: '', name: '', description: '' });
    const [submitting, setSubmitting] = useState(false);

    const loadGenres = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await apiFetch<Genre[]>('/genres');
            setGenres(data);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Lỗi tải danh sách thể loại');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadGenres();
    }, []);

    const handleOpenModal = (genre?: Genre) => {
        if (genre) {
            setFormData(genre);
            setIsEditing(true);
        } else {
            setFormData({ id: '', name: '', description: '' });
            setIsEditing(false);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData({ id: '', name: '', description: '' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (isEditing) {
                await apiFetch(`/genres/${formData.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ name: formData.name, description: formData.description })
                });
            } else {
                await apiFetch('/genres', {
                    method: 'POST',
                    body: JSON.stringify({ name: formData.name, description: formData.description })
                });
            }
            handleCloseModal();
            loadGenres();
        } catch (err) {
            alert(err instanceof ApiError ? err.message : 'Lỗi khi lưu thể loại');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa thể loại "${name}" không?`)) return;
        
        try {
            await apiFetch(`/genres/${id}`, { method: 'DELETE' });
            loadGenres();
        } catch (err) {
            alert(err instanceof ApiError ? err.message : 'Lỗi khi xóa thể loại');
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto w-full font-sans">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Quản lý Thể loại</h1>
                    <p className="text-base text-zinc-500 mt-2">Thêm, sửa, xóa các thể loại nhạc (Genres) trên hệ thống</p>
                </div>
                <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
                    <Plus weight="bold" /> Thêm thể loại
                </Button>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-base">
                    {error}
                </div>
            )}

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-base">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                        <tr>
                            <th className="px-6 py-4 font-medium">Tên thể loại</th>
                            <th className="px-6 py-4 font-medium">Mô tả</th>
                            <th className="px-6 py-4 font-medium text-right w-32">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {loading ? (
                            <tr>
                                <td colSpan={3} className="px-6 py-8 text-center text-zinc-500">Đang tải dữ liệu...</td>
                            </tr>
                        ) : genres.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-6 py-12 text-center">
                                    <div className="text-zinc-400 dark:text-zinc-600 mb-2">Chưa có thể loại nào</div>
                                    <button onClick={() => handleOpenModal()} className="text-blue-500 hover:text-blue-600 font-medium">
                                        Tạo thể loại đầu tiên +
                                    </button>
                                </td>
                            </tr>
                        ) : (
                            genres.map((genre) => (
                                <tr key={genre.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                                        {genre.name}
                                    </td>
                                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 max-w-md truncate">
                                        {genre.description || <span className="italic opacity-50">Không có mô tả</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => handleOpenModal(genre)}
                                                className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                                                title="Sửa"
                                            >
                                                <PencilSimple size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(genre.id, genre.name)}
                                                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                                title="Xóa"
                                            >
                                                <Trash size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                            <h3 className="font-semibold text-lg">{isEditing ? 'Sửa thể loại' : 'Thêm thể loại mới'}</h3>
                            <button onClick={handleCloseModal} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Tên thể loại *</label>
                                    <input 
                                        type="text" 
                                        id="name"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        className="w-full px-4 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        placeholder="VD: Pop, Rock, R&B..."
                                    />
                                </div>
                                <div>
                                    <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Mô tả</label>
                                    <textarea 
                                        id="description"
                                        rows={3}
                                        value={formData.description}
                                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                                        className="w-full px-4 py-2 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                                        placeholder="Mô tả về thể loại này (Tùy chọn)"
                                    ></textarea>
                                </div>
                            </div>
                            <div className="mt-8 flex items-center justify-end gap-3">
                                <button 
                                    type="button" 
                                    onClick={handleCloseModal}
                                    className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                >
                                    Hủy
                                </button>
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Thêm mới'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
