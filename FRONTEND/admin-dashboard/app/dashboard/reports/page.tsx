'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    ArrowClockwise, Check, Warning, X, Play, Pause, Stop,
    SpeakerHigh, MusicNote, Funnel, CaretDown,
} from '@phosphor-icons/react';

const BASE = '/api';
const token = () => (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null);

// ─── Types ───────────────────────────────────────────────────────────────────
type ReportStatus = 'PENDING' | 'CONFIRMED' | 'DISMISSED';
type ReportReason = 'COPYRIGHT_VIOLATION' | 'EXPLICIT_CONTENT' | 'HATE_SPEECH' | 'SPAM' | 'MISINFORMATION' | 'OTHER';

interface Report {
    id: string;
    songId: string;
    songTitle: string;
    reporterId: string | null;
    reason: ReportReason;
    description: string | null;
    status: ReportStatus;
    reviewedBy: string | null;
    reviewedAt: string | null;
    adminNote: string | null;
    createdAt: string;
}

interface PageResult { content: Report[]; totalElements: number; totalPages: number }

// ─── Constants ───────────────────────────────────────────────────────────────
const REASON_LABEL: Record<ReportReason, string> = {
    COPYRIGHT_VIOLATION: 'Vi phạm bản quyền',
    EXPLICIT_CONTENT:    'Nội dung người lớn',
    HATE_SPEECH:         'Kích động thù địch',
    SPAM:                'Spam / Rác',
    MISINFORMATION:      'Thông tin sai lệch',
    OTHER:               'Khác',
};
const REASON_CLS: Record<ReportReason, string> = {
    COPYRIGHT_VIOLATION: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-400/10 border-red-200 dark:border-red-400/20',
    EXPLICIT_CONTENT:    'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-400/10 border-orange-200 dark:border-orange-400/20',
    HATE_SPEECH:         'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-400/10 border-red-200 dark:border-red-400/20',
    SPAM:                'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-400/10 border-amber-200 dark:border-amber-400/20',
    MISINFORMATION:      'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-400/10 border-purple-200 dark:border-purple-400/20',
    OTHER:               'text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700',
};
const STATUS_LABEL: Record<ReportStatus, string> = { PENDING: 'Chờ xử lý', CONFIRMED: 'Vi phạm', DISMISSED: 'Bác bỏ' };
const STATUS_CLS: Record<ReportStatus, string> = {
    PENDING:   'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-400/10 border-amber-200 dark:border-amber-400/20',
    CONFIRMED: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-400/10 border-red-200 dark:border-red-400/20',
    DISMISSED: 'text-zinc-500 dark:text-zinc-600 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700',
};

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
                <div className="absolute top-full left-0 mt-1 z-50 min-w-[180px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/[0.1] shadow-lg animate-in fade-in duration-100">
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

