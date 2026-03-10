# Monu Mobile (React Native + Expo)

## 1) Cấu trúc thư mục

```bash
monu-mobile/
├── App.tsx
├── app.json
├── babel.config.js
├── package.json
├── tsconfig.json
├── .env
├── .env.example
└── src/
    ├── components/
    │   └── SocialButton.tsx
    ├── config/
    │   └── env.ts
    ├── context/
    │   └── AuthContext.tsx
    ├── navigation/
    │   └── AppNavigator.tsx
    ├── screens/
    │   ├── HomeScreen.tsx
    │   └── LoginScreen.tsx
    ├── services/
    │   ├── api.ts
    │   └── auth.ts
    └── types/
        ├── auth.ts
        └── env.d.ts
```

## 2) Auth flow (đúng theo Identity API docs)
- Email/password: `POST /auth/login` với body `{ email, password }`.
- Google/Facebook:
  - Mobile lấy **OAuth access token** từ provider.
  - Gọi `POST /auth/social` với body `{ token, provider }` (provider: `GOOGLE` hoặc `FACEBOOK`).
- Sau khi có JWT từ backend:
  - Gắn `Authorization: Bearer <accessToken>`.
  - Gọi `GET /users/my-profile` để lấy user profile.

## 3) Cấu hình ENV cho mobile

File `.env` đã có sẵn các biến:
- `API_BASE_URL` (VD: `http://localhost:8080/service-identity`)
- `GOOGLE_CLIENT_ID`
- `FACEBOOK_CLIENT_ID`

> Không đưa `GOOGLE_CLIENT_SECRET` và `FB_APP_SECRET` vào mobile app. Hai secret này phải nằm ở backend.

## 4) Chạy dự án
```bash
npm install
npm run start
```

Nếu test trên thiết bị thật, hãy sửa `REACT_NATIVE_PACKAGER_HOSTNAME` trong script `start` theo IP LAN của máy dev.
