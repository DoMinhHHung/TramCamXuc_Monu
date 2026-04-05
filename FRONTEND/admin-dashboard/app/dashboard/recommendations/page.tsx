'use client';

import { useCallback, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { ArrowClockwise, Sparkle } from '@phosphor-icons/react';

type EndpointCard = {
  key: string;
  title: string;
  path: string;
  description: string;
  data?: unknown;
  error?: string;
};

const INITIAL: EndpointCard[] = [
  {
    key: 'recommendations',
    title: 'Recommendation Feed',
    path: '/recommendations?page=1&size=10',
    description: 'Endpoint recommendation-service để xem danh sách gợi ý hiện tại.',
  },
  {
    key: 'events',
    title: 'Recommendation Events',
    path: '/recommendations/events?page=1&size=10',
    description: 'Endpoint event stream cho recommendation pipeline.',
  },
  {
    key: 'socialPublic',
    title: 'Public Feed Snapshot',
    path: '/social/feed/public?page=0&size=10',
    description: 'Map nhanh endpoint social chưa có ở dashboard hiện tại.',
  },
];

export default function RecommendationsAdminPage() {
  const [cards, setCards] = useState<EndpointCard[]>(INITIAL);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const next = await Promise.all(
      INITIAL.map(async (card) => {
        try {
          const data = await apiFetch<unknown>(card.path);
          return { ...card, data, error: undefined } satisfies EndpointCard;
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Không gọi được endpoint';
          return {
            ...card,
            data: undefined,
            error: message,
          } satisfies EndpointCard;
        }
      }),
    );
    setCards(next);
    setLoading(false);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] tracking-[0.2em] text-zinc-500 dark:text-zinc-500">ADMIN · BACKEND MAPPING</p>
          <h1 className="text-xl font-semibold mt-1 text-zinc-900 dark:text-white flex items-center gap-2">
            <Sparkle size={18} /> Recommendation & Social Endpoints
          </h1>
        </div>
        <button
          onClick={() => void load()}
          className="h-8 px-3 text-xs border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5 flex items-center gap-1"
          disabled={loading}
        >
          <ArrowClockwise size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
      <p className="text-[11px] text-zinc-500 dark:text-zinc-500">
        Nhấn <strong>Refresh</strong> để kiểm tra endpoint đang map ở backend gateway.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {cards.map((card) => (
          <div key={card.key} className="border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-4 space-y-2">
            <div>
              <p className="text-xs font-semibold text-zinc-900 dark:text-white">{card.title}</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-500 mt-0.5">{card.description}</p>
            </div>
            <code className="text-[11px] px-2 py-1 bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 inline-block">
              {card.path}
            </code>
            {card.error ? (
              <p className="text-[11px] text-red-500">{card.error}</p>
            ) : (
              <pre className="text-[10px] max-h-56 overflow-auto bg-zinc-50 dark:bg-black p-2 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/10">
                {JSON.stringify(card.data, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
