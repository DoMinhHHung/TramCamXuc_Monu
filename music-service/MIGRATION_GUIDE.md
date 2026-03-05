# Migration guide: Music module -> music-service (microservice)

Tài liệu này hướng dẫn tách dần `music` (monolith) sang `music-service` theo đúng chủ đích:

1. **Loại bỏ duyệt bài hát/album bởi quản trị viên**.
2. **Thể loại nhạc dùng Enum** (không CRUD genre động).

## 1) Ranh giới nghiệp vụ (service boundary)

`music-service` chỉ nên giữ phần **catalog + ownership**:

- Artist profile
- Song metadata + transcode state
- Album metadata + track listing
- Playlist (nếu vẫn coi là domain của music)

Phần đã tách qua service khác (identity, integration, payment, transcode) giữ vai trò tích hợp qua API/event, không truy cập DB chéo.

## 2) Loại bỏ quy trình phê duyệt admin

Trong microservice mới, trạng thái không còn mô hình “chờ duyệt” (`PENDING/APPROVED/REJECTED`).
Thay vào đó là trạng thái hiển thị trực tiếp của chủ sở hữu nội dung:

- `PRIVATE`: chỉ chủ sở hữu thấy.
- `PUBLIC`: công khai cho người dùng.
- `DELETED`: ngừng hiển thị logic.
- `ALBUM_ONLY` (song): bài chỉ nghe trong ngữ cảnh album.

### Thay đổi đã áp dụng trong `music-service`

- `SongStatus` bỏ `DRAFT`, dùng `PRIVATE` làm trạng thái khởi tạo.
- `AlbumStatus` bỏ `DRAFT`, bổ sung `DELETED`, dùng `PRIVATE` làm trạng thái khởi tạo.
- Entity `Song`/`Album` default status chuyển sang `PRIVATE`.

## 3) Genre dùng Enum

`music-service` đã dùng Enum cho thể loại:

- `Genre` enum cố định danh mục genre.
- `Song.genres` lưu `Set<Genre>` bằng `@ElementCollection` + `@Enumerated(EnumType.STRING)`.

Điều này thay thế hoàn toàn mô hình bảng `genres` + CRUD admin của monolith.

## 4) Gợi ý lộ trình migration từ module `music` cũ

### Bước 1: Đóng băng API admin duyệt bài/album

- Ngừng expose các endpoint kiểu `.../admin/.../approve`, `.../reject`.
- Chuyển UI sang hành vi publish/unpublish trực tiếp bởi artist owner.

### Bước 2: Chuẩn hóa API write cho artist

- Create song/album => tạo ở trạng thái `PRIVATE`.
- Update metadata không đụng quy trình duyệt.
- Publish/unpublish chỉ là đổi `status` giữa `PRIVATE` và `PUBLIC`.

### Bước 3: Dữ liệu genre

- Nếu DB cũ có bảng `genres`: map dữ liệu sang enum key (ví dụ `"Nhạc trẻ" -> V_POP`).
- Tại API boundary, validate request genre bằng enum.

### Bước 4: Tương tác với transcode-service

- Khi upload song: set `transcodeStatus=PENDING`.
- Nhận event transcode thành công: cập nhật `hlsMasterUrl`, `durationSeconds`, `transcodeStatus=COMPLETED`.
- Không gắn “approval” vào hoàn tất transcode; publish là quyết định riêng của owner.

### Bước 5: Dọn contract liên service

- identity-service: cấp danh tính + role (artist/user).
- payment-service: kiểm tra quyền theo plan (nếu cần limit upload/playlist).
- integration-service: webhook/3rd party bridge.

## 5) Checklist hoàn tất

- [ ] Không còn endpoint duyệt bài/album bởi admin.
- [ ] Không còn enum approval kiểu `PENDING/APPROVED/REJECTED`.
- [ ] Song/Album default `PRIVATE`.
- [ ] Genre chỉ nhận từ enum.
- [ ] Test publish/unpublish không đi qua approval.
