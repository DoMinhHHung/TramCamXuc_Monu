'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiFetch, ApiError } from '@/lib/api';
import {
    Plus, PencilSimple, Trash, ToggleLeft, ToggleRight,
    ArrowClockwise, X, Check, Warning, CaretDown, CaretUp,
    MusicNote, CloudArrowDown, WifiSlash, SpeakerX, UserCircle,
    VinylRecord, MagicWand, StackSimple, Sparkle,
} from '@phosphor-icons/react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Plan {
    id: string;
    subsName: string;
    description: string;
    price: number;
    durationDays: number;
    isActive: boolean;
    displayOrder: number;
    features: PlanFeatures;
    createdAt: string;
}

/** Known feature keys from payment-service / PaymentDataSeeder */
interface PlanFeatures {
    quality?:           string;    // "128kbps" | "256kbps" | "320kbps" | "lossless"
    no_ads?:            boolean;
    offline?:           boolean;
    download?:          boolean;
    playlist_limit?:    number;
    can_become_artist?: boolean;
    create_album?:      boolean;
    recommendation?:    string;    // "basic" | "advance"
    /** Sinh nhạc AI — khớp payment-service AiMusicQuotaServiceImpl (không phụ thuộc Sonauto/ElevenLabs) */
    ai_music_enabled?:                 boolean;
    ai_music_generations_per_month?: number;
    ai_music_max_duration_seconds?:  number;
    ai_music_max_minutes_per_month?: number;
    [key: string]: unknown;        // extra custom keys
}

interface PageResult { content: Plan[]; totalElements: number; totalPages: number }

// ─── Feature schema definition ────────────────────────────────────────────────
const QUALITY_OPTIONS   = ['128kbps', '256kbps', '320kbps'] as const;
const RECOMMEND_OPTIONS = ['basic', 'advance'] as const;

interface FeatureDef {
    key:     string;
    label:   string;
    hint:    string;
    type:    'toggle' | 'select' | 'number';
    icon:    React.ElementType;
    options?: string[];
    min?:    number;
    max?:    number;
    defaultVal: string | boolean | number;
}

const FEATURE_DEFS_STANDARD: FeatureDef[] = [
    { key: 'quality',           label: 'Chất lượng âm thanh', hint: 'Bitrate tối đa user được nghe',    type: 'select',  icon: MusicNote,      options: [...QUALITY_OPTIONS], defaultVal: '128kbps' },
    { key: 'no_ads',            label: 'Tắt quảng cáo',       hint: 'Không hiển thị ads khi nghe nhạc', type: 'toggle',  icon: SpeakerX,       defaultVal: false },
    { key: 'offline',           label: 'Nghe offline',         hint: 'Cache nhạc để nghe không cần mạng',type: 'toggle',  icon: WifiSlash,      defaultVal: false },
    { key: 'download',          label: 'Tải nhạc',             hint: 'Download file về thiết bị',        type: 'toggle',  icon: CloudArrowDown, defaultVal: false },
    { key: 'playlist_limit',    label: 'Giới hạn playlist',    hint: 'Số playlist tối đa (0 = không giới hạn)', type: 'number', icon: StackSimple, min: 0, max: 9999, defaultVal: 5 },
    { key: 'can_become_artist', label: 'Có thể làm Artist',    hint: 'Cho phép đăng ký Artist profile',  type: 'toggle',  icon: UserCircle,     defaultVal: false },
    { key: 'create_album',      label: 'Tạo Album',            hint: 'Artist được tạo và quản lý album', type: 'toggle',  icon: VinylRecord,    defaultVal: false },
    { key: 'recommendation',    label: 'Thuật toán gợi ý',     hint: 'basic = cơ bản / advance = AI',   type: 'select',  icon: MagicWand,      options: [...RECOMMEND_OPTIONS], defaultVal: 'basic' },
];

