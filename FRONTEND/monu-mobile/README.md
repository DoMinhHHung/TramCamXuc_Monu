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

## 2) Auth flow
- Email/password: gọi `POST /auth/login`.
- Google OAuth: mở auth URL, lấy `code`, gửi về backend qua `POST /auth/oauth/google/mobile`.
- Facebook OAuth: mở auth URL, lấy `code`, gửi về backend qua `POST /auth/oauth/facebook/mobile`.

## 3) Cấu hình ENV cho mobile

File `.env` đã có sẵn các biến:
- `API_BASE_URL`
- `GOOGLE_CLIENT_ID`
- `FACEBOOK_CLIENT_ID`

> Không đưa `GOOGLE_CLIENT_SECRET` và `FB_APP_SECRET` vào mobile app. Hai secret này phải nằm ở backend.

## 4) Chạy dự án
```bash
npm install
npm run start
```

Nếu backend chạy local, hãy chỉnh `API_BASE_URL` theo địa chỉ backend thật (IP máy dev hoặc domain).
