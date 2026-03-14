# Backend ↔ Mobile Screen Coverage (non-admin)

## Scope
Đối chiếu nhanh các endpoint **không phải admin** đang dùng cho app mobile với màn hình hiện có.

## Music-service

### Đã có màn hình/flow
- Songs list/trending/newest/search/stream/listen/play: `Home`, `Search`, `Player`.
- Playlist list/detail/add/reorder: `Library`, `PlaylistDetail`.
- My songs/my albums/my playlists: `Library`.
- Request upload/confirm upload: `Create`.
- Song report: `Home` action sheet.

### Trước đây còn thiếu / chưa hoàn chỉnh
- Album detail (`GET /albums/{id}` hoặc `GET /albums/my/{albumId}`): **đã thêm `AlbumDetailScreen`**.
- Playlist update/delete (`PUT/DELETE /playlists/{id}`): **đã bổ sung UI sửa/xóa trong `LibraryScreen`**.

### Vẫn còn thiếu (ưu tiên sau)
- Album management sâu hơn: tạo/sửa/xóa/publish/schedule/reorder bài hát trong album chưa có màn hình chuyên biệt.
- Artist profile management (`/artists/register`, `/artists/me`, `/artists/me update`) chưa có màn hình riêng cho nghệ sĩ.

## Social-service

### Đã có màn hình/flow
- Feed timeline/comments/like/share feed: `Discover`.
- Song/playlist share link+QR: `Home`, `Library`, `FullPlayer`.

### Trước đây còn thiếu / chưa hoàn chỉnh
- Album share link+QR: frontend chưa gọi endpoint album riêng, backend chưa expose album share endpoint.
  - **Đã thêm backend endpoints** `/social/share/album`, `/social/share/album/qr`.
  - **Đã thêm frontend service + UI gọi đúng endpoint album** trong `LibraryScreen`.

## Payment-service
- Subscription status và purchase flow đã có màn hình `Premium`.
- Các endpoint thanh toán callback/webhook/internal không thuộc phạm vi UI end-user trực tiếp.

## Kết luận
Trong đợt này đã xử lý các thiếu hụt chính tác động trực tiếp UX người dùng: album detail, playlist edit/delete, share QR/link cho album đúng chuẩn backend, và chuẩn hóa đường dẫn chia sẻ cho song/playlist/album.