// ─── Audio Player ─────────────────────────────────────────────────────────────
// Uses Hls.js loaded via CDN for HLS support in Chrome
function AudioPlayer({ songId, songTitle }: { songId: string; songTitle: string }) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const hlsRef = useRef<unknown>(null);
    const [playing, setPlaying] = useState(false);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [streamUrl, setStreamUrl] = useState<string | null>(null);
    const [error, setError] = useState('');

    const loadHls = async () => {
        if (streamUrl) return; // already loaded
        setLoading(true);
        setError('');
        try {
            // Get presigned stream URL from backend
            const res = await fetch(`${BASE}/songs/${songId}/stream`, {
                headers: { Authorization: `Bearer ${token()}` },
            });
            if (!res.ok) throw new Error('Không thể tải stream');
            const data = await res.json();
            const url = data.result || data;
            setStreamUrl(url);
        } catch (e: unknown) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!streamUrl || !audioRef.current) return;
        const audio = audioRef.current;

        // Dynamically load hls.js
        const initHls = async () => {
            if (typeof window === 'undefined') return;
            // @ts-expect-error dynamic import
            if (!window.Hls) {
                await new Promise<void>((resolve) => {
                    const s = document.createElement('script');
                    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.4.12/hls.min.js';
                    s.onload = () => resolve();
                    document.head.appendChild(s);
                });
            }
            // @ts-expect-error dynamic
            const Hls = window.Hls;
            if (Hls.isSupported()) {
                const hls = new Hls();
                hlsRef.current = hls;
                hls.loadSource(streamUrl);
                hls.attachMedia(audio);
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    audio.play().then(() => setPlaying(true)).catch(() => {});
                });
            } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
                audio.src = streamUrl;
                audio.play().then(() => setPlaying(true)).catch(() => {});
            }
        };
        initHls();
        return () => {
            // @ts-expect-error dynamic
            if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
        };
    }, [streamUrl]);

    const togglePlay = async () => {
        if (!streamUrl) {
            await loadHls();
            return;
        }
        const audio = audioRef.current;
        if (!audio) return;
        if (playing) { audio.pause(); setPlaying(false); }
        else { audio.play(); setPlaying(true); }
    };

    const stop = () => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.pause();
        audio.currentTime = 0;
        setPlaying(false);
        setProgress(0);
    };

    const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

    return (
        <div className="flex items-center gap-3 p-3 border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-zinc-900">
            <audio
                ref={audioRef}
                onTimeUpdate={() => { const a = audioRef.current; if (a) setProgress(a.currentTime); }}
                onDurationChange={() => { const a = audioRef.current; if (a) setDuration(a.duration); }}
                onEnded={() => { setPlaying(false); setProgress(0); }}
            />
            <div className="size-7 bg-zinc-900 dark:bg-white flex items-center justify-center shrink-0">
                <SpeakerHigh size={13} className="text-white dark:text-black" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] text-zinc-400 dark:text-zinc-600 truncate">{songTitle}</p>
                <div
                    className="mt-1.5 h-1 bg-zinc-200 dark:bg-white/[0.08] cursor-pointer"
                    onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pct = (e.clientX - rect.left) / rect.width;
                        const audio = audioRef.current;
                        if (audio && duration) { audio.currentTime = pct * duration; setProgress(pct * duration); }
                    }}
                >
                    <div
                        className="h-full bg-zinc-900 dark:bg-white transition-all"
                        style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }}
                    />
                </div>
                <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-600">{fmt(progress)}</span>
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-600">{duration ? fmt(duration) : '--:--'}</span>
                </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon-sm" onClick={togglePlay} disabled={loading} title={playing ? 'Pause' : 'Play'}>
                    {loading ? <span className="size-3 border border-zinc-400 border-t-zinc-900 dark:border-t-white animate-spin" />
                             : playing ? <Pause size={12} /> : <Play size={12} />}
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={stop} title="Stop">
                    <Stop size={12} />
                </Button>
            </div>
            {error && <p className="text-[10px] text-red-500">{error}</p>}
        </div>
    );
}

