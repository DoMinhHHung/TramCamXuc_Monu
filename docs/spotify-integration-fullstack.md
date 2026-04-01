# Spotify Integration (Monu) — Backend + Frontend (Compliance-first)

> Mục tiêu: tích hợp Spotify **đúng policy** bằng `Client Credentials` flow để search metadata bài hát.
> Không lưu secret ở mobile app. Không restream full audio Spotify.

## 0) Bảo mật trước tiên

Nếu bạn đã lộ `SPOTIFY_CLIENT_SECRET`, hãy **rotate ngay** trong Spotify Developer Dashboard.

- Không commit secret vào Git.
- Không hard-code secret trong frontend.
- Chỉ backend giữ `SPOTIFY_CLIENT_SECRET`.

## 1) Spotify App settings cần cấu hình

Trong Spotify Dashboard:

1. App type: Web API.
2. Lấy `Client ID` + `Client Secret`.
3. Với flow `Client Credentials`, không cần user login callback cho endpoint search metadata.

## 2) Backend (music-service)

Đã thêm endpoint proxy an toàn:

- `GET /spotify/tracks/search?keyword=...&limit=10&market=US`
- Backend gọi Spotify token endpoint bằng `client_credentials`.
- Backend cache token trong memory tới gần hết hạn.

### 2.1 ENV cần thêm

```bash
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
```

### 2.2 Rule compliance được áp dụng

- Chỉ trả về metadata: title/artist/album/image/preview/external_url.
- Không tải và không phát lại full track từ server của bạn.
- Luôn ưu tiên deeplink/external URL về Spotify (`externalUrl`).
- Không claim nội dung Spotify là nội dung sở hữu bởi Monu.

## 3) API Gateway

Đã route thêm `/spotify/**` về `music-service` để frontend gọi qua gateway chung.

## 4) Frontend (React Native)

Đã thêm service function:

- `searchSpotifyTracks({ keyword, limit, market })`

Bạn có thể dùng trực tiếp trong `SearchScreen` hoặc tạo tab riêng “Spotify”.

### 4.1 Ví dụ UI nhanh (copy vào SearchScreen)

```tsx
import { searchSpotifyTracks, SpotifyTrack } from '../../services/music';

const [spotifyResults, setSpotifyResults] = useState<SpotifyTrack[]>([]);

const doSpotifySearch = async (q: string) => {
  if (!q.trim()) return setSpotifyResults([]);
  const rows = await searchSpotifyTracks({ keyword: q, limit: 12, market: 'US' });
  setSpotifyResults(rows);
};

// open external spotify url when pressed
import * as Linking from 'expo-linking';

const openSpotify = async (url?: string | null) => {
  if (!url) return;
  await Linking.openURL(url);
};
```


## 4.2 Hiển thị attribution/bản quyền trên mobile

Với mỗi item Spotify, backend đã trả thêm:

- `source: "SPOTIFY"`
- `ownershipText: "Music metadata and artwork are provided by Spotify"`
- `spotifyUri`

UI nên hiển thị badge hoặc caption kiểu: **“From Spotify”** / **“Provided by Spotify”** để người dùng phân biệt rõ nguồn nội dung.

## 4.3 Web Playback SDK có dùng được không?

Có, nhưng chỉ phù hợp **web browser app** (React web, Next.js, v.v.), không chạy trực tiếp trong React Native runtime.

- Nếu app của bạn là website: dùng Web Playback SDK + Authorization Code with PKCE.
- Nếu app của bạn là mobile native/React Native: nên dùng deeplink mở Spotify app, hoặc Spotify App Remote SDK (native) tùy use-case.

> Với kiến trúc hiện tại Monu mobile, cách an toàn nhất là search metadata ở backend và mở `externalUrl`/deeplink sang Spotify để phát.



## 4.4 SDK + OAuth flow (đã thêm sẵn service)

Backend đã thêm các endpoint hỗ trợ Authorization Code + PKCE:

- `GET /spotify/oauth/authorize-url`
- `POST /spotify/oauth/token`
- `POST /spotify/oauth/refresh`

Frontend đã có các hàm:

- `getSpotifyAuthorizeUrl(...)`
- `exchangeSpotifyAuthCode(...)`
- `refreshSpotifyAccessToken(...)`
- `loadSpotifyWebPlaybackSdk()`
- `createSpotifyWebPlayer(...)`

Luồng chuẩn cho Web Playback SDK:

1. Tạo `code_verifier` + `code_challenge` (PKCE).
2. Gọi `getSpotifyAuthorizeUrl` rồi redirect user qua Spotify consent.
3. Nhận `code` ở redirect URI.
4. Gọi `exchangeSpotifyAuthCode` để lấy access token + refresh token.
5. Gọi `createSpotifyWebPlayer(accessToken)` để init player trên web.
6. Dùng `refreshSpotifyAccessToken` khi token hết hạn.

> Lưu ý: file `spotifySdk.ts` có guard, nếu không phải web sẽ throw rõ ràng để tránh dùng sai môi trường.

## 4.5 Đã tích hợp vào SearchScreen

`SearchScreen` đã có thêm tab **Spotify**:

- Search trực tiếp bằng `searchSpotifyTracks(...)`
- Render attribution “Provided by Spotify”
- Khi người dùng bấm vào item sẽ mở `externalUrl` sang Spotify (deeplink/browser), không restream qua server của Monu

## 4.6 Muốn stream ngay trong app của bạn thì sao?

Có 2 hướng hợp lệ:

1. **Web app (browser)**: dùng Web Playback SDK + OAuth PKCE (đã có helper/backend endpoint ở trên).
2. **Mobile app native/React Native**: dùng deeplink mở Spotify app hoặc tích hợp Spotify App Remote SDK native (Android/iOS bridge).

> Không nên/không được lấy Spotify full audio stream về backend của bạn rồi phát lại từ server Monu.

## 5) Test nhanh

```bash
curl "http://localhost:8080/spotify/tracks/search?keyword=blinding%20lights&limit=5&market=US"
```

Kỳ vọng trả về danh sách metadata tracks.

## 6) Checklist tránh vi phạm Spotify Terms

- [x] Secret chỉ nằm ở backend.
- [x] Không stream nhạc Spotify từ hạ tầng Monu.
- [x] Chỉ dùng metadata + external links.
- [x] Có cơ chế vô hiệu nếu chưa cấu hình secret.
- [x] Trả lỗi rõ ràng khi Spotify API fail.

