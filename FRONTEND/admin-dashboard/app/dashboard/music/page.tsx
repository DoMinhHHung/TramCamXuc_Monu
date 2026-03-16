'use client';
import { MusicNote } from '@phosphor-icons/react';

export default function MusicPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] select-none">
            {/* Icon */}
            <div className="size-16 border-2 border-dashed border-zinc-200 dark:border-white/[0.1] flex items-center justify-center mb-6">
                <MusicNote size={28} className="text-zinc-300 dark:text-zinc-700" />
            </div>

            {/* Text */}
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">Music Management</h2>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-600 text-center max-w-xs">
                Quản lý songs, albums, genres, artists.
                <br />
                Tính năng này đang được phát triển.
            </p>

            {/* Coming soon badge */}
            <div className="mt-5 px-3 py-1 border border-zinc-200 dark:border-white/[0.08] text-[10px] tracking-widest text-zinc-400 dark:text-zinc-600 font-medium">
                COMING SOON
            </div>

            {/* Placeholder nav grid */}
            <div className="mt-8 grid grid-cols-2 gap-2 w-full max-w-xs">
                {['Songs','Albums','Artists','Genres'].map(item => (
                    <div
                        key={item}
                        className="border border-dashed border-zinc-200 dark:border-white/[0.06] px-4 py-3 text-[11px] text-zinc-300 dark:text-zinc-700 text-center"
                    >
                        {item}
                    </div>
                ))}
            </div>
        </div>
    );
}