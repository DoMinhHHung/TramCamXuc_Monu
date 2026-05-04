# Maestro E2E Tests — Monu Mobile

## Cài đặt Maestro

```bash
# macOS / Linux
curl -Ls "https://get.maestro.mobile.dev" | bash

# Windows (PowerShell)
iwr get.maestro.mobile.dev/install.ps1 | iex
```

## App IDs

| Platform | App ID |
|----------|--------|
| Android  | `com.minhhung0403.monumobile` |
| iOS      | *(chưa set — điền bundle identifier khi build iOS)* |

---

## Cấu trúc thư mục

```
.maestro/
├── config.yaml              # env vars mặc định
├── README.md                # file này
├── _helpers/
│   └── do_login.yaml        # helper dùng lại qua runFlow
└── flows/
    ├── 00_full_smoke.yaml   # chạy tất cả smoke test
    ├── 01_welcome.yaml      # Welcome screen
    ├── 02_login_success.yaml
    ├── 03_login_invalid.yaml
    ├── 04_register.yaml
    ├── 04b_register_validation.yaml
    ├── 05_home_navigation.yaml
    ├── 06_search.yaml
    ├── 07_trending.yaml     # Top 10 Xu Hướng
    ├── 08_player_controls.yaml
    ├── 09_forgot_password.yaml
    ├── 10_library.yaml
    ├── 11_onboarding.yaml
    └── 12_contextual_recommendation.yaml
```

---

## Chạy test

```bash
# Chạy 1 flow
maestro test .maestro/flows/01_welcome.yaml

# Chạy toàn bộ smoke suite
maestro test .maestro/flows/00_full_smoke.yaml

# Chạy tất cả flows trong thư mục
maestro test .maestro/flows/

# Truyền thông tin tài khoản test
maestro test .maestro/flows/02_login_success.yaml \
  -e TEST_EMAIL=your@email.com \
  -e TEST_PASSWORD=YourPass@1

# Chạy theo tag
maestro test .maestro/flows/ --include-tags smoke

# Xem video recording
maestro test .maestro/flows/07_trending.yaml --format junit --output report.xml
```

---

## Danh sách Flow & Kịch bản

| File | Kịch bản | Tags |
|------|----------|------|
| `01_welcome.yaml` | Màn hình chào mừng, điều hướng Login/Register | smoke, auth |
| `02_login_success.yaml` | Đăng nhập thành công bằng email | smoke, auth |
| `03_login_invalid.yaml` | Đăng nhập sai password, email rỗng | negative, auth |
| `04_register.yaml` | Đăng ký tài khoản mới đầy đủ | auth, register |
| `04b_register_validation.yaml` | Validation: họ tên rỗng, mật khẩu yếu, không khớp | negative, register |
| `05_home_navigation.yaml` | Home screen, bottom tabs, pull-to-refresh | smoke, home |
| `06_search.yaml` | Tìm kiếm bài hát, xem kết quả, phát nhạc | search |
| `07_trending.yaml` | Top 10 Xu Hướng: hiển thị, pull-to-refresh, phát bài | trending |
| `08_player_controls.yaml` | MiniPlayer & FullPlayer: play/pause, next/prev | player |
| `09_forgot_password.yaml` | Quên mật khẩu: gửi email, case email không tồn tại | auth |
| `10_library.yaml` | Thư viện: tabs, tạo playlist mới | library |
| `11_onboarding.yaml` | Chọn thể loại & nghệ sĩ yêu thích sau đăng ký | onboarding |
| `12_contextual_recommendation.yaml` | Section gợi ý theo khung giờ | recommendation |

---

## Env Vars

Khai báo trong `config.yaml`, override khi chạy bằng `-e KEY=value`:

| Var | Mô tả | Mặc định |
|-----|-------|----------|
| `TEST_EMAIL` | Email tài khoản test | `testmonu@gmail.com` |
| `TEST_PASSWORD` | Mật khẩu tài khoản test | `Test@12345` |
| `NEW_USER_EMAIL` | Email dùng để đăng ký | `newuser_test@gmail.com` |
| `NEW_USER_PASSWORD` | Mật khẩu tài khoản mới | `Test@12345` |
| `NEW_USER_NAME` | Họ tên tài khoản mới | `Nguyen Test` |
| `NEW_USER_DOB` | Ngày sinh (DD/MM/YYYY) | `01/01/2000` |

---

## Lưu ý

- **Flow 04 (Register)**: mỗi lần chạy cần đổi `NEW_USER_EMAIL` (email khác nhau) vì email đã đăng ký sẽ bị từ chối
- **Flow 07 (Trending)**: cần backend có dữ liệu trending — nếu Redis trống thì section sẽ không hiển thị
- **Flow 12 (Contextual)**: section label thay đổi theo giờ chạy, flow dùng `anyOf` để match
- **AccessibilityLabel cho Player**: các nút play/pause/next/prev đã có `accessibilityLabel` trong `FullPlayerModal.tsx`
- **testID**: app hiện **chưa có** `testID` — nếu muốn test ổn định hơn, thêm `testID` vào các phần tử chính
