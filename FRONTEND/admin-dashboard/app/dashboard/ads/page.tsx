'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Plus, PencilSimple, Archive, ArrowClockwise,
    X, Check, Warning, Eye, ChartBar, Funnel, CaretDown,
    SpeakerHigh, Upload,
} from '@phosphor-icons/react';

const BASE = '/api';
const token = () => (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null);

// ─── Types ────────────────────────────────────────────────────────────────────
type AdStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

interface Ad {
    id: string;
    advertiserName: string;
    title: string;
    description: string;
    targetUrl: string;
    audioUrl: string;
    audioFileKey: string;
    durationSeconds: number;
    status: AdStatus;
    cpmVnd: number;
    budgetVnd: number;
    estimatedRevenueVnd: number;
    ctr: number;
    totalImpressions: number;
    totalClicks: number;
    startDate: string;
    endDate: string;
    createdAt: string;
}

interface AdStats {
    id: string;
    advertiserName: string;
    title: string;
    status: AdStatus;
    cpmVnd: number;
    budgetVnd: number;
    estimatedRevenueVnd: number;
    budgetUsedPercent: number;
    totalImpressions: number;
    totalClicks: number;
    ctr: number;
    startDate: string;
    endDate: string;
}

interface PageResult { content: Ad[]; totalElements: number; totalPages: number }

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<AdStatus, string> = { ACTIVE: 'Active', PAUSED: 'Paused', ARCHIVED: 'Archived' };
const STATUS_CLS: Record<AdStatus, string> = {
    ACTIVE:   'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-400/10 border-emerald-200 dark:border-emerald-400/20',
    PAUSED:   'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-400/10 border-amber-200 dark:border-amber-400/20',
    ARCHIVED: 'text-zinc-500 dark:text-zinc-600 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700',
};

const fmtVnd = (n: number) =>
    n === 0 ? '0 ₫' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

const fmtNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg: string; type: 'ok'|'err'; onClose: () => void }) {
    return (
        <div className={`fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-2.5 text-xs border shadow-lg
      animate-in fade-in slide-in-from-bottom-2 duration-200
      ${type === 'ok'
            ? 'bg-white dark:bg-emerald-950 border-zinc-200 dark:border-emerald-800 text-zinc-700 dark:text-emerald-300'
            : 'bg-white dark:bg-red-950 border-zinc-200 dark:border-red-800 text-zinc-700 dark:text-red-300'}`}>
            {type === 'ok' ? <Check size={12} weight="bold" className="text-emerald-500" /> : <Warning size={12} className="text-red-500" />}
            {msg}
            <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100"><X size={11} /></button>
        </div>
    );
}