/** Quota AI nhạc (lần sinh / phút / giây mỗi lần) — backend: payment-service; engine nhạc ở music-service */
const FEATURE_DEFS_AI: FeatureDef[] = [
    { key: 'ai_music_enabled', label: 'Bật sinh nhạc AI', hint: 'Tab “Tạo nhạc với AI” khi bật “Có thể làm Artist”. Nhạc: Sonauto (ưu tiên) / ElevenLabs dự phòng; cải lời: Google.', type: 'toggle', icon: Sparkle, defaultVal: false },
    { key: 'ai_music_generations_per_month', label: 'Số lần sinh / tháng', hint: 'Mỗi user — chu kỳ theo yyyy-MM (VN)', type: 'number', icon: Sparkle, min: 0, max: 999, defaultVal: 5 },
    { key: 'ai_music_max_duration_seconds', label: 'Tối đa giây / lần sinh', hint: 'Độ dài mục tiêu mỗi request (3–600)', type: 'number', icon: Sparkle, min: 3, max: 600, defaultVal: 120 },
    { key: 'ai_music_max_minutes_per_month', label: 'Tối đa phút nhạc AI / tháng', hint: 'Tổng độ dài audio đã sinh mỗi user (theo tháng)', type: 'number', icon: Sparkle, min: 1, max: 10000, defaultVal: 30 },
];

const FEATURE_DEFS: FeatureDef[] = [...FEATURE_DEFS_STANDARD, ...FEATURE_DEFS_AI];

const KNOWN_KEYS = new Set(FEATURE_DEFS.map(f => f.key));

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmtVnd = (n: number) =>
    n === 0 ? 'Miễn phí'
        : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

const fmtDays = (d: number) => {
    if (d >= 36500) return 'Tidak terbatas';
    if (d >= 365)   return `${Math.round(d / 365)} năm`;
    if (d >= 30)    return `${Math.round(d / 30)} tháng`;
    return `${d} ngày`;
};