// ─── Action Modal ──────────────────────────────────────────────────────────────
function ActionModal({ report, action, onClose, onConfirm }: {
    report: Report;
    action: 'confirm' | 'dismiss';
    onClose: () => void;
    onConfirm: (adminNote: string, deleteReason: string) => Promise<void>;
}) {
    const [adminNote, setAdminNote] = useState('');
    const [deleteReason, setDeleteReason] = useState('');
    const [busy, setBusy] = useState(false);

    const isConfirm = action === 'confirm';

    const submit = async () => {
        setBusy(true);
        try { await onConfirm(adminNote, deleteReason); }
        finally { setBusy(false); }
    };

    const inputCls = `w-full bg-white dark:bg-black border border-zinc-200 dark:border-white/10
      text-zinc-900 dark:text-white text-[11px] px-3 py-2
      outline-none focus:border-zinc-400 dark:focus:border-white/30
      placeholder:text-zinc-400 dark:placeholder:text-zinc-700 transition-colors resize-none`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 px-4 backdrop-blur-[2px]" onClick={onClose}>
            <div className="w-full max-w-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/[0.08] shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                 onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-white/[0.06]">
                    <div className="flex items-center gap-2">
                        <div className={`size-6 flex items-center justify-center ${isConfirm ? 'bg-red-50 dark:bg-red-900/20' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                            {isConfirm ? <Warning size={12} className="text-red-500" /> : <Check size={12} className="text-zinc-500" />}
                        </div>
                        <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                            {isConfirm ? 'Xác nhận vi phạm' : 'Bác bỏ báo cáo'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-600 dark:hover:text-white"><X size={14} /></button>
                </div>
                <div className="px-5 py-4 space-y-3">
                    <div>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-600 mb-1">Bài hát: <span className="text-zinc-900 dark:text-white font-medium">{report.songTitle}</span></p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-600">Lý do báo cáo: <span className={`inline-flex px-1.5 py-0.5 text-[9px] border ${REASON_CLS[report.reason]}`}>{REASON_LABEL[report.reason]}</span></p>
                    </div>
                    {isConfirm && (
                        <div>
                            <label className="text-[10px] font-medium tracking-widest text-zinc-500 dark:text-zinc-600 block mb-1.5">LÝ DO XÓA *</label>
                            <textarea
                                rows={2}
                                value={deleteReason}
                                onChange={e => setDeleteReason(e.target.value)}
                                placeholder="Vi phạm bản quyền đã được xác minh..."
                                className={inputCls}
                            />
                        </div>
                    )}
                    <div>
                        <label className="text-[10px] font-medium tracking-widest text-zinc-500 dark:text-zinc-600 block mb-1.5">GHI CHÚ ADMIN</label>
                        <textarea
                            rows={2}
                            value={adminNote}
                            onChange={e => setAdminNote(e.target.value)}
                            placeholder="Ghi chú của admin..."
                            className={inputCls}
                        />
                    </div>
                </div>
                <div className="px-5 py-4 border-t border-zinc-100 dark:border-white/[0.06] flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>Hủy</Button>
                    <Button
                        size="sm"
                        className={`flex-1 ${isConfirm ? 'bg-red-600 hover:bg-red-700 text-white border-transparent' : ''}`}
                        variant={isConfirm ? 'default' : 'secondary'}
                        disabled={busy || (isConfirm && !deleteReason.trim())}
                        onClick={submit}
                    >
                        {busy ? '···' : isConfirm ? 'Xác nhận vi phạm' : 'Bác bỏ báo cáo'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── Report Row ───────────────────────────────────────────────────────────────
function ReportRow({ report, onAction }: {
    report: Report;
    onAction: (report: Report, action: 'confirm' | 'dismiss') => void;
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-950">
            {/* Header row */}
            <div
                className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors"
                onClick={() => setExpanded(p => !p)}
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                            <MusicNote size={11} className="text-zinc-400 dark:text-zinc-600 shrink-0" />
                            <p className="text-[11px] font-medium text-zinc-900 dark:text-white truncate max-w-[200px]">{report.songTitle}</p>
                        </div>
                        <span className={`inline-flex items-center px-1.5 py-px text-[9px] font-medium border ${REASON_CLS[report.reason]}`}>
                            {REASON_LABEL[report.reason]}
                        </span>
                        <span className={`inline-flex items-center px-1.5 py-px text-[9px] font-medium border ${STATUS_CLS[report.status]}`}>
                            {STATUS_LABEL[report.status]}
                        </span>
                    </div>
                    {report.description && (
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5 truncate">{report.description}</p>
                    )}
                </div>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-600 shrink-0 hidden sm:block">
                    {new Date(report.createdAt).toLocaleDateString('vi-VN')}
                </p>
                <CaretDown size={12} className={`text-zinc-400 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </div>

            {/* Expanded panel */}
            {expanded && (
                <div className="border-t border-zinc-100 dark:border-white/[0.06] px-4 py-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">
                    {/* Audio player */}
                    <AudioPlayer songId={report.songId} songTitle={report.songTitle} />

                    {/* Report details */}
                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                        <div>
                            <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mb-0.5">ID Bài hát</p>
                            <p className="text-zinc-700 dark:text-zinc-300 font-mono text-[10px] break-all">{report.songId}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mb-0.5">Người báo cáo</p>
                            <p className="text-zinc-700 dark:text-zinc-300 font-mono text-[10px]">
                                {report.reporterId ? report.reporterId.substring(0, 8) + '…' : 'Ẩn danh'}
                            </p>
                        </div>
                        {report.description && (
                            <div className="col-span-2">
                                <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mb-0.5">Mô tả vi phạm</p>
                                <p className="text-zinc-700 dark:text-zinc-300 text-[10px]">{report.description}</p>
                            </div>
                        )}
                        {report.adminNote && (
                            <div className="col-span-2">
                                <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mb-0.5">Ghi chú admin</p>
                                <p className="text-zinc-700 dark:text-zinc-300 text-[10px]">{report.adminNote}</p>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    {report.status === 'PENDING' && (
                        <div className="flex gap-2 pt-2 border-t border-zinc-100 dark:border-white/[0.06]">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                onClick={(e) => { e.stopPropagation(); onAction(report, 'dismiss'); }}
                            >
                                <Check size={12} /> Bác bỏ
                            </Button>
                            <Button
                                size="sm"
                                className="gap-1.5 bg-red-600 hover:bg-red-700 text-white border-transparent"
                                onClick={(e) => { e.stopPropagation(); onAction(report, 'confirm'); }}
                            >
                                <Warning size={12} /> Xác nhận vi phạm
                            </Button>
                        </div>
                    )}
                    {report.status !== 'PENDING' && report.reviewedAt && (
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-600">
                            Đã xử lý lúc {new Date(report.reviewedAt).toLocaleString('vi-VN')}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Status options ───────────────────────────────────────────────────────────
const STATUS_OPTIONS: Array<{ value: ReportStatus | 'ALL'; label: string }> = [
    { value: 'ALL',       label: 'Tất cả'    },
    { value: 'PENDING',   label: 'Chờ xử lý' },
    { value: 'CONFIRMED', label: 'Vi phạm'   },
    { value: 'DISMISSED', label: 'Bác bỏ'    },
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReportsPage() {
    const [reports,    setReports]    = useState<Report[]>([]);
    const [total,      setTotal]      = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [page,       setPage]       = useState(1);
    const [loading,    setLoading]    = useState(true);
    const [statusFilter, setStatusFilter] = useState<ReportStatus | 'ALL'>('PENDING');
    const [actionModal, setActionModal] = useState<{ report: Report; action: 'confirm'|'dismiss' } | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'ok'|'err' } | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const notify = (msg: string, type: 'ok'|'err') => {
        clearTimeout(timerRef.current);
        setToast({ msg, type });
        timerRef.current = setTimeout(() => setToast(null), 3500);
    };

    const load = useCallback(async (p: number, status: ReportStatus | 'ALL') => {
        setLoading(true);
        try {
            const q = status !== 'ALL' ? `&status=${status}` : '';
            const res = await fetch(`${BASE}/admin/reports?page=${p - 1}&size=20${q}`, {
                headers: { Authorization: `Bearer ${token()}` },
            });
            if (!res.ok) { notify(`HTTP ${res.status}`, 'err'); return; }
            const data = await res.json();
            setReports(data.content ?? []);
            setTotal(data.totalElements ?? 0);
            setTotalPages(data.totalPages ?? 1);
        } catch (e: unknown) { notify((e as Error).message, 'err'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(page, statusFilter); }, [page, statusFilter, load]);

    const handleAction = async (adminNote: string, deleteReason: string) => {
        if (!actionModal) return;
        const { report, action } = actionModal;
        const url = `${BASE}/admin/reports/${report.id}/${action === 'confirm' ? 'confirm' : 'dismiss'}`;
        const res = await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
            body: JSON.stringify({ adminNote, deleteReason }),
        });
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message || 'Lỗi'); }
        notify(action === 'confirm' ? 'Đã xác nhận vi phạm và xóa bài hát' : 'Đã bác bỏ báo cáo', 'ok');
        setActionModal(null);
        load(page, statusFilter);
    };

    const pendingCount = reports.filter(r => r.status === 'PENDING').length;

    return (
        <>
            {toast && <Toast {...toast} onClose={() => setToast(null)} />}
            {actionModal && (
                <ActionModal
                    report={actionModal.report}
                    action={actionModal.action}
                    onClose={() => setActionModal(null)}
                    onConfirm={handleAction}
                />
            )}

            {/* Header */}
            <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
                <div>
                    <h1 className="text-sm font-semibold text-zinc-900 dark:text-white">Báo cáo bài hát</h1>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mt-0.5">
                        {loading ? '···' : `${total.toLocaleString()} báo cáo${pendingCount > 0 ? ` · ${pendingCount} chờ xử lý` : ''}`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={statusFilter} onChange={v => { setStatusFilter(v); setPage(1); }} options={STATUS_OPTIONS} />
                    <Button variant="outline" size="icon-sm" disabled={loading} onClick={() => load(page, statusFilter)}>
                        <ArrowClockwise size={12} className={loading ? 'animate-spin' : ''} />
                    </Button>
                </div>
            </div>

            {/* Pending count badge */}
            {statusFilter === 'PENDING' && !loading && reports.length > 0 && (
                <div className="mb-4 flex items-center gap-2 px-3 py-2 border border-amber-200 dark:border-amber-400/20 bg-amber-50 dark:bg-amber-400/10">
                    <Warning size={12} className="text-amber-500 shrink-0" />
                    <p className="text-[11px] text-amber-700 dark:text-amber-300">
                        Có {reports.filter(r => r.status === 'PENDING').length} báo cáo đang chờ xét duyệt
                    </p>
                </div>
            )}

            {/* Report list */}
            <div className="space-y-2">
                {loading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="border border-zinc-200 dark:border-white/[0.08] px-4 py-3">
                            <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 animate-pulse w-full" />
                        </div>
                    ))
                    : reports.length === 0
                        ? (
                            <div className="border border-zinc-200 dark:border-white/[0.08] px-4 py-14 text-center">
                                <div className="flex flex-col items-center gap-2">
                                    <Check size={20} className="text-zinc-300 dark:text-zinc-700" />
                                    <p className="text-[11px] text-zinc-400 dark:text-zinc-600">
                                        {statusFilter === 'PENDING' ? 'Không có báo cáo nào chờ xử lý' : 'Không có báo cáo nào'}
                                    </p>
                                </div>
                            </div>
                        )
                        : reports.map(report => (
                            <ReportRow
                                key={report.id}
                                report={report}
                                onAction={(r, a) => setActionModal({ report: r, action: a })}
                            />
                        ))
                }
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