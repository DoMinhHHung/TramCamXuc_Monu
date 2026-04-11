import Link from 'next/link';
import { fetchPublicSong, getPublicGatewayBase } from '@/lib/public-api';

type PageProps = { params: Promise<{ id: string }> };

export default async function PublicShareSongPage({ params }: PageProps) {
  const { id } = await params;
  const song = await fetchPublicSong(id);
  const base = getPublicGatewayBase();

  const title = typeof song?.title === 'string' ? song.title : 'Bài hát';
  const artist =
    typeof (song?.primaryArtist as { stageName?: string } | undefined)?.stageName === 'string'
      ? (song?.primaryArtist as { stageName: string }).stageName
      : '';
  const thumb = typeof song?.thumbnailUrl === 'string' ? song.thumbnailUrl : null;
  const deep = `monumobile://song/${id}`;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-10 max-w-lg mx-auto">
      <p className="text-xs text-zinc-500 mb-6">
        <Link href="/share" className="underline hover:text-zinc-300">
          ← Danh sách công khai
        </Link>
      </p>
      {!base ? (
        <p className="text-amber-400 text-sm">
          Cấu hình NEXT_PUBLIC_API_GATEWAY_URL trên server build để tải dữ liệu bài hát.
        </p>
      ) : null}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="w-full aspect-square object-cover rounded-xl" />
        ) : (
          <div className="w-full aspect-square rounded-xl bg-zinc-800 flex items-center justify-center text-4xl">
            🎵
          </div>
        )}
        <h1 className="text-2xl font-bold">{title}</h1>
        {artist ? <p className="text-zinc-400">{artist}</p> : null}
        <p className="text-sm text-zinc-500 pt-2">
          Mở trong app Monu (đã cài đặt):
        </p>
        <a
          href={deep}
          className="inline-flex items-center justify-center w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold text-white"
        >
          Mở app
        </a>
        <p className="text-xs text-zinc-600 break-all">
          Deep link: {deep}
        </p>
      </div>
    </div>
  );
}