// ─── UI primitives ────────────────────────────────────────────────────────────
const inputCls = `w-full h-8 bg-white dark:bg-black border border-zinc-200 dark:border-white/10
  text-zinc-900 dark:text-white text-[11px] px-3 outline-none
  focus:border-zinc-400 dark:focus:border-white/30
  placeholder:text-zinc-400 dark:placeholder:text-zinc-700 transition-colors`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="text-[10px] font-medium tracking-widest text-zinc-500 dark:text-zinc-600 block mb-1.5">
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
            : 'bg-white dark:bg-red-950     border-zinc-200 dark:border-red-800     text-zinc-700 dark:text-red-300'}`}>
            {type === 'ok' ? <Check size={12} weight="bold" className="text-emerald-500" /> : <Warning size={12} className="text-red-500" />}
            {msg}
            <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100 transition-opacity"><X size={11} /></button>
        </div>
    );
}

// ─── Feature Toggle Row ───────────────────────────────────────────────────────
function FeatureRow({ def, value, onChange }: {
    def: FeatureDef;
    value: unknown;
    onChange: (k: string, v: unknown) => void;
}) {
    const Icon = def.icon;

    const toggle = () => onChange(def.key, !value);
    const isOn   = Boolean(value);

    return (
        <div className="flex items-center gap-3 py-2.5 border-b border-zinc-100 dark:border-white/[0.04] last:border-0">
            {/* Icon */}
            <div className={`size-7 flex items-center justify-center shrink-0 transition-colors
        ${def.type === 'toggle'
                ? isOn ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-100 dark:bg-white/[0.06]'
                : 'bg-zinc-100 dark:bg-white/[0.06]'}`}>
                <Icon size={13} className={
                    def.type === 'toggle'
                        ? isOn ? 'text-white dark:text-black' : 'text-zinc-400 dark:text-zinc-500'
                        : 'text-zinc-500 dark:text-zinc-400'
                } />
            </div>

            {/* Label + hint */}
            <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-zinc-800 dark:text-zinc-200">{def.label}</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5">{def.hint}</p>
            </div>

            {/* Control */}
            <div className="shrink-0">
                {def.type === 'toggle' && (
                    <button
                        type="button"
                        onClick={toggle}
                        className={`relative w-9 h-5 transition-colors duration-200 flex items-center
              ${isOn ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-200 dark:bg-white/[0.1]'}`}
                    >
            <span className={`absolute size-3.5 bg-white dark:bg-black transition-all duration-200
              ${isOn ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                    </button>
                )}

                {def.type === 'select' && (
                    <select
                        value={String(value ?? def.defaultVal)}
                        onChange={e => onChange(def.key, e.target.value)}
                        className="h-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10
              text-zinc-900 dark:text-white text-[11px] px-2 outline-none
              focus:border-zinc-400 dark:focus:border-white/30 transition-colors min-w-[100px]"
                    >
                        {def.options!.map(o => (
                            <option key={o} value={o}>{o}</option>
                        ))}
                    </select>
                )}

                {def.type === 'number' && (
                    <input
                        type="number"
                        value={Number(value ?? def.defaultVal)}
                        min={def.min}
                        max={def.max}
                        onChange={e => onChange(def.key, Number(e.target.value))}
                        className="h-7 w-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10
              text-zinc-900 dark:text-white text-[11px] px-2 outline-none text-right
              focus:border-zinc-400 dark:focus:border-white/30 transition-colors"
                    />
                )}
            </div>
        </div>
    );
}

// ─── Features Editor ──────────────────────────────────────────────────────────
interface FeaturesEditorProps {
    value: PlanFeatures;
    onChange: (v: PlanFeatures) => void;
}

function FeaturesEditor({ value, onChange }: FeaturesEditorProps) {
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [customKey,    setCustomKey]    = useState('');
    const [customVal,    setCustomVal]    = useState('');
    const [jsonErr,      setJsonErr]      = useState('');

    const set = (k: string, v: unknown) => onChange({ ...value, [k]: v });

    // Extra keys not in FEATURE_DEFS
    const customEntries = Object.entries(value).filter(([k]) => !KNOWN_KEYS.has(k));

    const addCustom = () => {
        if (!customKey.trim()) return;
        let parsed: unknown = customVal;
        try { parsed = JSON.parse(customVal); setJsonErr(''); } catch { /* string */ }
        set(customKey.trim(), parsed);
        setCustomKey('');
        setCustomVal('');
    };

    const removeCustom = (k: string) => {
        const next = { ...value };
        delete next[k];
        onChange(next);
    };

    return (
        <div className="border border-zinc-200 dark:border-white/[0.08]">
            {/* Standard features */}
            <div className="px-4 py-1">
                {FEATURE_DEFS_STANDARD.map(def => (
                    <FeatureRow
                        key={def.key}
                        def={def}
                        value={value[def.key] ?? def.defaultVal}
                        onChange={set}
                    />
                ))}
            </div>

            <div className="border-t border-zinc-200 dark:border-white/[0.08] px-4 pt-3 pb-1">
                <p className="text-[10px] font-semibold tracking-widest text-zinc-400 dark:text-zinc-600 mb-2">
                    TẠO NHẠC AI (SONAUTO / ELEVENLABS / GOOGLE LỜI)
                </p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-600 mb-2 leading-relaxed">
                    Bật cùng <span className="font-medium text-zinc-700 dark:text-zinc-400">Có thể làm Artist</span>. Quota áp theo tháng (Asia/Ho_Chi_Minh).
                </p>
                {FEATURE_DEFS_AI.map(def => (
                    <FeatureRow
                        key={def.key}
                        def={def}
                        value={value[def.key] ?? def.defaultVal}
                        onChange={set}
                    />
                ))}
            </div>

            {/* Advanced / custom features */}
            <div className="border-t border-zinc-200 dark:border-white/[0.08]">
                <button
                    type="button"
                    onClick={() => setShowAdvanced(p => !p)}
                    className="flex items-center justify-between w-full px-4 py-2.5 text-[11px] text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                    <span className="font-medium tracking-wider">NÂNG CAO — CUSTOM KEYS {customEntries.length > 0 ? `(${customEntries.length})` : ''}</span>
                    {showAdvanced ? <CaretUp size={12} /> : <CaretDown size={12} />}
                </button>

                {showAdvanced && (
                    <div className="px-4 pb-4 space-y-3">
                        {/* Existing custom entries */}
                        {customEntries.length > 0 && (
                            <div className="space-y-1.5">
                                {customEntries.map(([k, v]) => (
                                    <div key={k} className="flex items-center gap-2 text-[11px] bg-zinc-50 dark:bg-white/[0.03] px-2.5 h-8">
                                        <span className="text-zinc-500 dark:text-zinc-500 shrink-0">{k}</span>
                                        <span className="text-[10px] text-zinc-400 dark:text-zinc-600">:</span>
                                        <span className="text-zinc-700 dark:text-zinc-300 flex-1 truncate font-mono">{JSON.stringify(v)}</span>
                                        <button onClick={() => removeCustom(k)} className="text-zinc-400 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition-colors ml-auto">
                                            <X size={11} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add new custom */}
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-600">Thêm feature tùy chỉnh:</p>
                        <div className="flex gap-2">
                            <input
                                value={customKey}
                                onChange={e => setCustomKey(e.target.value)}
                                placeholder="key"
                                className={`${inputCls} flex-1`}
                            />
                            <input
                                value={customVal}
                                onChange={e => { setCustomVal(e.target.value); setJsonErr(''); }}
                                placeholder="value (JSON hoặc string)"
                                className={`${inputCls} flex-[2]`}
                                onKeyDown={e => e.key === 'Enter' && addCustom()}
                            />
                            <Button size="icon-sm" variant="outline" onClick={addCustom} disabled={!customKey.trim()}>
                                <Plus size={11} />
                            </Button>
                        </div>
                        {jsonErr && <p className="text-[10px] text-amber-500">{jsonErr}</p>}
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-700">
                            Value được parse như JSON nếu hợp lệ, còn lại giữ nguyên string.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Plan Modal ───────────────────────────────────────────────────────────────
interface FormData {
    subsName: string; description: string; price: string;
    durationDays: string; isActive: boolean; displayOrder: string;
    features: PlanFeatures;
}

const emptyFeatures: PlanFeatures = {
    quality: '128kbps', no_ads: false, offline: false, download: false,
    playlist_limit: 5, can_become_artist: false, create_album: false, recommendation: 'basic',
    ai_music_enabled: false,
    ai_music_generations_per_month: 5,
    ai_music_max_duration_seconds: 120,
    ai_music_max_minutes_per_month: 30,
};

function PlanModal({ plan, onClose, onSave }: {
    plan: Plan | null;
    onClose: () => void;
    onSave: (data: FormData) => Promise<void>;
}) {
    const [form, setForm] = useState<FormData>(
        plan
            ? {
                subsName: plan.subsName, description: plan.description ?? '',
                price: String(plan.price), durationDays: String(plan.durationDays),
                isActive: plan.isActive, displayOrder: String(plan.displayOrder ?? 0),
                features: { ...emptyFeatures, ...(plan.features ?? {}) },
            }
            : {
                subsName: '', description: '', price: '0', durationDays: '30',
                isActive: true, displayOrder: '0', features: { ...emptyFeatures },
            }
    );
    const [busy, setBusy] = useState(false);
    const [err,  setErr]  = useState('');

    const setField = (k: keyof FormData, v: unknown) =>
        setForm(f => ({ ...f, [k]: v }));

    const submit = async () => {
        if (!form.subsName.trim()) { setErr('Tên gói không được để trống'); return; }
        setBusy(true); setErr('');
        try { await onSave(form); }
        catch (e: unknown) { setErr((e as Error).message); }
        finally { setBusy(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 px-4 backdrop-blur-[2px]" onClick={onClose}>
            <div className="w-full max-w-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/[0.08] shadow-2xl
        animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col"
                 onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-white/[0.06] shrink-0">
                    <div>
                        <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                            {plan ? `Cập nhật — ${plan.subsName}` : 'Tạo Plan mới'}
                        </p>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5">
                            Cấu hình gói subscription và các features đi kèm
                        </p>
                    </div>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-600 dark:hover:text-white transition-colors">
                        <X size={14} />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">

                    {/* Basic info */}
                    <div>
                        <p className="text-[10px] font-semibold tracking-widest text-zinc-400 dark:text-zinc-600 mb-3">THÔNG TIN CƠ BẢN</p>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Tên gói *">
                                    <input value={form.subsName} onChange={e => setField('subsName', e.target.value)}
                                           placeholder="FREE / PREMIUM / ARTIST" className={inputCls} />
                                </Field>
                                <Field label="Thứ tự hiển thị">
                                    <input type="number" value={form.displayOrder}
                                           onChange={e => setField('displayOrder', e.target.value)} min="0" className={inputCls} />
                                </Field>
                            </div>
                            <Field label="Mô tả">
                                <input value={form.description} onChange={e => setField('description', e.target.value)}
                                       placeholder="Mô tả ngắn về gói..." className={inputCls} />
                            </Field>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Giá (VNĐ)">
                                    <input type="number" value={form.price} onChange={e => setField('price', e.target.value)}
                                           min="0" className={inputCls} />
                                </Field>
                                <Field label="Thời hạn (ngày)">
                                    <input type="number" value={form.durationDays} onChange={e => setField('durationDays', e.target.value)}
                                           min="1" className={inputCls} />
                                </Field>
                            </div>
                            <Field label="Trạng thái">
                                <button type="button" onClick={() => setField('isActive', !form.isActive)}
                                        className={`h-8 px-3 text-[11px] border flex items-center gap-2 transition-all
                    ${form.isActive
                                            ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                                            : 'border-zinc-200 dark:border-white/10 bg-white dark:bg-black text-zinc-500'}`}>
                                    {form.isActive
                                        ? <><ToggleRight size={15} className="text-emerald-500" /> Active — hiển thị cho user</>
                                        : <><ToggleLeft  size={15} /> Inactive — ẩn khỏi danh sách</>
                                    }
                                </button>
                            </Field>
                        </div>
                    </div>

                    {/* Features */}
                    <div>
                        <p className="text-[10px] font-semibold tracking-widest text-zinc-400 dark:text-zinc-600 mb-3">FEATURES</p>
                        <FeaturesEditor
                            value={form.features}
                            onChange={v => setField('features', v)}
                        />
                    </div>

                    {err && (
                        <p className="text-[11px] text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2">
                            {err}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-zinc-100 dark:border-white/[0.06] flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>Hủy</Button>
                    <Button size="sm" className="flex-1" disabled={busy} onClick={submit}>
                        {busy ? '···' : plan ? 'Lưu thay đổi' : 'Tạo Plan'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────
function DeleteConfirm({ plan, onClose, onConfirm }: {
    plan: Plan; onClose: () => void; onConfirm: () => Promise<void>;
}) {
    const [busy, setBusy] = useState(false);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 px-4" onClick={onClose}>
            <div className="w-full max-w-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/[0.08] shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-150"
                 onClick={e => e.stopPropagation()}>
                <div className="size-8 bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-3">
                    <Warning size={16} className="text-red-500" />
                </div>
                <p className="text-xs font-semibold text-zinc-900 dark:text-white mb-1">Xóa gói {plan.subsName}?</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-500 mb-4">
                    Không thể hoàn tác. Backend sẽ từ chối nếu còn subscription đang active.
                </p>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>Hủy</Button>
                    <Button variant="destructive" size="sm" className="flex-1" disabled={busy}
                            onClick={async () => { setBusy(true); await onConfirm(); setBusy(false); }}>
                        {busy ? '···' : 'Xóa'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── Feature Summary Badge ────────────────────────────────────────────────────
function FeatureSummary({ features }: { features: PlanFeatures }) {
    const checks = [
        features.no_ads,
        features.offline,
        features.download,
        features.can_become_artist,
        features.create_album,
    ].filter(Boolean).length;

    const quality = features.quality ?? '—';
    const total   = Object.keys(features).length;
    const aiOn    = Boolean(features.ai_music_enabled);

    return (
        <div className="flex items-center gap-1.5 flex-wrap">
      <span className={`inline-flex items-center px-1.5 py-px text-[9px] font-medium border
        ${
          quality === '320kbps'  ? 'text-blue-600 dark:text-blue-400   border-blue-200   dark:border-blue-700   bg-blue-50   dark:bg-blue-900/20' :
              'text-zinc-600 dark:text-zinc-400   border-zinc-200   dark:border-zinc-700   bg-zinc-50   dark:bg-zinc-900'}`}>
        {quality}
      </span>
            {checks > 0 && (
                <span className="inline-flex items-center px-1.5 py-px text-[9px] font-medium border
          text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20">
          {checks} tính năng
        </span>
            )}
            {aiOn && (
                <span className="inline-flex items-center px-1.5 py-px text-[9px] font-medium border
          text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/20">
                    AI nhạc
                </span>
            )}
            {total > 0 && (
                <span className="text-[9px] text-zinc-400 dark:text-zinc-600">{total} keys</span>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PaymentsPage() {
    const [plans,      setPlans]      = useState<Plan[]>([]);
    const [total,      setTotal]      = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [page,       setPage]       = useState(1);
    const [loading,    setLoading]    = useState(true);
    const [editPlan,   setEditPlan]   = useState<Plan | null | 'new'>(null);
    const [deletePlan, setDeletePlan] = useState<Plan | null>(null);
    const [busy,       setBusy]       = useState<string | null>(null);
    const [toast,      setToast]      = useState<{ msg: string; type: 'ok'|'err' } | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const notify = (msg: string, type: 'ok'|'err') => {
        clearTimeout(timerRef.current);
        setToast({ msg, type });
        timerRef.current = setTimeout(() => setToast(null), 3500);
    };

    const load = useCallback(async (p: number) => {
        setLoading(true);
        try {
            // payment-service uses Spring 0-indexed Pageable (unlike identity-service which adjusts internally)
            const res = await apiFetch<PageResult>(`/admin/subscriptions/plans?page=${p - 1}&size=10`);
            setPlans(res.content ?? []);
            setTotal(res.totalElements ?? 0);
            setTotalPages(res.totalPages ?? 1);
        } catch (e: unknown) {
            const ae = e as ApiError;
            if (ae.status === 503 || ae.status === 0) {
                notify('Payment service không khả dụng', 'err');
            } else {
                notify(ae.message, 'err');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(page); }, [page, load]);

    const handleSave = async (form: FormData) => {
        const body = {
            subsName:     form.subsName,
            description:  form.description,
            price:        Number(form.price),
            durationDays: Number(form.durationDays),
            isActive:     form.isActive,
            displayOrder: Number(form.displayOrder),
            features:     form.features,
        };

        if (editPlan && editPlan !== 'new') {
            await apiFetch(`/admin/subscriptions/plans/${(editPlan as Plan).id}`, {
                method: 'PUT', body: JSON.stringify(body),
            });
            notify('Cập nhật thành công', 'ok');
        } else {
            await apiFetch('/admin/subscriptions/plans', {
                method: 'POST', body: JSON.stringify(body),
            });
            notify('Tạo plan thành công', 'ok');
        }
        setEditPlan(null);
        load(page);
    };

    const handleToggle = async (plan: Plan) => {
        setBusy(plan.id);
        try {
            await apiFetch(`/admin/subscriptions/plans/${plan.id}/toggle`, { method: 'PATCH' });
            notify(plan.isActive ? 'Đã tắt plan' : 'Đã bật plan', 'ok');
            setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, isActive: !p.isActive } : p));
        } catch (e: unknown) {
            notify((e as Error).message, 'err');
        } finally {
            setBusy(null);
        }
    };

    const handleDelete = async (plan: Plan) => {
        try {
            await apiFetch(`/admin/subscriptions/plans/${plan.id}`, { method: 'DELETE' });
            notify('Đã xóa plan', 'ok');
            setDeletePlan(null);
            load(page);
        } catch (e: unknown) {
            notify((e as Error).message, 'err');
            throw e;
        }
    };

    return (
        <>
            {toast    && <Toast {...toast} onClose={() => setToast(null)} />}
            {editPlan !== null && (
                <PlanModal
                    plan={editPlan === 'new' ? null : editPlan as Plan}
                    onClose={() => setEditPlan(null)}
                    onSave={handleSave}
                />
            )}
            {deletePlan && (
                <DeleteConfirm
                    plan={deletePlan}
                    onClose={() => setDeletePlan(null)}
                    onConfirm={() => handleDelete(deletePlan)}
                />
            )}

            {/* Header */}
            <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
                <div>
                    <h1 className="text-sm font-semibold text-zinc-900 dark:text-white">Subscription Plans</h1>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mt-0.5">
                        {loading ? '···' : `${total.toLocaleString()} gói đăng ký`}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon-sm" disabled={loading} onClick={() => load(page)} title="Làm mới">
                        <ArrowClockwise size={12} className={loading ? 'animate-spin' : ''} />
                    </Button>
                    <Button size="sm" className="gap-1.5" onClick={() => setEditPlan('new')}>
                        <Plus size={12} /> Tạo plan
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="border border-zinc-200 dark:border-white/[0.08] overflow-x-auto">
                <table className="w-full text-[11px] min-w-[640px]">
                    <thead>
                    <tr className="border-b border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-zinc-950">
                        {['Tên gói','Giá','Thời hạn','Features','Trạng thái',''].map(h => (
                            <th key={h} className="text-left px-4 py-2.5 text-[10px] tracking-widest text-zinc-400 dark:text-zinc-600 font-medium">
                                {h.toUpperCase()}
                            </th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {loading
                        ? Array.from({ length: 4 }).map((_, i) => (
                            <tr key={i} className="border-b border-zinc-100 dark:border-white/[0.05]">
                                {Array.from({ length: 6 }).map((_, j) => (
                                    <td key={j} className="px-4 py-3">
                                        <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                                    </td>
                                ))}
                            </tr>
                        ))
                        : plans.length === 0
                            ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-[11px] text-zinc-400 dark:text-zinc-600">
                                        Chưa có plan nào. Nhấn &ldquo;Tạo plan&rdquo; để bắt đầu.
                                    </td>
                                </tr>
                            )
                            : plans.map(plan => (
                                <tr key={plan.id}
                                    className="border-b border-zinc-100 dark:border-white/[0.05] hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-zinc-900 dark:text-white">{plan.subsName}</p>
                                        {plan.description && (
                                            <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5 truncate max-w-[140px]">{plan.description}</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                                        {fmtVnd(plan.price)}
                                    </td>
                                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-500">
                                        {fmtDays(plan.durationDays)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <FeatureSummary features={plan.features ?? {}} />
                                    </td>
                                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-1.5 py-px text-[10px] font-medium border
                        ${plan.isActive
                          ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-400/10 border-emerald-200 dark:border-emerald-400/20'
                          : 'text-zinc-500 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'}`}>
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon-sm" onClick={() => setEditPlan(plan)} title="Sửa">
                                                <PencilSimple size={12} />
                                            </Button>
                                            <Button variant="ghost" size="icon-sm" disabled={busy === plan.id}
                                                    onClick={() => handleToggle(plan)} title={plan.isActive ? 'Tắt' : 'Bật'}>
                                                {plan.isActive
                                                    ? <ToggleRight size={12} className="text-emerald-500" />
                                                    : <ToggleLeft  size={12} className="text-zinc-400" />}
                                            </Button>
                                            <Button variant="ghost" size="icon-sm" onClick={() => setDeletePlan(plan)} title="Xóa">
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
