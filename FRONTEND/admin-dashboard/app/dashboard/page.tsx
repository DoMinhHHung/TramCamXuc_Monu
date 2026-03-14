'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Users, CheckCircle, ProhibitInset, HourglassMedium } from '@phosphor-icons/react';

interface PageResult {
    totalElements: number;
    content: { status: string }[];
}

export default function DashboardPage() {
    const [total, setTotal] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiFetch<PageResult>('/users?page=1&size=1')
            .then((r) => setTotal(r.totalElements))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const val = (v: number | null) =>
        loading ? '···' : v !== null ? v.toLocaleString() : '—';

    const cards = [
        { label: 'Tổng người dùng', value: val(total), icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    ];

    return (
        <div>
            <PageTitle title="Overview" sub="Tổng quan hệ thống" />

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-6">
                {cards.map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="border border-white/[0.08] bg-zinc-950 p-4">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] tracking-wider text-zinc-500">{label.toUpperCase()}</span>
                            <div className={`size-6 flex items-center justify-center ${bg}`}>
                                <Icon size={13} className={color} />
                            </div>
                        </div>
                        <p className="text-2xl font-semibold text-white">{value}</p>
                    </div>
                ))}
            </div>

            <div className="mt-8 border border-white/[0.08] p-5">
                <p className="text-[10px] tracking-widest text-zinc-500 mb-4">TRẠNG THÁI SERVICES</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['Identity', 'Music', 'Payment', 'Social'].map((s) => (
                        <div key={s} className="flex items-center gap-2 text-xs">
                            <span className="size-1.5 bg-emerald-400 rounded-full animate-pulse" />
                            <span className="text-zinc-400">{s}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function PageTitle({ title, sub }: { title: string; sub: string }) {
    return (
        <div>
            <h1 className="text-sm font-semibold text-white">{title}</h1>
            <p className="text-[11px] text-zinc-600 mt-0.5">{sub}</p>
        </div>
    );
}