// ─── Simple Select ────────────────────────────────────────────────────────────
function Select<T extends string>({ value, onChange, options }: {
    value: T; onChange: (v: T) => void;
    options: Array<{ value: T; label: string }>;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);
    const selected = options.find(o => o.value === value);
    return (
        <div ref={ref} className="relative">
            <button onClick={() => setOpen(p => !p)}
                    className={`flex items-center gap-1.5 h-8 px-2.5 text-[11px] border transition-all outline-none
          ${open ? 'border-zinc-400 dark:border-white/30 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white'
                        : 'border-zinc-200 dark:border-white/10 bg-white dark:bg-black text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-white/20'}`}>
                {selected?.label}
                <CaretDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute top-full left-0 mt-1 z-50 min-w-[140px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/[0.1] shadow-lg animate-in fade-in duration-100">
                    {options.map(o => (
                        <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                                className={`flex items-center w-full px-3 h-8 text-[11px] text-left transition-colors
                ${o.value === value
                                    ? 'bg-zinc-100 dark:bg-white/[0.08] text-zinc-900 dark:text-white font-medium'
                                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.04] hover:text-zinc-900 dark:hover:text-white'}`}>
                            {o.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Field ────────────────────────────────────────────────────────────────────
const inputCls = `w-full h-8 bg-white dark:bg-black border border-zinc-200 dark:border-white/10
  text-zinc-900 dark:text-white text-[11px] px-3
  outline-none focus:border-zinc-400 dark:focus:border-white/30
  placeholder:text-zinc-400 dark:placeholder:text-zinc-700 transition-colors`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="text-[10px] font-medium tracking-widest text-zinc-500 dark:text-zinc-600 block mb-1.5">{label.toUpperCase()}</label>
            {children}
        </div>
    );
}

// ─── Ad Form Modal (create/edit) ──────────────────────────────────────────────
interface AdFormData {
    advertiserName: string; title: string; description: string;
    targetUrl: string; cpmVnd: string; budgetVnd: string;
    startDate: string; endDate: string; durationSeconds: string;
    status: AdStatus;
}

const defaultAdForm: AdFormData = {
    advertiserName: '', title: '', description: '', targetUrl: '',
    cpmVnd: '0', budgetVnd: '0', startDate: '', endDate: '',
    durationSeconds: '30', status: 'ACTIVE',
};

function AdModal({ ad, onClose, onSave }: {
    ad: Ad | null;
    onClose: () => void;
    onSave: (data: AdFormData, file: File | null) => Promise<void>;
}) {
    const [form,    setForm]    = useState<AdFormData>(ad ? {
        advertiserName: ad.advertiserName,
        title: ad.title,
        description: ad.description ?? '',
        targetUrl: ad.targetUrl,
        cpmVnd: String(ad.cpmVnd),
        budgetVnd: String(ad.budgetVnd),
        startDate: ad.startDate ?? '',
        endDate: ad.endDate ?? '',
        durationSeconds: String(ad.durationSeconds),
        status: ad.status,
    } : defaultAdForm);
    const [file,    setFile]    = useState<File | null>(null);
    const [busy,    setBusy]    = useState(false);
    const [err,     setErr]     = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    const set = (k: keyof AdFormData, v: string) => setForm(f => ({ ...f, [k]: v }));

    const submit = async () => {
        if (!ad && !file) { setErr('Vui lòng chọn file audio MP3'); return; }
        setBusy(true); setErr('');
        try { await onSave(form, file); }
        catch (e: unknown) { setErr((e as Error).message); }
        finally { setBusy(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 px-4 backdrop-blur-[2px]" onClick={onClose}>
            <div className="w-full max-w-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/[0.08] shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
                 onClick={e => e.stopPropagation()}>

                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-white/[0.06] shrink-0">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-white">{ad ? 'Cập nhật quảng cáo' : 'Tạo quảng cáo mới'}</p>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-600 dark:hover:text-white transition-colors"><X size={14} /></button>
                </div>

                <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1">
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Advertiser *">
                            <input value={form.advertiserName} onChange={e => set('advertiserName', e.target.value)} placeholder="Grab, Shopee..." className={inputCls} />
                        </Field>
                        <Field label="Tiêu đề *">
                            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Tiêu đề quảng cáo" className={inputCls} />
                        </Field>
                    </div>
                    <Field label="Mô tả">
                        <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Mô tả ngắn..." className={inputCls} />
                    </Field>
                    <Field label="Target URL *">
                        <input value={form.targetUrl} onChange={e => set('targetUrl', e.target.value)} placeholder="https://..." className={inputCls} />
                    </Field>

                    <div className="grid grid-cols-3 gap-3">
                        <Field label="CPM (VNĐ)">
                            <input type="number" value={form.cpmVnd} onChange={e => set('cpmVnd', e.target.value)} min="0" className={inputCls} />
                        </Field>
                        <Field label="Budget (VNĐ)">
                            <input type="number" value={form.budgetVnd} onChange={e => set('budgetVnd', e.target.value)} min="0" className={inputCls} />
                        </Field>
                        <Field label="Thời lượng (s)">
                            <input type="number" value={form.durationSeconds} onChange={e => set('durationSeconds', e.target.value)} min="1" className={inputCls} />
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Ngày bắt đầu">
                            <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className={inputCls} />
                        </Field>
                        <Field label="Ngày kết thúc">
                            <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} className={inputCls} />
                        </Field>
                    </div>

                    {ad && (
                        <Field label="Trạng thái">
                            <select value={form.status} onChange={e => set('status', e.target.value as AdStatus)} className={inputCls}>
                                <option value="ACTIVE">Active</option>
                                <option value="PAUSED">Paused</option>
                                <option value="ARCHIVED">Archived</option>
                            </select>
                        </Field>
                    )}

                    {/* File upload */}
                    <Field label={ad ? 'Thay file audio (tùy chọn)' : 'File audio MP3 *'}>
                        <div
                            className={`border-2 border-dashed h-16 flex items-center justify-center gap-2 cursor-pointer transition-colors
                ${file
                                ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/10'
                                : 'border-zinc-200 dark:border-white/[0.1] hover:border-zinc-300 dark:hover:border-white/[0.2]'}`}
                            onClick={() => fileRef.current?.click()}
                        >
                            <input ref={fileRef} type="file" accept="audio/mpeg,audio/mp3,.mp3" className="hidden"
                                   onChange={e => setFile(e.target.files?.[0] ?? null)} />
                            {file
                                ? <><Check size={14} className="text-emerald-500" /><span className="text-[11px] text-emerald-600 dark:text-emerald-400">{file.name}</span></>
                                : <><Upload size={14} className="text-zinc-400 dark:text-zinc-600" /><span className="text-[11px] text-zinc-400 dark:text-zinc-600">Click để chọn file MP3</span></>
                            }
                        </div>
                    </Field>

                    {err && <p className="text-[11px] text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2">{err}</p>}
                </div>

                <div className="px-5 py-4 border-t border-zinc-100 dark:border-white/[0.06] flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>Hủy</Button>
                    <Button size="sm" className="flex-1" disabled={busy} onClick={submit}>
                        {busy ? '···' : ad ? 'Cập nhật' : 'Tạo quảng cáo'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── Stats Modal ──────────────────────────────────────────────────────────────
function StatsModal({ adId, onClose }: { adId: string; onClose: () => void }) {
    const [stats,   setStats]   = useState<AdStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${BASE}/admin/ads/${adId}/stats`, {
            headers: { Authorization: `Bearer ${token()}` },
        })
            .then(r => r.json())
            .then(d => setStats(d))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [adId]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 px-4 backdrop-blur-[2px]" onClick={onClose}>
            <div className="w-full max-w-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/[0.08] shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                 onClick={e => e.stopPropagation()}>

                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-white/[0.06]">
                    <div className="flex items-center gap-2.5">
                        <ChartBar size={14} className="text-zinc-500 dark:text-zinc-500" />
                        <p className="text-xs font-semibold text-zinc-900 dark:text-white">Thống kê quảng cáo</p>
                    </div>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-600 dark:hover:text-white transition-colors"><X size={14} /></button>
                </div>

                <div className="px-5 py-4">
                    {loading
                        ? <div className="h-32 flex items-center justify-center">
                            <div className="size-5 border border-zinc-300 dark:border-zinc-700 border-t-zinc-600 dark:border-t-white animate-spin" />
                        </div>
                        : stats ? (
                            <div className="space-y-2.5">
                                {/* Header info */}
                                <div className="pb-2.5 border-b border-zinc-100 dark:border-white/[0.06]">
                                    <p className="text-xs font-semibold text-zinc-900 dark:text-white">{stats.title}</p>
                                    <p className="text-[10px] text-zinc-500 dark:text-zinc-500 mt-0.5">{stats.advertiserName}</p>
                                </div>

                                {/* Stats grid */}
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { label: 'Impressions', value: stats.totalImpressions.toLocaleString(), color: 'text-blue-600 dark:text-blue-400' },
                                        { label: 'Clicks', value: stats.totalClicks.toLocaleString(), color: 'text-purple-600 dark:text-purple-400' },
                                        { label: 'CTR', value: stats.ctr.toFixed(2) + '%', color: 'text-amber-600 dark:text-amber-400' },
                                        { label: 'Revenue Est.', value: fmtVnd(stats.estimatedRevenueVnd), color: 'text-emerald-600 dark:text-emerald-400' },
                                    ].map(s => (
                                        <div key={s.label} className="border border-zinc-100 dark:border-white/[0.06] p-3">
                                            <p className="text-[10px] text-zinc-400 dark:text-zinc-600">{s.label}</p>
                                            <p className={`text-sm font-semibold mt-0.5 ${s.color}`}>{s.value}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Budget progress */}
                                {stats.budgetVnd > 0 && (
                                    <div className="pt-2.5 border-t border-zinc-100 dark:border-white/[0.06]">
                                        <div className="flex justify-between text-[10px] mb-1.5">
                                            <span className="text-zinc-400 dark:text-zinc-600">Budget used</span>
                                            <span className="text-zinc-600 dark:text-zinc-400 font-medium">{Math.min(100, Number(stats.budgetUsedPercent)).toFixed(1)}%</span>
                                        </div>
                                        <div className="h-1.5 bg-zinc-100 dark:bg-white/[0.06] overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 transition-all duration-500"
                                                style={{ width: `${Math.min(100, Number(stats.budgetUsedPercent))}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[10px] mt-1">
                                            <span className="text-zinc-400 dark:text-zinc-600">{fmtVnd(stats.estimatedRevenueVnd)}</span>
                                            <span className="text-zinc-500 dark:text-zinc-500">{fmtVnd(stats.budgetVnd)}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Schedule */}
                                {(stats.startDate || stats.endDate) && (
                                    <div className="flex gap-4 text-[11px] pt-2.5 border-t border-zinc-100 dark:border-white/[0.06]">
                                        {stats.startDate && (
                                            <div>
                                                <p className="text-[10px] text-zinc-400 dark:text-zinc-600">Bắt đầu</p>
                                                <p className="text-zinc-700 dark:text-zinc-300">{stats.startDate}</p>
                                            </div>
                                        )}
                                        {stats.endDate && (
                                            <div>
                                                <p className="text-[10px] text-zinc-400 dark:text-zinc-600">Kết thúc</p>
                                                <p className="text-zinc-700 dark:text-zinc-300">{stats.endDate}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-[11px] text-zinc-400 dark:text-zinc-600 text-center py-6">Không thể tải thống kê</p>
                        )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const STATUS_OPTIONS: Array<{ value: AdStatus | 'ALL'; label: string }> = [
    { value: 'ALL',      label: 'Tất cả'  },
    { value: 'ACTIVE',   label: 'Active'  },
    { value: 'PAUSED',   label: 'Paused'  },
    { value: 'ARCHIVED', label: 'Archived'},
];

export default function AdsPage() {
    const [ads,        setAds]        = useState<Ad[]>([]);
    const [total,      setTotal]      = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [page,       setPage]       = useState(1);
    const [loading,    setLoading]    = useState(true);

    const [statusFilter, setStatusFilter] = useState<AdStatus | 'ALL'>('ALL');
    const [showFilter,   setShowFilter]   = useState(false);

    const [editAd,    setEditAd]    = useState<Ad | null | 'new'>(null);
    const [statsAdId, setStatsAdId] = useState<string | null>(null);
    const [archiveAd, setArchiveAd] = useState<Ad | null>(null);

    const [toast, setToast] = useState<{ msg: string; type: 'ok'|'err' } | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const notify = (msg: string, type: 'ok'|'err') => {
        clearTimeout(timerRef.current);
        setToast({ msg, type });
        timerRef.current = setTimeout(() => setToast(null), 3500);
    };

    const load = useCallback(async (p: number, status: AdStatus | 'ALL') => {
        setLoading(true);
        try {
            const q = status !== 'ALL' ? `&status=${status}` : '';
            const url = `/admin/ads?page=${p - 1}&size=10${q}`;
            const res = await fetch(`${BASE}${url}`, {
                headers: { Authorization: `Bearer ${token()}` },
            });
            if (!res.ok) {
                let msg = `HTTP ${res.status}`;
                try { const err = await res.json(); msg = err.message ?? msg; } catch { /* ignore */ }
                if (res.status === 404) msg = 'Route /admin/ads chưa được cấu hình trong Gateway';
                else if (res.status === 503) msg = 'Ads service không khả dụng';
                notify(msg, 'err');
                return;
            }
            const data = await res.json();
            setAds(data.content ?? []);
            setTotal(data.totalElements ?? 0);
            setTotalPages(data.totalPages ?? 1);
        } catch (e: unknown) { notify((e as Error).message, 'err'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(page, statusFilter); }, [page, statusFilter, load]);

    // Multipart save
    const handleSave = async (form: ReturnType<typeof Object.create>, file: File | null) => {
        const isEdit = editAd && editAd !== 'new';
        const metadata = {
            advertiserName: form.advertiserName,
            title: form.title,
            description: form.description,
            targetUrl: form.targetUrl,
            cpmVnd: Number(form.cpmVnd),
            budgetVnd: Number(form.budgetVnd),
            startDate: form.startDate || null,
            endDate: form.endDate || null,
            durationSeconds: Number(form.durationSeconds),
            ...(isEdit ? { status: form.status } : {}),
        };

        const fd = new FormData();
        fd.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        if (file) fd.append('audio', file);

        const url  = isEdit ? `${BASE}/admin/ads/${(editAd as Ad).id}` : `${BASE}/admin/ads`;
        const method = isEdit ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { Authorization: `Bearer ${token()}` },
            body: fd,
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message ?? 'Lỗi không xác định');
        }

        notify(isEdit ? 'Cập nhật thành công' : 'Tạo quảng cáo thành công', 'ok');
        setEditAd(null);
        load(page, statusFilter);
    };

    const handleArchive = async (ad: Ad) => {
        try {
            const res = await fetch(`${BASE}/admin/ads/${ad.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token()}` },
            });
            if (!res.ok) throw new Error('Không thể archive');
            notify('Đã archive quảng cáo', 'ok');
            setArchiveAd(null);
            load(page, statusFilter);
        } catch (e: unknown) { notify((e as Error).message, 'err'); }
    };

    return (
        <>
            {toast && <Toast {...toast} onClose={() => setToast(null)} />}
            {editAd !== null && (
                <AdModal ad={editAd === 'new' ? null : editAd as Ad} onClose={() => setEditAd(null)} onSave={handleSave} />
            )}
            {statsAdId && <StatsModal adId={statsAdId} onClose={() => setStatsAdId(null)} />}
            {archiveAd && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 px-4" onClick={() => setArchiveAd(null)}>
                    <div className="w-full max-w-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/[0.08] shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-150"
                         onClick={e => e.stopPropagation()}>
                        <div className="size-8 bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-3">
                            <Archive size={16} className="text-amber-500" />
                        </div>
                        <p className="text-xs font-semibold text-zinc-900 dark:text-white mb-1">Archive "{archiveAd.title}"?</p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-500 mb-4">Quảng cáo sẽ bị ẩn và không phát nữa.</p>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => setArchiveAd(null)}>Hủy</Button>
                            <Button variant="secondary" size="sm" className="flex-1" onClick={() => handleArchive(archiveAd)}>Archive</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
                <div>
                    <h1 className="text-sm font-semibold text-zinc-900 dark:text-white">Quảng cáo</h1>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mt-0.5">
                        {loading ? '···' : `${total.toLocaleString()} quảng cáo`}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={showFilter ? 'default' : 'outline'}
                        size="sm" className="gap-1.5"
                        onClick={() => setShowFilter(p => !p)}
                    >
                        <Funnel size={12} />
                        Lọc
                        {statusFilter !== 'ALL' && <span className="size-4 bg-white dark:bg-black text-[9px] font-bold text-black dark:text-white flex items-center justify-center">!</span>}
                    </Button>
                    <Button variant="outline" size="icon-sm" disabled={loading} onClick={() => load(page, statusFilter)}>
                        <ArrowClockwise size={12} className={loading ? 'animate-spin' : ''} />
                    </Button>
                    <Button size="sm" className="gap-1.5" onClick={() => setEditAd('new')}>
                        <Plus size={12} /> Tạo mới
                    </Button>
                </div>
            </div>

            {/* Filter */}
            {showFilter && (
                <div className="mb-4 p-3 border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-zinc-950 flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-150">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-600 tracking-wider">STATUS</span>
                    <Select value={statusFilter} onChange={v => { setStatusFilter(v); setPage(1); }} options={STATUS_OPTIONS} />
                    {statusFilter !== 'ALL' && (
                        <button onClick={() => { setStatusFilter('ALL'); setPage(1); }}
                                className="text-[11px] text-zinc-400 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-white underline underline-offset-2 transition-colors">
                            Xóa lọc
                        </button>
                    )}
                </div>
            )}

            {/* Table */}
            <div className="border border-zinc-200 dark:border-white/[0.08] overflow-x-auto">
                <table className="w-full text-[11px] min-w-[700px]">
                    <thead>
                    <tr className="border-b border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-zinc-950">
                        {['Quảng cáo', 'Status', 'Impressions', 'Clicks', 'CTR', 'Budget', ''].map(h => (
                            <th key={h} className="text-left px-4 py-2.5 text-[10px] tracking-widest text-zinc-400 dark:text-zinc-600 font-medium">
                                {h.toUpperCase()}
                            </th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {loading
                        ? Array.from({ length: 6 }).map((_, i) => (
                            <tr key={i} className="border-b border-zinc-100 dark:border-white/[0.05]">
                                {Array.from({ length: 7 }).map((_, j) => (
                                    <td key={j} className="px-4 py-3">
                                        <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 animate-pulse w-full" />
                                    </td>
                                ))}
                            </tr>
                        ))
                        : ads.length === 0
                            ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-14 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <SpeakerHigh size={20} className="text-zinc-300 dark:text-zinc-700" />
                                            <p className="text-[11px] text-zinc-400 dark:text-zinc-600">Chưa có quảng cáo nào</p>
                                        </div>
                                    </td>
                                </tr>
                            )
                            : ads.map(ad => (
                                <tr key={ad.id} className="border-b border-zinc-100 dark:border-white/[0.05] hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-4 py-2.5">
                                        <div>
                                            <p className="font-medium text-zinc-900 dark:text-white truncate max-w-[160px]">{ad.title}</p>
                                            <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5">{ad.advertiserName}</p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-1.5 py-px text-[10px] font-medium border ${STATUS_CLS[ad.status] ?? ''}`}>
                        {STATUS_LABEL[ad.status] ?? ad.status}
                      </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300 font-medium">
                                        {fmtNum(ad.totalImpressions ?? 0)}
                                    </td>
                                    <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-500">
                                        {fmtNum(ad.totalClicks ?? 0)}
                                    </td>
                                    <td className="px-4 py-2.5">
                      <span className={`font-medium ${
                          (ad.ctr ?? 0) > 5 ? 'text-emerald-600 dark:text-emerald-400' :
                              (ad.ctr ?? 0) > 2 ? 'text-amber-600 dark:text-amber-400' :
                                  'text-zinc-500 dark:text-zinc-500'
                      }`}>
                        {(ad.ctr ?? 0).toFixed(2)}%
                      </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-500">
                                        {fmtVnd(ad.budgetVnd ?? 0)}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon-sm" onClick={() => setStatsAdId(ad.id)} title="Thống kê">
                                                <ChartBar size={12} />
                                            </Button>
                                            <Button variant="ghost" size="icon-sm" onClick={() => setEditAd(ad)} title="Sửa">
                                                <PencilSimple size={12} />
                                            </Button>
                                            {ad.status !== 'ARCHIVED' && (
                                                <Button variant="ghost" size="icon-sm" onClick={() => setArchiveAd(ad)} title="Archive">
                                                    <Archive size={12} className="text-amber-500" />
                                                </Button>
                                            )}
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
                        <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => setPage(p => p-1)}>
                            <span className="text-[9px]">‹</span>
                        </Button>
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            const p = Math.max(1, page - 2) + i;
                            if (p > totalPages) return null;
                            return (
                                <Button key={p} variant={p === page ? 'default' : 'outline'} size="icon-sm" onClick={() => setPage(p)}>{p}</Button>
                            );
                        })}
                        <Button variant="outline" size="icon-sm" disabled={page >= totalPages} onClick={() => setPage(p => p+1)}>
                            <span className="text-[9px]">›</span>
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
}

