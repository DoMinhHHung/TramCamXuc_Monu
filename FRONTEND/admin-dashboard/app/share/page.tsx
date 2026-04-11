import Link from 'next/link';
import { fetchPublicTrending, getPublicGatewayBase } from '@/lib/public-api';

export default async function PublicShareHubPage() {
  const base = getPublicGatewayBase();
  const songs = await fetchPublicTrending(50);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Nhạc công khai</h1>
      <p className="text-sm text-zinc-500 mb-8">
        Các bài đang public trên nền tảng. Chọn bài để xem trang chia sẻ và mở app.
      </p>
      {!base ? (
        <p className="text-amber-400 text-sm mb-6">
          Thiếu NEXT_PUBLIC_API_GATEWAY_URL — không thể tải danh sách.
        </p>
      ) : null}
      <ul className="space-y-2">
        {songs.map((s) => {
          const id = String(s.id ?? '');
          const title = String(s.title ?? 'Bài hát');
          const artist =
            typeof (s.primaryArtist as { stageName?: string } | undefined)?.stageName === 'string'
              ? (s.primaryArtist as { stageName: string }).stageName
              : '';
          if (!id) return null;
          return (
            <li key={id}>
              <Link
                href={`/share/song/${id}`}
                className="block rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 hover:bg-white/[0.06] transition-colors"
              >
                <span className="font-medium">{title}</span>
                {artist ? <span className="text-zinc-500 text-sm block">{artist}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
      {songs.length === 0 && base ? (
        <p className="text-zinc-500 text-sm mt-6">Chưa có bài public hoặc API không khả dụng.</p>
      ) : null}
    </div>
  );
}
