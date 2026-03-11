---
title: "Code Review Tổng Quan"
output: html_document
---

# Tổng quan
Tài liệu này liệt kê module, endpoint, class và function; kèm nhận xét nhanh về rủi ro/chất lượng dựa trên static review.

## Module `ads-service`
- Số class/interface Java: **35**
### Endpoints
| Controller | Mapping | Base path | Path | File |
|---|---|---|---|---|
| `AdController` | `RequestMapping` | `/ads` | `/ads` | `ads-service/src/main/java/iuh/fit/se/adsservice/controller/AdController.java` |
| `AdController` | `GetMapping` | `/ads` | `/next` | `ads-service/src/main/java/iuh/fit/se/adsservice/controller/AdController.java` |
| `AdController` | `PostMapping` | `/ads` | `/{adId}/played` | `ads-service/src/main/java/iuh/fit/se/adsservice/controller/AdController.java` |
| `AdController` | `PostMapping` | `/ads` | `/{adId}/clicked` | `ads-service/src/main/java/iuh/fit/se/adsservice/controller/AdController.java` |
| `AdminAdController` | `RequestMapping` | `/admin/ads` | `/admin/ads` | `ads-service/src/main/java/iuh/fit/se/adsservice/controller/AdminAdController.java` |
| `AdminAdController` | `PostMapping` | `/admin/ads` | `` | `ads-service/src/main/java/iuh/fit/se/adsservice/controller/AdminAdController.java` |
| `AdminAdController` | `GetMapping` | `/admin/ads` | `` | `ads-service/src/main/java/iuh/fit/se/adsservice/controller/AdminAdController.java` |
| `AdminAdController` | `GetMapping` | `/admin/ads` | `/{adId}` | `ads-service/src/main/java/iuh/fit/se/adsservice/controller/AdminAdController.java` |
| `AdminAdController` | `PutMapping` | `/admin/ads` | `/{adId}` | `ads-service/src/main/java/iuh/fit/se/adsservice/controller/AdminAdController.java` |
| `AdminAdController` | `DeleteMapping` | `/admin/ads` | `/{adId}` | `ads-service/src/main/java/iuh/fit/se/adsservice/controller/AdminAdController.java` |
| `AdminAdController` | `GetMapping` | `/admin/ads` | `/{adId}/stats` | `ads-service/src/main/java/iuh/fit/se/adsservice/controller/AdminAdController.java` |
### Classes & Functions
- `AdsServiceApplication` (ads-service/src/main/java/iuh/fit/se/adsservice/AdsServiceApplication.java): main
- `AdStatus` (ads-service/src/main/java/iuh/fit/se/adsservice/enums/AdStatus.java): (không có method rõ ràng/hoặc là interface/record)
- `AdClickRepository` (ads-service/src/main/java/iuh/fit/se/adsservice/repository/AdClickRepository.java): (không có method rõ ràng/hoặc là interface/record)
- `AdRepository` (ads-service/src/main/java/iuh/fit/se/adsservice/repository/AdRepository.java): (không có method rõ ràng/hoặc là interface/record)
- `AdImpressionRepository` (ads-service/src/main/java/iuh/fit/se/adsservice/repository/AdImpressionRepository.java): (không có method rõ ràng/hoặc là interface/record)
- `OpenApiConfig` (ads-service/src/main/java/iuh/fit/se/adsservice/config/OpenApiConfig.java): openAPI
- `MinioConfig` (ads-service/src/main/java/iuh/fit/se/adsservice/config/MinioConfig.java): minioClient
- `SecurityConfig` (ads-service/src/main/java/iuh/fit/se/adsservice/config/SecurityConfig.java): filterChain, corsConfigurationSource
- `RedisConfig` (ads-service/src/main/java/iuh/fit/se/adsservice/config/RedisConfig.java): redisTemplate
- `JwtAuthenticationFilter` (ads-service/src/main/java/iuh/fit/se/adsservice/config/JwtAuthenticationFilter.java): doFilterInternal
- `RabbitMQConfig` (ads-service/src/main/java/iuh/fit/se/adsservice/config/RabbitMQConfig.java): jsonMessageConverter, rabbitTemplate, songListenFanoutExchange, adsListenQueue, bindAdsListenQueue
- `BudgetPauseScheduler` (ads-service/src/main/java/iuh/fit/se/adsservice/scheduler/BudgetPauseScheduler.java): pauseBudgetExceededAds
- `AppException` (ads-service/src/main/java/iuh/fit/se/adsservice/exception/AppException.java): (không có method rõ ràng/hoặc là interface/record)
- `GlobalExceptionHandler` (ads-service/src/main/java/iuh/fit/se/adsservice/exception/GlobalExceptionHandler.java): handleAppException, handleValidation, handleAccessDenied, handleAuthentication, handleMaxUploadSize, handleGeneral
- `ErrorCode` (ads-service/src/main/java/iuh/fit/se/adsservice/exception/ErrorCode.java): (không có method rõ ràng/hoặc là interface/record)
- `ApiResponse` (ads-service/src/main/java/iuh/fit/se/adsservice/dto/ApiResponse.java): success
- `UpdateAdRequest` (ads-service/src/main/java/iuh/fit/se/adsservice/dto/request/UpdateAdRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `RecordPlayedRequest` (ads-service/src/main/java/iuh/fit/se/adsservice/dto/request/RecordPlayedRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `CreateAdRequest` (ads-service/src/main/java/iuh/fit/se/adsservice/dto/request/CreateAdRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `AdDeliveryResponse` (ads-service/src/main/java/iuh/fit/se/adsservice/dto/response/AdDeliveryResponse.java): (không có method rõ ràng/hoặc là interface/record)
- `AdStatsResponse` (ads-service/src/main/java/iuh/fit/se/adsservice/dto/response/AdStatsResponse.java): (không có method rõ ràng/hoặc là interface/record)
- `AdResponse` (ads-service/src/main/java/iuh/fit/se/adsservice/dto/response/AdResponse.java): (không có method rõ ràng/hoặc là interface/record)
- `SongListenEvent` (ads-service/src/main/java/iuh/fit/se/adsservice/event/SongListenEvent.java): (không có method rõ ràng/hoặc là interface/record)
- `AdImpression` (ads-service/src/main/java/iuh/fit/se/adsservice/entity/AdImpression.java): (không có method rõ ràng/hoặc là interface/record)
- `Ad` (ads-service/src/main/java/iuh/fit/se/adsservice/entity/Ad.java): getCtr, getEstimatedRevenueVnd, isScheduleValid
- `AdClick` (ads-service/src/main/java/iuh/fit/se/adsservice/entity/AdClick.java): (không có method rõ ràng/hoặc là interface/record)
- `AdController` (ads-service/src/main/java/iuh/fit/se/adsservice/controller/AdController.java): getNextAd, recordPlayed, recordClicked, extractUserId
- `AdminAdController` (ads-service/src/main/java/iuh/fit/se/adsservice/controller/AdminAdController.java): createAd, getAllAds, getAdById, updateAd, deleteAd, getStats
- `AdService` (ads-service/src/main/java/iuh/fit/se/adsservice/service/AdService.java): (không có method rõ ràng/hoặc là interface/record)
- `MinioService` (ads-service/src/main/java/iuh/fit/se/adsservice/service/MinioService.java): (không có method rõ ràng/hoặc là interface/record)
- `AdSessionService` (ads-service/src/main/java/iuh/fit/se/adsservice/service/AdSessionService.java): (không có method rõ ràng/hoặc là interface/record)
- `MinioServiceImpl` (ads-service/src/main/java/iuh/fit/se/adsservice/service/impl/MinioServiceImpl.java): uploadAudioFile, deleteAudioFile, getPresignedUrl, ensureBucketExists
- `AdSessionServiceImpl` (ads-service/src/main/java/iuh/fit/se/adsservice/service/impl/AdSessionServiceImpl.java): onSongListened, isAdDue, resetSession, sessionKey, toLong
- `AdServiceImpl` (ads-service/src/main/java/iuh/fit/se/adsservice/service/impl/AdServiceImpl.java): createAd, updateAd, deleteAd, getAdById, getAllAds, getAdStats, getNextAd, recordPlayed, recordClicked, findOrThrow, toResponse, isAudioFile
- `SongListenEventConsumer` (ads-service/src/main/java/iuh/fit/se/adsservice/consumer/SongListenEventConsumer.java): handleSongListened
### Nhận xét review
- - Có dùng `@Transactional`; cần kiểm tra lại boundary ở các service ghi DB.

## Module `api-gateway`
- Số class/interface Java: **2**
### Endpoints
- Không có controller HTTP trong module này.
### Classes & Functions
- `ApiGatewayApplication` (api-gateway/src/main/java/iuh/fit/se/gateway/ApiGatewayApplication.java): main
- `RateLimitConfig` (api-gateway/src/main/java/iuh/fit/se/gateway/RateLimitConfig.java): ipAndUserKeyResolver, extractClientIp, extractUserId
### Nhận xét review
- - Nên có rate-limit + key resolver theo IP/user + bảo vệ route internal.

## Module `discovery-server`
- Số class/interface Java: **1**
### Endpoints
- Không có controller HTTP trong module này.
### Classes & Functions
- `DiscoveryServerApplication` (discovery-server/src/main/java/iuh/fit/se/discovery/DiscoveryServerApplication.java): main
### Nhận xét review
- - Cần bổ sung unit/integration tests cho các service quan trọng.

## Module `identity-service`
- Số class/interface Java: **55**
### Endpoints
| Controller | Mapping | Base path | Path | File |
|---|---|---|---|---|
| `OAuthController` | `RequestMapping` | `/auth/oauth` | `/auth/oauth` | `identity-service/src/main/java/iuh/fit/se/identityservice/controller/OAuthController.java` |
| `OAuthController` | `GetMapping` | `/auth/oauth` | `/google` | `identity-service/src/main/java/iuh/fit/se/identityservice/controller/OAuthController.java` |
| `OAuthController` | `GetMapping` | `/auth/oauth` | `/google/callback` | `identity-service/src/main/java/iuh/fit/se/identityservice/controller/OAuthController.java` |
| `OAuthController` | `GetMapping` | `/auth/oauth` | `/facebook` | `identity-service/src/main/java/iuh/fit/se/identityservice/controller/OAuthController.java` |
| `OAuthController` | `GetMapping` | `/auth/oauth` | `/facebook/callback` | `identity-service/src/main/java/iuh/fit/se/identityservice/controller/OAuthController.java` |
| `OAuthController` | `GetMapping` | `/auth/oauth` | `/complete` | `identity-service/src/main/java/iuh/fit/se/identityservice/controller/OAuthController.java` |
| `UserController` | `RequestMapping` | `/users` | `/users` | `identity-service/src/main/java/iuh/fit/se/identityservice/controller/UserController.java` |
| `UserController` | `GetMapping` | `/users` | `/my-profile` | `identity-service/src/main/java/iuh/fit/se/identityservice/controller/UserController.java` |
| `UserController` | `PutMapping` | `/users` | `/my-profile` | `identity-service/src/main/java/iuh/fit/se/identityservice/controller/UserController.java` |
| `UserController` | `PostMapping` | `/users` | `/upload-avatar` | `identity-service/src/main/java/iuh/fit/se/identityservice/controller/UserController.java` |
| `UserController` | `PutMapping` | `/users` | `/change-password` | `identity-service/src/main/java/iuh/fit/se/identityservice/controller/UserController.java` |
| `UserController` | `DeleteMapping` | `/users` | `/my-profile` | `identity-service/src/main/java/iuh/fit/se/identityservice/controller/UserController.java` |
| `UserController` | `GetMapping` | `/users` | `` | `identity-service/src/main/java/iuh/fit/se/identityservice/controller/UserController.java` |
| `UserController` | `GetMapping` | `/users` | `/{userId}` | `identity-service/src/main/java/iuh/fit/se/identityservice/controller/UserController.java` |
| `UserController` | `PatchMapping` | `/users` | `/{userId}/ban` | `identity-service/src/main/java/iuh/fit/se/identityservice/controller/UserController.java` |
| `UserController` | `GetMapping` | `/users` | `/my-favorites` | `identity-service/src/main/java/iuh/fit/se/identityservice/controller/UserController.java` |
| `UserController` | `PutMapping` | `/users` | `/my-favorites` | `identity-service/src/main/java/iuh/fit/se/identityservice/controller/UserController.java` |
| `AuthController` | `RequestMapping` | `/auth` | `/auth` | `identity-service/src/main/java/iuh/fit/se/identityservice/controller/AuthController.java` |
| `AuthController` | `PostMapping` | `/auth` | `/registration` | `identity-service/src/main/java/iuh/fit/se/identityservice/controller/AuthController.java` |
| `AuthController` | `PostMapping` | `/auth` | `/verify` | `identity-service/src/main/java/iuh/fit/se/identityservice/controller/AuthController.java` |
| `AuthController` | `PostMapping` | `/auth` | `/resend-otp` | `identity-service/src/main/java/iuh/fit/se/identityservice/controller/AuthController.java` |
| `AuthController` | `PostMapping` | `/auth` | `/forgot-password` | `identity-service/src/main/java/iuh/fit/se/identityservice/controller/AuthController.java` |
| `AuthController` | `PostMapping` | `/auth` | `/reset-password` | `identity-service/src/main/java/iuh/fit/se/identityservice/controller/AuthController.java` |
| `AuthController` | `PostMapping` | `/auth` | `/login` | `identity-service/src/main/java/iuh/fit/se/identityservice/controller/AuthController.java` |
| `AuthController` | `PostMapping` | `/auth` | `/refresh` | `identity-service/src/main/java/iuh/fit/se/identityservice/controller/AuthController.java` |
| `AuthController` | `PostMapping` | `/auth` | `/social` | `identity-service/src/main/java/iuh/fit/se/identityservice/controller/AuthController.java` |
| `InternalUserController` | `RequestMapping` | `/internal/users` | `/internal/users` | `identity-service/src/main/java/iuh/fit/se/identityservice/controller/InternalUserController.java` |
| `InternalUserController` | `PostMapping` | `/internal/users` | `/{userId}/grant-artist-role` | `identity-service/src/main/java/iuh/fit/se/identityservice/controller/InternalUserController.java` |
### Classes & Functions
- `IdentityServiceApplication` (identity-service/src/main/java/iuh/fit/se/identityservice/IdentityServiceApplication.java): main
- `Role` (identity-service/src/main/java/iuh/fit/se/identityservice/enums/Role.java): (không có method rõ ràng/hoặc là interface/record)
- `AuthProvider` (identity-service/src/main/java/iuh/fit/se/identityservice/enums/AuthProvider.java): (không có method rõ ràng/hoặc là interface/record)
- `Gender` (identity-service/src/main/java/iuh/fit/se/identityservice/enums/Gender.java): (không có method rõ ràng/hoặc là interface/record)
- `AccountStatus` (identity-service/src/main/java/iuh/fit/se/identityservice/enums/AccountStatus.java): (không có method rõ ràng/hoặc là interface/record)
- `RefreshTokenRepository` (identity-service/src/main/java/iuh/fit/se/identityservice/repository/RefreshTokenRepository.java): (không có method rõ ràng/hoặc là interface/record)
- `UserRepository` (identity-service/src/main/java/iuh/fit/se/identityservice/repository/UserRepository.java): (không có method rõ ràng/hoặc là interface/record)
- `IdentityClient` (identity-service/src/main/java/iuh/fit/se/identityservice/repository/httpclient/IdentityClient.java): getUserInfoFromGoogle, getUserInfoFromFacebook
- `OpenApiConfig` (identity-service/src/main/java/iuh/fit/se/identityservice/config/OpenApiConfig.java): openAPI
- `SecurityConfig` (identity-service/src/main/java/iuh/fit/se/identityservice/config/SecurityConfig.java): passwordEncoder, filterChain, corsConfigurationSource
- `RedisConfig` (identity-service/src/main/java/iuh/fit/se/identityservice/config/RedisConfig.java): redisTemplate
- `CloudinaryConfig` (identity-service/src/main/java/iuh/fit/se/identityservice/config/CloudinaryConfig.java): cloudinary
- `JwtAuthenticationFilter` (identity-service/src/main/java/iuh/fit/se/identityservice/config/JwtAuthenticationFilter.java): doFilterInternal
- `RabbitMQConfig` (identity-service/src/main/java/iuh/fit/se/identityservice/config/RabbitMQConfig.java): jsonMessageConverter, notificationExchange, identityExchange, configExchange, identitySubscriptionQueue, identityFreePlanQueue, identityArtistQueue, bindSubscription, bindFreePlan, bindArtist
- `AppException` (identity-service/src/main/java/iuh/fit/se/identityservice/exception/AppException.java): (không có method rõ ràng/hoặc là interface/record)
- `GlobalExceptionHandler` (identity-service/src/main/java/iuh/fit/se/identityservice/exception/GlobalExceptionHandler.java): error
- `ErrorCode` (identity-service/src/main/java/iuh/fit/se/identityservice/exception/ErrorCode.java): (không có method rõ ràng/hoặc là interface/record)
- `ApiResponse` (identity-service/src/main/java/iuh/fit/se/identityservice/dto/ApiResponse.java): (không có method rõ ràng/hoặc là interface/record)
- `PasswordResetRequest` (identity-service/src/main/java/iuh/fit/se/identityservice/dto/request/PasswordResetRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `VerifyOtpRequest` (identity-service/src/main/java/iuh/fit/se/identityservice/dto/request/VerifyOtpRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `ProfileUpdateRequest` (identity-service/src/main/java/iuh/fit/se/identityservice/dto/request/ProfileUpdateRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `UpdateFavoritesRequest` (identity-service/src/main/java/iuh/fit/se/identityservice/dto/request/UpdateFavoritesRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `RefreshRequest` (identity-service/src/main/java/iuh/fit/se/identityservice/dto/request/RefreshRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `ChangePasswordRequest` (identity-service/src/main/java/iuh/fit/se/identityservice/dto/request/ChangePasswordRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `AuthenticationRequest` (identity-service/src/main/java/iuh/fit/se/identityservice/dto/request/AuthenticationRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `ExchangeTokenRequest` (identity-service/src/main/java/iuh/fit/se/identityservice/dto/request/ExchangeTokenRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `UserRegistrationRequest` (identity-service/src/main/java/iuh/fit/se/identityservice/dto/request/UserRegistrationRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `FavoritesResponse` (identity-service/src/main/java/iuh/fit/se/identityservice/dto/response/FavoritesResponse.java): (không có method rõ ràng/hoặc là interface/record)
- `OutboundUserResponse` (identity-service/src/main/java/iuh/fit/se/identityservice/dto/response/OutboundUserResponse.java): unpackNestedGoogleId, unpackPicture
- `UserResponse` (identity-service/src/main/java/iuh/fit/se/identityservice/dto/response/UserResponse.java): (không có method rõ ràng/hoặc là interface/record)
- `AuthenticationResponse` (identity-service/src/main/java/iuh/fit/se/identityservice/dto/response/AuthenticationResponse.java): (không có method rõ ràng/hoặc là interface/record)
- `UserMapper` (identity-service/src/main/java/iuh/fit/se/identityservice/dto/mapper/UserMapper.java): (không có method rõ ràng/hoặc là interface/record)
- `RequestFreePlanEvent` (identity-service/src/main/java/iuh/fit/se/identityservice/event/RequestFreePlanEvent.java): (không có method rõ ràng/hoặc là interface/record)
- `FreePlanResponseEvent` (identity-service/src/main/java/iuh/fit/se/identityservice/event/FreePlanResponseEvent.java): (không có method rõ ràng/hoặc là interface/record)
- `NotificationEvent` (identity-service/src/main/java/iuh/fit/se/identityservice/event/NotificationEvent.java): (không có method rõ ràng/hoặc là interface/record)
- `ArtistRegisteredEvent` (identity-service/src/main/java/iuh/fit/se/identityservice/event/ArtistRegisteredEvent.java): (không có method rõ ràng/hoặc là interface/record)
- `SubscriptionActiveEvent` (identity-service/src/main/java/iuh/fit/se/identityservice/event/SubscriptionActiveEvent.java): (không có method rõ ràng/hoặc là interface/record)
- `Age` (identity-service/src/main/java/iuh/fit/se/identityservice/validation/Age.java): (không có method rõ ràng/hoặc là interface/record)
- `AgeValidator` (identity-service/src/main/java/iuh/fit/se/identityservice/validation/AgeValidator.java): initialize, isValid
- `BaseEntity` (identity-service/src/main/java/iuh/fit/se/identityservice/entity/BaseEntity.java): (không có method rõ ràng/hoặc là interface/record)
- `User` (identity-service/src/main/java/iuh/fit/se/identityservice/entity/User.java): (không có method rõ ràng/hoặc là interface/record)
- `RefreshToken` (identity-service/src/main/java/iuh/fit/se/identityservice/entity/RefreshToken.java): (không có method rõ ràng/hoặc là interface/record)
- `OAuthController` (identity-service/src/main/java/iuh/fit/se/identityservice/controller/OAuthController.java): redirectToGoogle, googleCallback, redirectToFacebook, facebookCallback, complete, buildCallbackHtml
- `UserController` (identity-service/src/main/java/iuh/fit/se/identityservice/controller/UserController.java): getMyProfile, updateProfile, uploadAvatar, changePassword, deleteAccount, getAllUsers, getUserById, banUser, getMyFavorites, updateMyFavorites
- `AuthController` (identity-service/src/main/java/iuh/fit/se/identityservice/controller/AuthController.java): register, verify, resendOtp, forgotPassword, resetPassword, login, refresh, social
- `InternalUserController` (identity-service/src/main/java/iuh/fit/se/identityservice/controller/InternalUserController.java): grantArtistRoleAndIssueToken
- `UserService` (identity-service/src/main/java/iuh/fit/se/identityservice/service/UserService.java): (không có method rõ ràng/hoặc là interface/record)
- `AuthService` (identity-service/src/main/java/iuh/fit/se/identityservice/service/AuthService.java): (không có method rõ ràng/hoặc là interface/record)
- `AdminInitializer` (identity-service/src/main/java/iuh/fit/se/identityservice/service/impl/AdminInitializer.java): run
- `FreePlanConfigService` (identity-service/src/main/java/iuh/fit/se/identityservice/service/impl/FreePlanConfigService.java): onFreePlanReceived
- `UserServiceImpl` (identity-service/src/main/java/iuh/fit/se/identityservice/service/impl/UserServiceImpl.java): currentUser, getMyProfile, updateProfile, changePassword, uploadAvatar, deleteAccount, getAllUsers, getUserById, banUser, requireAdmin, getMyFavorites, updateMyFavorites
- `ArtistRoleListener` (identity-service/src/main/java/iuh/fit/se/identityservice/service/impl/ArtistRoleListener.java): handleArtistRegistered
- `AuthServiceImpl` (identity-service/src/main/java/iuh/fit/se/identityservice/service/impl/AuthServiceImpl.java): createUser, verifyOtp, resendOtp, forgotPassword, resetPassword, login, refreshToken, outboundAuthentication, grantArtistRoleAndIssueToken, buildTokenResponse, getByEmail, refreshTokenRedisKey, validateRefreshTokenExpiry, publishNotification
- `SubscriptionEventListener` (identity-service/src/main/java/iuh/fit/se/identityservice/service/impl/SubscriptionEventListener.java): handleSubscriptionActive
- `StorageService` (identity-service/src/main/java/iuh/fit/se/identityservice/service/impl/StorageService.java): uploadImage, deleteImage, extractPublicId
### Nhận xét review
- - Luồng refresh token nên lưu Redis để scale ngang và revoke nhanh.
- - Có dùng `@Transactional`; cần kiểm tra lại boundary ở các service ghi DB.

## Module `integration-service`
- Số class/interface Java: **5**
### Endpoints
- Không có controller HTTP trong module này.
### Classes & Functions
- `IntegrationServiceApplication` (integration-service/src/main/java/iuh/fit/se/integrationservice/IntegrationServiceApplication.java): main
- `RabbitMQConfig` (integration-service/src/main/java/iuh/fit/se/integrationservice/config/RabbitMQConfig.java): jsonMessageConverter, notificationExchange, notificationDlx, notificationEmailQueue, notificationEmailDlq, bindEmailQueue, bindEmailDlq
- `NotificationEvent` (integration-service/src/main/java/iuh/fit/se/integrationservice/event/NotificationEvent.java): (không có method rõ ràng/hoặc là interface/record)
- `EmailService` (integration-service/src/main/java/iuh/fit/se/integrationservice/service/EmailService.java): sendEmail
- `NotificationListener` (integration-service/src/main/java/iuh/fit/se/integrationservice/service/NotificationListener.java): handleNotification
### Nhận xét review
- - Cần bổ sung unit/integration tests cho các service quan trọng.

## Module `music-service`
- Số class/interface Java: **97**
### Endpoints
| Controller | Mapping | Base path | Path | File |
|---|---|---|---|---|
| `SongController` | `RequestMapping` | `/api/v1/songs` | `/api/v1/songs` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/SongController.java` |
| `SongController` | `GetMapping` | `/api/v1/songs` | `` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/SongController.java` |
| `SongController` | `GetMapping` | `/api/v1/songs` | `/trending` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/SongController.java` |
| `SongController` | `GetMapping` | `/api/v1/songs` | `/batch` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/SongController.java` |
| `SongController` | `GetMapping` | `/api/v1/songs` | `/newest` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/SongController.java` |
| `SongController` | `GetMapping` | `/api/v1/songs` | `/{songId}` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/SongController.java` |
| `SongController` | `GetMapping` | `/api/v1/songs` | `/by-artist/{artistId}` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/SongController.java` |
| `SongController` | `PostMapping` | `/api/v1/songs` | `/{songId}/play` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/SongController.java` |
| `SongController` | `PostMapping` | `/api/v1/songs` | `/{songId}/listen` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/SongController.java` |
| `SongController` | `GetMapping` | `/api/v1/songs` | `/{songId}/stream` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/SongController.java` |
| `SongController` | `GetMapping` | `/api/v1/songs` | `/{songId}/download` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/SongController.java` |
| `SongController` | `GetMapping` | `/api/v1/songs` | `/my-songs` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/SongController.java` |
| `SongController` | `PostMapping` | `/api/v1/songs` | `/request-upload` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/SongController.java` |
| `SongController` | `PostMapping` | `/api/v1/songs` | `/{songId}/confirm` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/SongController.java` |
| `SongController` | `PutMapping` | `/api/v1/songs` | `/{songId}` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/SongController.java` |
| `SongController` | `DeleteMapping` | `/api/v1/songs` | `/{songId}` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/SongController.java` |
| `ArtistController` | `RequestMapping` | `/api/v1/artists` | `/api/v1/artists` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/ArtistController.java` |
| `ArtistController` | `GetMapping` | `/api/v1/artists` | `` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/ArtistController.java` |
| `ArtistController` | `GetMapping` | `/api/v1/artists` | `/{artistId}` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/ArtistController.java` |
| `ArtistController` | `GetMapping` | `/api/v1/artists` | `/popular` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/ArtistController.java` |
| `ArtistController` | `PostMapping` | `/api/v1/artists` | `/register` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/ArtistController.java` |
| `ArtistController` | `GetMapping` | `/api/v1/artists` | `/me` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/ArtistController.java` |
| `ArtistController` | `PutMapping` | `/api/v1/artists` | `/me` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/ArtistController.java` |
| `ArtistController` | `PutMapping` | `/api/v1/artists` | `/{artistId}/status` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/ArtistController.java` |
| `JamendoImportController` | `RequestMapping` | `/api/v1/admin/jamendo` | `/api/v1/admin/jamendo` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/JamendoImportController.java` |
| `JamendoImportController` | `PostMapping` | `/api/v1/admin/jamendo` | `/import` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/JamendoImportController.java` |
| `ArtistSongController` | `RequestMapping` | `/api/v1/artists` | `/api/v1/artists` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/ArtistSongController.java` |
| `ArtistSongController` | `GetMapping` | `/api/v1/artists` | `/{artistId}/songs` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/ArtistSongController.java` |
| `GenreController` | `RequestMapping` | `/api/v1/genres` | `/api/v1/genres` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/GenreController.java` |
| `GenreController` | `GetMapping` | `/api/v1/genres` | `` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/GenreController.java` |
| `GenreController` | `GetMapping` | `/api/v1/genres` | `/{id}` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/GenreController.java` |
| `GenreController` | `GetMapping` | `/api/v1/genres` | `/popular` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/GenreController.java` |
| `GenreController` | `PostMapping` | `/api/v1/genres` | `` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/GenreController.java` |
| `GenreController` | `PutMapping` | `/api/v1/genres` | `/{id}` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/GenreController.java` |
| `GenreController` | `DeleteMapping` | `/api/v1/genres` | `/{id}` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/GenreController.java` |
| `AlbumController` | `RequestMapping` | `/api/v1/albums` | `/api/v1/albums` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/AlbumController.java` |
| `AlbumController` | `GetMapping` | `/api/v1/albums` | `` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/AlbumController.java` |
| `AlbumController` | `GetMapping` | `/api/v1/albums` | `/{albumId}` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/AlbumController.java` |
| `AlbumController` | `PostMapping` | `/api/v1/albums` | `` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/AlbumController.java` |
| `AlbumController` | `GetMapping` | `/api/v1/albums` | `/my` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/AlbumController.java` |
| `AlbumController` | `GetMapping` | `/api/v1/albums` | `/my/{albumId}` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/AlbumController.java` |
| `AlbumController` | `PutMapping` | `/api/v1/albums` | `/{albumId}` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/AlbumController.java` |
| `AlbumController` | `DeleteMapping` | `/api/v1/albums` | `/{albumId}` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/AlbumController.java` |
| `AlbumController` | `PostMapping` | `/api/v1/albums` | `/{albumId}/songs/{songId}` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/AlbumController.java` |
| `AlbumController` | `DeleteMapping` | `/api/v1/albums` | `/{albumId}/songs/{songId}` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/AlbumController.java` |
| `AlbumController` | `PutMapping` | `/api/v1/albums` | `/{albumId}/songs/reorder` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/AlbumController.java` |
| `AlbumController` | `PostMapping` | `/api/v1/albums` | `/{albumId}/publish` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/AlbumController.java` |
| `AlbumController` | `PostMapping` | `/api/v1/albums` | `/{albumId}/unpublish` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/AlbumController.java` |
| `AlbumController` | `PostMapping` | `/api/v1/albums` | `/{albumId}/schedule` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/AlbumController.java` |
| `AlbumController` | `DeleteMapping` | `/api/v1/albums` | `/{albumId}/schedule` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/AlbumController.java` |
| `AdminSongController` | `RequestMapping` | `/api/v1/admin/songs` | `/api/v1/admin/songs` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/AdminSongController.java` |
| `AdminSongController` | `GetMapping` | `/api/v1/admin/songs` | `` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/AdminSongController.java` |
| `AdminSongController` | `PatchMapping` | `/api/v1/admin/songs` | `/{songId}/delete` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/AdminSongController.java` |
| `AdminSongController` | `PatchMapping` | `/api/v1/admin/songs` | `/{songId}/restore` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/AdminSongController.java` |
| `SongReportController` | `RequestMapping` | `/api/v1` | `/api/v1` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/SongReportController.java` |
| `SongReportController` | `PostMapping` | `/api/v1` | `/songs/{songId}/report` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/SongReportController.java` |
| `SongReportController` | `GetMapping` | `/api/v1` | `/admin/reports` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/SongReportController.java` |
| `SongReportController` | `PatchMapping` | `/api/v1` | `/admin/reports/{reportId}/confirm` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/SongReportController.java` |
| `SongReportController` | `PatchMapping` | `/api/v1` | `/admin/reports/{reportId}/dismiss` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/SongReportController.java` |
| `PlaylistController` | `RequestMapping` | `/api/v1/playlists` | `/api/v1/playlists` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/PlaylistController.java` |
| `PlaylistController` | `GetMapping` | `/api/v1/playlists` | `/{slug}` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/PlaylistController.java` |
| `PlaylistController` | `GetMapping` | `/api/v1/playlists` | `/my-playlists` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/PlaylistController.java` |
| `PlaylistController` | `PostMapping` | `/api/v1/playlists` | `` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/PlaylistController.java` |
| `PlaylistController` | `PutMapping` | `/api/v1/playlists` | `/{playlistId}` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/PlaylistController.java` |
| `PlaylistController` | `DeleteMapping` | `/api/v1/playlists` | `/{playlistId}` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/PlaylistController.java` |
| `PlaylistController` | `PostMapping` | `/api/v1/playlists` | `/{playlistId}/cover` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/PlaylistController.java` |
| `PlaylistController` | `PostMapping` | `/api/v1/playlists` | `/{playlistId}/songs/{songId}` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/PlaylistController.java` |
| `PlaylistController` | `DeleteMapping` | `/api/v1/playlists` | `/{playlistId}/songs/{songId}` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/PlaylistController.java` |
| `PlaylistController` | `PatchMapping` | `/api/v1/playlists` | `/{playlistId}/songs/reorder` | `music-service/src/main/java/iuh/fit/se/musicservice/controller/PlaylistController.java` |
### Classes & Functions
- `MusicServiceApplication` (music-service/src/main/java/iuh/fit/se/musicservice/MusicServiceApplication.java): main
- `TranscodeStatus` (music-service/src/main/java/iuh/fit/se/musicservice/enums/TranscodeStatus.java): (không có method rõ ràng/hoặc là interface/record)
- `SongStatus` (music-service/src/main/java/iuh/fit/se/musicservice/enums/SongStatus.java): (không có method rõ ràng/hoặc là interface/record)
- `ReportStatus` (music-service/src/main/java/iuh/fit/se/musicservice/enums/ReportStatus.java): (không có method rõ ràng/hoặc là interface/record)
- `PlaylistVisibility` (music-service/src/main/java/iuh/fit/se/musicservice/enums/PlaylistVisibility.java): (không có method rõ ràng/hoặc là interface/record)
- `ReportReason` (music-service/src/main/java/iuh/fit/se/musicservice/enums/ReportReason.java): (không có method rõ ràng/hoặc là interface/record)
- `ArtistStatus` (music-service/src/main/java/iuh/fit/se/musicservice/enums/ArtistStatus.java): (không có method rõ ràng/hoặc là interface/record)
- `AlbumStatus` (music-service/src/main/java/iuh/fit/se/musicservice/enums/AlbumStatus.java): (không có method rõ ràng/hoặc là interface/record)
- `PlaylistRepository` (music-service/src/main/java/iuh/fit/se/musicservice/repository/PlaylistRepository.java): (không có method rõ ràng/hoặc là interface/record)
- `ArtistRepository` (music-service/src/main/java/iuh/fit/se/musicservice/repository/ArtistRepository.java): (không có method rõ ràng/hoặc là interface/record)
- `GenreRepository` (music-service/src/main/java/iuh/fit/se/musicservice/repository/GenreRepository.java): (không có method rõ ràng/hoặc là interface/record)
- `SongRepository` (music-service/src/main/java/iuh/fit/se/musicservice/repository/SongRepository.java): (không có method rõ ràng/hoặc là interface/record)
- `AlbumRepository` (music-service/src/main/java/iuh/fit/se/musicservice/repository/AlbumRepository.java): (không có method rõ ràng/hoặc là interface/record)
- `AlbumSongRepository` (music-service/src/main/java/iuh/fit/se/musicservice/repository/AlbumSongRepository.java): (không có method rõ ràng/hoặc là interface/record)
- `SongReportRepository` (music-service/src/main/java/iuh/fit/se/musicservice/repository/SongReportRepository.java): (không có method rõ ràng/hoặc là interface/record)
- `PlaylistSongRepository` (music-service/src/main/java/iuh/fit/se/musicservice/repository/PlaylistSongRepository.java): (không có method rõ ràng/hoặc là interface/record)
- `OpenApiConfig` (music-service/src/main/java/iuh/fit/se/musicservice/config/OpenApiConfig.java): musicServiceOpenAPI
- `MinioConfig` (music-service/src/main/java/iuh/fit/se/musicservice/config/MinioConfig.java): minioClient
- `SecurityConfig` (music-service/src/main/java/iuh/fit/se/musicservice/config/SecurityConfig.java): filterChain
- `RedisConfig` (music-service/src/main/java/iuh/fit/se/musicservice/config/RedisConfig.java): redisTemplate
- `JwtAuthenticationFilter` (music-service/src/main/java/iuh/fit/se/musicservice/config/JwtAuthenticationFilter.java): doFilterInternal
- `RestTemplateConfig` (music-service/src/main/java/iuh/fit/se/musicservice/config/RestTemplateConfig.java): restTemplate
- `RabbitMQConfig` (music-service/src/main/java/iuh/fit/se/musicservice/config/RabbitMQConfig.java): jsonMessageConverter, rabbitTemplate, musicExchange, musicEventExchange, identityExchange, notificationExchange, jamendoExchange, songListenFanoutExchange, transcodeSuccessQueue, transcodeFailedQueue, listenTrendingQueue, jamendoDownloadQueue, jamendoDownloadDlq, bindTranscodeSuccess, bindTranscodeFailed ...
- `IdentityClient` (music-service/src/main/java/iuh/fit/se/musicservice/client/IdentityClient.java): (không có method rõ ràng/hoặc là interface/record)
- `PaymentInternalClient` (music-service/src/main/java/iuh/fit/se/musicservice/client/PaymentInternalClient.java): (không có method rõ ràng/hoặc là interface/record)
- `AppException` (music-service/src/main/java/iuh/fit/se/musicservice/exception/AppException.java): (không có method rõ ràng/hoặc là interface/record)
- `GlobalExceptionHandler` (music-service/src/main/java/iuh/fit/se/musicservice/exception/GlobalExceptionHandler.java): (không có method rõ ràng/hoặc là interface/record)
- `ErrorCode` (music-service/src/main/java/iuh/fit/se/musicservice/exception/ErrorCode.java): (không có method rõ ràng/hoặc là interface/record)
- `PlaylistCreateRequest` (music-service/src/main/java/iuh/fit/se/musicservice/dto/request/PlaylistCreateRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `AlbumUpdateRequest` (music-service/src/main/java/iuh/fit/se/musicservice/dto/request/AlbumUpdateRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `GenreRequest` (music-service/src/main/java/iuh/fit/se/musicservice/dto/request/GenreRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `ArtistUpdateRequest` (music-service/src/main/java/iuh/fit/se/musicservice/dto/request/ArtistUpdateRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `AlbumReorderRequest` (music-service/src/main/java/iuh/fit/se/musicservice/dto/request/AlbumReorderRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `SongCreateRequest` (music-service/src/main/java/iuh/fit/se/musicservice/dto/request/SongCreateRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `AdminReportActionRequest` (music-service/src/main/java/iuh/fit/se/musicservice/dto/request/AdminReportActionRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `ArtistRegisterRequest` (music-service/src/main/java/iuh/fit/se/musicservice/dto/request/ArtistRegisterRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `AlbumCreateRequest` (music-service/src/main/java/iuh/fit/se/musicservice/dto/request/AlbumCreateRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `SongReportRequest` (music-service/src/main/java/iuh/fit/se/musicservice/dto/request/SongReportRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `PlaylistUpdateRequest` (music-service/src/main/java/iuh/fit/se/musicservice/dto/request/PlaylistUpdateRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `ReorderRequest` (music-service/src/main/java/iuh/fit/se/musicservice/dto/request/ReorderRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `SongUpdateRequest` (music-service/src/main/java/iuh/fit/se/musicservice/dto/request/SongUpdateRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `SongResponse` (music-service/src/main/java/iuh/fit/se/musicservice/dto/response/SongResponse.java): (không có method rõ ràng/hoặc là interface/record)
- `PaymentSubscriptionStatusResponse` (music-service/src/main/java/iuh/fit/se/musicservice/dto/response/PaymentSubscriptionStatusResponse.java): (không có method rõ ràng/hoặc là interface/record)
- `AlbumResponse` (music-service/src/main/java/iuh/fit/se/musicservice/dto/response/AlbumResponse.java): (không có method rõ ràng/hoặc là interface/record)
- `ArtistResponse` (music-service/src/main/java/iuh/fit/se/musicservice/dto/response/ArtistResponse.java): (không có method rõ ràng/hoặc là interface/record)
- `GenreResponse` (music-service/src/main/java/iuh/fit/se/musicservice/dto/response/GenreResponse.java): (không có method rõ ràng/hoặc là interface/record)
- `AlbumSongResponse` (music-service/src/main/java/iuh/fit/se/musicservice/dto/response/AlbumSongResponse.java): (không có method rõ ràng/hoặc là interface/record)
- `PlaylistSongResponse` (music-service/src/main/java/iuh/fit/se/musicservice/dto/response/PlaylistSongResponse.java): (không có method rõ ràng/hoặc là interface/record)
- `ApiResponse` (music-service/src/main/java/iuh/fit/se/musicservice/dto/response/ApiResponse.java): (không có method rõ ràng/hoặc là interface/record)
- `SongReportResponse` (music-service/src/main/java/iuh/fit/se/musicservice/dto/response/SongReportResponse.java): (không có method rõ ràng/hoặc là interface/record)
- `PlaylistResponse` (music-service/src/main/java/iuh/fit/se/musicservice/dto/response/PlaylistResponse.java): (không có method rõ ràng/hoặc là interface/record)
- `JamendoTrackDto` (music-service/src/main/java/iuh/fit/se/musicservice/dto/jamendo/JamendoTrackDto.java): safeGenreTags, durationAsSeconds
- `JamendoDownloadMessage` (music-service/src/main/java/iuh/fit/se/musicservice/dto/jamendo/JamendoDownloadMessage.java): (không có method rõ ràng/hoặc là interface/record)
- `JamendoApiResponse` (music-service/src/main/java/iuh/fit/se/musicservice/dto/jamendo/JamendoApiResponse.java): isSuccess
- `ArtistRegisteredEvent` (music-service/src/main/java/iuh/fit/se/musicservice/event/ArtistRegisteredEvent.java): (không có method rõ ràng/hoặc là interface/record)
- `ArtistMapper` (music-service/src/main/java/iuh/fit/se/musicservice/mapper/ArtistMapper.java): (không có method rõ ràng/hoặc là interface/record)
- `AlbumMapper` (music-service/src/main/java/iuh/fit/se/musicservice/mapper/AlbumMapper.java): (không có method rõ ràng/hoặc là interface/record)
- `SongMapper` (music-service/src/main/java/iuh/fit/se/musicservice/mapper/SongMapper.java): (không có method rõ ràng/hoặc là interface/record)
- `GenreMapper` (music-service/src/main/java/iuh/fit/se/musicservice/mapper/GenreMapper.java): (không có method rõ ràng/hoặc là interface/record)
- `SlugUtils` (music-service/src/main/java/iuh/fit/se/musicservice/util/SlugUtils.java): generate
- `Album` (music-service/src/main/java/iuh/fit/se/musicservice/entity/Album.java): (không có method rõ ràng/hoặc là interface/record)
- `SongReport` (music-service/src/main/java/iuh/fit/se/musicservice/entity/SongReport.java): (không có method rõ ràng/hoặc là interface/record)
- `PlaylistSong` (music-service/src/main/java/iuh/fit/se/musicservice/entity/PlaylistSong.java): (không có method rõ ràng/hoặc là interface/record)
- `BaseEntity` (music-service/src/main/java/iuh/fit/se/musicservice/entity/BaseEntity.java): (không có method rõ ràng/hoặc là interface/record)
- `Genre` (music-service/src/main/java/iuh/fit/se/musicservice/entity/Genre.java): (không có method rõ ràng/hoặc là interface/record)
- `Song` (music-service/src/main/java/iuh/fit/se/musicservice/entity/Song.java): isDeleted, isPubliclyAvailable
- `Playlist` (music-service/src/main/java/iuh/fit/se/musicservice/entity/Playlist.java): (không có method rõ ràng/hoặc là interface/record)
- `AlbumSong` (music-service/src/main/java/iuh/fit/se/musicservice/entity/AlbumSong.java): (không có method rõ ràng/hoặc là interface/record)
- `Artist` (music-service/src/main/java/iuh/fit/se/musicservice/entity/Artist.java): validate
- `SongController` (music-service/src/main/java/iuh/fit/se/musicservice/controller/SongController.java): searchSongs, getTrending, getSongsByIds, getNewest, getSongById, getSongsByArtist, recordPlay, recordListen, getStreamUrl, getDownloadUrl, getMySongs, requestUploadUrl, confirmUpload, updateSong, deleteSong
- `ArtistController` (music-service/src/main/java/iuh/fit/se/musicservice/controller/ArtistController.java): searchArtists, getArtist, getPopularArtists, registerArtist, getMyProfile, updateMyProfile, updateStatus
- `JamendoImportController` (music-service/src/main/java/iuh/fit/se/musicservice/controller/JamendoImportController.java): importTracks
- `ArtistSongController` (music-service/src/main/java/iuh/fit/se/musicservice/controller/ArtistSongController.java): getSongsByArtist
- `GenreController` (music-service/src/main/java/iuh/fit/se/musicservice/controller/GenreController.java): getAllGenres, getGenreById, getPopularGenres, createGenre, updateGenre, deleteGenre
- `AlbumController` (music-service/src/main/java/iuh/fit/se/musicservice/controller/AlbumController.java): getPublicAlbums, getPublicAlbumDetail, createAlbum, getMyAlbums, getMyAlbumDetail, updateAlbum, deleteAlbum, addSong, removeSong, reorderSong, publishAlbum, unpublishAlbum, schedulePublish, cancelSchedule
- `AdminSongController` (music-service/src/main/java/iuh/fit/se/musicservice/controller/AdminSongController.java): getSongs, softDeleteSong, restoreSong
- `SongReportController` (music-service/src/main/java/iuh/fit/se/musicservice/controller/SongReportController.java): reportSong, getReports, confirmReport, dismissReport
- `PlaylistController` (music-service/src/main/java/iuh/fit/se/musicservice/controller/PlaylistController.java): getBySlug, getMyPlaylists, createPlaylist, updatePlaylist, deletePlaylist, uploadCover, addSong, removeSong, reorder
- `GenreService` (music-service/src/main/java/iuh/fit/se/musicservice/service/GenreService.java): (không có method rõ ràng/hoặc là interface/record)
- `SongReportService` (music-service/src/main/java/iuh/fit/se/musicservice/service/SongReportService.java): (không có method rõ ràng/hoặc là interface/record)
- `SongService` (music-service/src/main/java/iuh/fit/se/musicservice/service/SongService.java): (không có method rõ ràng/hoặc là interface/record)
- `AlbumService` (music-service/src/main/java/iuh/fit/se/musicservice/service/AlbumService.java): (không có method rõ ràng/hoặc là interface/record)
- `PlaylistService` (music-service/src/main/java/iuh/fit/se/musicservice/service/PlaylistService.java): (không có method rõ ràng/hoặc là interface/record)
- `ArtistService` (music-service/src/main/java/iuh/fit/se/musicservice/service/ArtistService.java): (không có method rõ ràng/hoặc là interface/record)
- `JamendoImportServiceImpl` (music-service/src/main/java/iuh/fit/se/musicservice/service/impl/JamendoImportServiceImpl.java): importTracks, fetchAllPages, fetchPage, toDownloadMessage, sanitiseTitle
- `LinkedListService` (music-service/src/main/java/iuh/fit/se/musicservice/service/impl/LinkedListService.java): append, unlink, move, toOrderedList, requireNode
- `SubscriptionCacheWarmupService` (music-service/src/main/java/iuh/fit/se/musicservice/service/impl/SubscriptionCacheWarmupService.java): warm
- `AlbumServiceImpl` (music-service/src/main/java/iuh/fit/se/musicservice/service/impl/AlbumServiceImpl.java): currentUserId, requireCurrentArtist, requireOwnAlbum, traverseLinkedList, buildSongResponse, withSongs, createAlbum, updateAlbum, deleteAlbum, getMyAlbums, getAlbumDetail, addSongToAlbum, removeSongFromAlbum, reorderSong, publishAlbum ...
- `JamendoDownloadWorker` (music-service/src/main/java/iuh/fit/se/musicservice/service/impl/JamendoDownloadWorker.java): processDownload, downloadAudioBytes, upsertGenres, upsertArtist, publishTranscodeRequest, ack, nack, buildRawFileKey, extractExtension
- `SongServiceImpl` (music-service/src/main/java/iuh/fit/se/musicservice/service/impl/SongServiceImpl.java): currentUserId, resolveStreamQuality, buildStreamUrl, tryGetCurrentUserId, requestUploadUrl, confirmUpload, updateSong, deleteSong, getMySongs, getDownloadUrl, getSongById, getStreamUrl, recordPlay, recordListen, searchSongs ...
- `MinioStorageService` (music-service/src/main/java/iuh/fit/se/musicservice/service/impl/MinioStorageService.java): generatePresignedUploadUrl, generatePresignedDownloadUrl, generatePresignedStreamUrl, getPublicUrl, uploadPublicFile, uploadRawBytes, rawBucketExists
- `SongTranscodeResultListener` (music-service/src/main/java/iuh/fit/se/musicservice/service/impl/SongTranscodeResultListener.java): handleTranscodeSuccess, handleTranscodeFailed
- `GenreServiceImpl` (music-service/src/main/java/iuh/fit/se/musicservice/service/impl/GenreServiceImpl.java): createGenre, updateGenre, deleteGenre, getGenreById, getAllGenres, getPopularGenres
- `SongReportServiceImpl` (music-service/src/main/java/iuh/fit/se/musicservice/service/impl/SongReportServiceImpl.java): currentUserId, toResponse, reportSong, getReports, confirmReport, dismissReport
- `PlayCountSyncService` (music-service/src/main/java/iuh/fit/se/musicservice/service/impl/PlayCountSyncService.java): increment, flushToDatabase, scanPlayCountKeys
- `PlaylistServiceImpl` (music-service/src/main/java/iuh/fit/se/musicservice/service/impl/PlaylistServiceImpl.java): currentUserId, currentUserIdOrNull, resolvePlaylistLimit, toSummaryResponse, toDetailResponse, toSongResponse, requireOwner, createPlaylist, updatePlaylist, deletePlaylist, uploadCover, getBySlug, getMyPlaylists, addSong, removeSong ...
- `ArtistServiceImpl` (music-service/src/main/java/iuh/fit/se/musicservice/service/impl/ArtistServiceImpl.java): currentUserId, canBecomeArtist, registerArtist, getMyProfile, updateMyProfile, getArtistById, searchArtists, updateStatus, getPopularArtists
### Nhận xét review
- - Có dùng `@Transactional`; cần kiểm tra lại boundary ở các service ghi DB.

## Module `payment-service`
- Số class/interface Java: **49**
### Endpoints
| Controller | Mapping | Base path | Path | File |
|---|---|---|---|---|
| `PaymentController` | `RequestMapping` | `/payments` | `/payments` | `payment-service/src/main/java/iuh/fit/se/paymentservice/controller/PaymentController.java` |
| `PaymentController` | `PostMapping` | `/payments` | `/payos_transfer_handler` | `payment-service/src/main/java/iuh/fit/se/paymentservice/controller/PaymentController.java` |
| `PaymentController` | `GetMapping` | `/payments` | `/{orderCode}` | `payment-service/src/main/java/iuh/fit/se/paymentservice/controller/PaymentController.java` |
| `PaymentController` | `PutMapping` | `/payments` | `/{orderCode}/cancel` | `payment-service/src/main/java/iuh/fit/se/paymentservice/controller/PaymentController.java` |
| `InternalSubscriptionController` | `RequestMapping` | `/api/internal/subscriptions` | `/api/internal/subscriptions` | `payment-service/src/main/java/iuh/fit/se/paymentservice/controller/InternalSubscriptionController.java` |
| `InternalSubscriptionController` | `GetMapping` | `/api/internal/subscriptions` | `/{userId}/status` | `payment-service/src/main/java/iuh/fit/se/paymentservice/controller/InternalSubscriptionController.java` |
| `AdminSubscriptionController` | `RequestMapping` | `/admin/subscriptions` | `/admin/subscriptions` | `payment-service/src/main/java/iuh/fit/se/paymentservice/controller/AdminSubscriptionController.java` |
| `AdminSubscriptionController` | `GetMapping` | `/admin/subscriptions` | `/plans` | `payment-service/src/main/java/iuh/fit/se/paymentservice/controller/AdminSubscriptionController.java` |
| `AdminSubscriptionController` | `GetMapping` | `/admin/subscriptions` | `/plans/{id}` | `payment-service/src/main/java/iuh/fit/se/paymentservice/controller/AdminSubscriptionController.java` |
| `AdminSubscriptionController` | `PostMapping` | `/admin/subscriptions` | `/plans` | `payment-service/src/main/java/iuh/fit/se/paymentservice/controller/AdminSubscriptionController.java` |
| `AdminSubscriptionController` | `PutMapping` | `/admin/subscriptions` | `/plans/{id}` | `payment-service/src/main/java/iuh/fit/se/paymentservice/controller/AdminSubscriptionController.java` |
| `AdminSubscriptionController` | `PatchMapping` | `/admin/subscriptions` | `/plans/{id}/toggle` | `payment-service/src/main/java/iuh/fit/se/paymentservice/controller/AdminSubscriptionController.java` |
| `AdminSubscriptionController` | `DeleteMapping` | `/admin/subscriptions` | `/plans/{id}` | `payment-service/src/main/java/iuh/fit/se/paymentservice/controller/AdminSubscriptionController.java` |
| `SubscriptionController` | `RequestMapping` | `/subscriptions` | `/subscriptions` | `payment-service/src/main/java/iuh/fit/se/paymentservice/controller/SubscriptionController.java` |
| `SubscriptionController` | `GetMapping` | `/subscriptions` | `/plans` | `payment-service/src/main/java/iuh/fit/se/paymentservice/controller/SubscriptionController.java` |
| `SubscriptionController` | `PostMapping` | `/subscriptions` | `/purchase` | `payment-service/src/main/java/iuh/fit/se/paymentservice/controller/SubscriptionController.java` |
| `SubscriptionController` | `GetMapping` | `/subscriptions` | `/my` | `payment-service/src/main/java/iuh/fit/se/paymentservice/controller/SubscriptionController.java` |
| `SubscriptionController` | `GetMapping` | `/subscriptions` | `/my/history` | `payment-service/src/main/java/iuh/fit/se/paymentservice/controller/SubscriptionController.java` |
| `SubscriptionController` | `DeleteMapping` | `/subscriptions` | `/my/cancel` | `payment-service/src/main/java/iuh/fit/se/paymentservice/controller/SubscriptionController.java` |
### Classes & Functions
- `PaymentServiceApplication` (payment-service/src/main/java/iuh/fit/se/paymentservice/PaymentServiceApplication.java): main
- `PaymentStatus` (payment-service/src/main/java/iuh/fit/se/paymentservice/enums/PaymentStatus.java): (không có method rõ ràng/hoặc là interface/record)
- `PlanStatus` (payment-service/src/main/java/iuh/fit/se/paymentservice/enums/PlanStatus.java): (không có method rõ ràng/hoặc là interface/record)
- `PaymentMethod` (payment-service/src/main/java/iuh/fit/se/paymentservice/enums/PaymentMethod.java): (không có method rõ ràng/hoặc là interface/record)
- `TransactionStatus` (payment-service/src/main/java/iuh/fit/se/paymentservice/enums/TransactionStatus.java): (không có method rõ ràng/hoặc là interface/record)
- `SubscriptionStatus` (payment-service/src/main/java/iuh/fit/se/paymentservice/enums/SubscriptionStatus.java): (không có method rõ ràng/hoặc là interface/record)
- `SubscriptionPlanRepository` (payment-service/src/main/java/iuh/fit/se/paymentservice/repository/SubscriptionPlanRepository.java): (không có method rõ ràng/hoặc là interface/record)
- `UserSubscriptionRepository` (payment-service/src/main/java/iuh/fit/se/paymentservice/repository/UserSubscriptionRepository.java): (không có method rõ ràng/hoặc là interface/record)
- `PaymentTransactionRepository` (payment-service/src/main/java/iuh/fit/se/paymentservice/repository/PaymentTransactionRepository.java): (không có method rõ ràng/hoặc là interface/record)
- `OpenApiConfig` (payment-service/src/main/java/iuh/fit/se/paymentservice/config/OpenApiConfig.java): openAPI
- `SecurityConfig` (payment-service/src/main/java/iuh/fit/se/paymentservice/config/SecurityConfig.java): filterChain, corsConfigurationSource
- `RedisConfig` (payment-service/src/main/java/iuh/fit/se/paymentservice/config/RedisConfig.java): redisTemplate
- `PayOSConfig` (payment-service/src/main/java/iuh/fit/se/paymentservice/config/PayOSConfig.java): payOS
- `PaymentDataSeeder` (payment-service/src/main/java/iuh/fit/se/paymentservice/config/PaymentDataSeeder.java): run, seedFreePlan, broadcastFreePlan
- `JwtAuthenticationFilter` (payment-service/src/main/java/iuh/fit/se/paymentservice/config/JwtAuthenticationFilter.java): doFilterInternal
- `RabbitMQConfig` (payment-service/src/main/java/iuh/fit/se/paymentservice/config/RabbitMQConfig.java): jsonMessageConverter, rabbitTemplate, identityExchange, notificationExchange, configExchange
- `AppException` (payment-service/src/main/java/iuh/fit/se/paymentservice/exception/AppException.java): (không có method rõ ràng/hoặc là interface/record)
- `GlobalExceptionHandler` (payment-service/src/main/java/iuh/fit/se/paymentservice/exception/GlobalExceptionHandler.java): (không có method rõ ràng/hoặc là interface/record)
- `ErrorCode` (payment-service/src/main/java/iuh/fit/se/paymentservice/exception/ErrorCode.java): (không có method rõ ràng/hoặc là interface/record)
- `ApiResponse` (payment-service/src/main/java/iuh/fit/se/paymentservice/dto/ApiResponse.java): (không có method rõ ràng/hoặc là interface/record)
- `PayOSWebhookRequest` (payment-service/src/main/java/iuh/fit/se/paymentservice/dto/request/PayOSWebhookRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `PaymentCancelRequest` (payment-service/src/main/java/iuh/fit/se/paymentservice/dto/request/PaymentCancelRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `SubscriptionPlanRequest` (payment-service/src/main/java/iuh/fit/se/paymentservice/dto/request/SubscriptionPlanRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `SubscriptionPlanUpdateRequest` (payment-service/src/main/java/iuh/fit/se/paymentservice/dto/request/SubscriptionPlanUpdateRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `PurchaseSubscriptionRequest` (payment-service/src/main/java/iuh/fit/se/paymentservice/dto/request/PurchaseSubscriptionRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `UserSubscriptionResponse` (payment-service/src/main/java/iuh/fit/se/paymentservice/dto/response/UserSubscriptionResponse.java): (không có method rõ ràng/hoặc là interface/record)
- `InternalSubscriptionStatusResponse` (payment-service/src/main/java/iuh/fit/se/paymentservice/dto/response/InternalSubscriptionStatusResponse.java): (không có method rõ ràng/hoặc là interface/record)
- `SubscriptionPlanResponse` (payment-service/src/main/java/iuh/fit/se/paymentservice/dto/response/SubscriptionPlanResponse.java): (không có method rõ ràng/hoặc là interface/record)
- `PaymentResponse` (payment-service/src/main/java/iuh/fit/se/paymentservice/dto/response/PaymentResponse.java): (không có method rõ ràng/hoặc là interface/record)
- `UserSubscriptionMapper` (payment-service/src/main/java/iuh/fit/se/paymentservice/dto/mapper/UserSubscriptionMapper.java): (không có method rõ ràng/hoặc là interface/record)
- `SubscriptionPlanMapper` (payment-service/src/main/java/iuh/fit/se/paymentservice/dto/mapper/SubscriptionPlanMapper.java): (không có method rõ ràng/hoặc là interface/record)
- `FreePlanResponseEvent` (payment-service/src/main/java/iuh/fit/se/paymentservice/event/FreePlanResponseEvent.java): (không có method rõ ràng/hoặc là interface/record)
- `NotificationEvent` (payment-service/src/main/java/iuh/fit/se/paymentservice/event/NotificationEvent.java): (không có method rõ ràng/hoặc là interface/record)
- `SubscriptionActiveEvent` (payment-service/src/main/java/iuh/fit/se/paymentservice/event/SubscriptionActiveEvent.java): (không có method rõ ràng/hoặc là interface/record)
- `PaymentTransaction` (payment-service/src/main/java/iuh/fit/se/paymentservice/entity/PaymentTransaction.java): (không có method rõ ràng/hoặc là interface/record)
- `UserSubscription` (payment-service/src/main/java/iuh/fit/se/paymentservice/entity/UserSubscription.java): (không có method rõ ràng/hoặc là interface/record)
- `BaseEntity` (payment-service/src/main/java/iuh/fit/se/paymentservice/entity/BaseEntity.java): (không có method rõ ràng/hoặc là interface/record)
- `SubscriptionPlan` (payment-service/src/main/java/iuh/fit/se/paymentservice/entity/SubscriptionPlan.java): (không có method rõ ràng/hoặc là interface/record)
- `PaymentController` (payment-service/src/main/java/iuh/fit/se/paymentservice/controller/PaymentController.java): handleWebhook, getPaymentInfo, cancelPayment
- `InternalSubscriptionController` (payment-service/src/main/java/iuh/fit/se/paymentservice/controller/InternalSubscriptionController.java): getSubscriptionStatus
- `AdminSubscriptionController` (payment-service/src/main/java/iuh/fit/se/paymentservice/controller/AdminSubscriptionController.java): getAllPlans, getPlanById, createPlan, updatePlan, toggleStatus, deletePlan
- `SubscriptionController` (payment-service/src/main/java/iuh/fit/se/paymentservice/controller/SubscriptionController.java): getActivePlans, purchase, getMySubscription, getMyHistory, cancelMySubscription
- `PayOSService` (payment-service/src/main/java/iuh/fit/se/paymentservice/service/PayOSService.java): (không có method rõ ràng/hoặc là interface/record)
- `SubscriptionPlanService` (payment-service/src/main/java/iuh/fit/se/paymentservice/service/SubscriptionPlanService.java): (không có method rõ ràng/hoặc là interface/record)
- `UserSubscriptionService` (payment-service/src/main/java/iuh/fit/se/paymentservice/service/UserSubscriptionService.java): (không có method rõ ràng/hoặc là interface/record)
- `UserSubscriptionServiceImpl` (payment-service/src/main/java/iuh/fit/se/paymentservice/service/impl/UserSubscriptionServiceImpl.java): purchaseSubscription, getMyActiveSubscription, getMySubscriptionHistory, cancelSubscription, processExpiredSubscriptions, getCurrentUserId, getCurrentUserEmail
- `SubscriptionPlanServiceImpl` (payment-service/src/main/java/iuh/fit/se/paymentservice/service/impl/SubscriptionPlanServiceImpl.java): createPlan, updatePlan, deletePlan, togglePlanStatus, getPlanById, getAllActivePlans, getAllPlans, getPlanOrThrow, broadcastFreePlan
- `PayOSServiceImpl` (payment-service/src/main/java/iuh/fit/se/paymentservice/service/impl/PayOSServiceImpl.java): createPaymentLink, getPaymentLinkInformation, cancelPaymentLink, handleWebhook, publishSubscriptionActiveEvent, publishPaymentSuccessEmail, generateOrderCode, generateReferenceCode
- `SubscriptionAuthorizationCacheService` (payment-service/src/main/java/iuh/fit/se/paymentservice/service/impl/SubscriptionAuthorizationCacheService.java): cacheActiveSubscription, evict, normalizeAuthorizationFeatures, mapQualityToBitrate, key
### Nhận xét review
- - Có dùng `@Transactional`; cần kiểm tra lại boundary ở các service ghi DB.

## Module `recommendation-service`
- Số class/interface Java: **32**
### Endpoints
| Controller | Mapping | Base path | Path | File |
|---|---|---|---|---|
| `RecommendationController` | `RequestMapping` | `/api/v1/recommendations` | `/api/v1/recommendations` | `recommendation-service/src/main/java/iuh/fit/se/recommendationservice/controller/RecommendationController.java` |
| `RecommendationController` | `GetMapping` | `/api/v1/recommendations` | `/for-you` | `recommendation-service/src/main/java/iuh/fit/se/recommendationservice/controller/RecommendationController.java` |
| `RecommendationController` | `GetMapping` | `/api/v1/recommendations` | `/trending` | `recommendation-service/src/main/java/iuh/fit/se/recommendationservice/controller/RecommendationController.java` |
| `RecommendationController` | `GetMapping` | `/api/v1/recommendations` | `/similar/{songId}` | `recommendation-service/src/main/java/iuh/fit/se/recommendationservice/controller/RecommendationController.java` |
| `RecommendationController` | `GetMapping` | `/api/v1/recommendations` | `/new-releases` | `recommendation-service/src/main/java/iuh/fit/se/recommendationservice/controller/RecommendationController.java` |
### Classes & Functions
- `RecommendationServiceApplication` (recommendation-service/src/main/java/iuh/fit/se/recommendationservice/RecommendationServiceApplication.java): main
- `SecurityConfig` (recommendation-service/src/main/java/iuh/fit/se/recommendationservice/config/SecurityConfig.java): securityFilterChain
- `RedisConfig` (recommendation-service/src/main/java/iuh/fit/se/recommendationservice/config/RedisConfig.java): stringRedisTemplate, objectMapper
- `JwtAuthenticationFilter` (recommendation-service/src/main/java/iuh/fit/se/recommendationservice/config/JwtAuthenticationFilter.java): doFilterInternal
- `RestTemplateConfig` (recommendation-service/src/main/java/iuh/fit/se/recommendationservice/config/RestTemplateConfig.java): mlRestTemplate
- `FeignConfig` (recommendation-service/src/main/java/iuh/fit/se/recommendationservice/config/FeignConfig.java): (không có method rõ ràng/hoặc là interface/record)
- `RuleBasedEngine` (recommendation-service/src/main/java/iuh/fit/se/recommendationservice/engine/RuleBasedEngine.java): recommend, songsFromFollowedArtists, songsFromTopGenres, trendingSongs, newestSongs
- `ScoringEngine` (recommendation-service/src/main/java/iuh/fit/se/recommendationservice/engine/ScoringEngine.java): score, topN
- `HybridEngine` (recommendation-service/src/main/java/iuh/fit/se/recommendationservice/engine/HybridEngine.java): recommend, tryMl, mapMlResult, fetchHistory
- `MlServiceClient` (recommendation-service/src/main/java/iuh/fit/se/recommendationservice/client/MlServiceClient.java): getRecommendations
- `IdentityClient` (recommendation-service/src/main/java/iuh/fit/se/recommendationservice/client/IdentityClient.java): (không có method rõ ràng/hoặc là interface/record)
- `MusicServiceClient` (recommendation-service/src/main/java/iuh/fit/se/recommendationservice/client/MusicServiceClient.java): (không có method rõ ràng/hoặc là interface/record)
- `SocialServiceClient` (recommendation-service/src/main/java/iuh/fit/se/recommendationservice/client/SocialServiceClient.java): (không có method rõ ràng/hoặc là interface/record)
- `AppException` (recommendation-service/src/main/java/iuh/fit/se/recommendationservice/exception/AppException.java): (không có method rõ ràng/hoặc là interface/record)
- `GlobalExceptionHandler` (recommendation-service/src/main/java/iuh/fit/se/recommendationservice/exception/GlobalExceptionHandler.java): handleAppException, handleAccessDenied, handleGeneral
- `ErrorCode` (recommendation-service/src/main/java/iuh/fit/se/recommendationservice/exception/ErrorCode.java): (không có method rõ ràng/hoặc là interface/record)
- `PageResponse` (recommendation-service/src/main/java/iuh/fit/se/recommendationservice/dto/PageResponse.java): (không có method rõ ràng/hoặc là interface/record)
- `FavoritesDto` (recommendation-service/src/main/java/iuh/fit/se/recommendationservice/dto/FavoritesDto.java): (không có method rõ ràng/hoặc là interface/record)
- `SongDto` (recommendation-service/src/main/java/iuh/fit/se/recommendationservice/dto/SongDto.java): (không có method rõ ràng/hoặc là interface/record)
- `UserProfileDto` (recommendation-service/src/main/java/iuh/fit/se/recommendationservice/dto/UserProfileDto.java): (không có method rõ ràng/hoặc là interface/record)
- `ListenHistoryDto` (recommendation-service/src/main/java/iuh/fit/se/recommendationservice/dto/ListenHistoryDto.java): (không có method rõ ràng/hoặc là interface/record)
- `ApiResponse` (recommendation-service/src/main/java/iuh/fit/se/recommendationservice/dto/ApiResponse.java): success
- `GenreDto` (recommendation-service/src/main/java/iuh/fit/se/recommendationservice/dto/GenreDto.java): (không có method rõ ràng/hoặc là interface/record)
- `RecommendationResponse` (recommendation-service/src/main/java/iuh/fit/se/recommendationservice/dto/RecommendationResponse.java): (không có method rõ ràng/hoặc là interface/record)
- `SongScoreDto` (recommendation-service/src/main/java/iuh/fit/se/recommendationservice/dto/SongScoreDto.java): (không có method rõ ràng/hoặc là interface/record)
- `MlRecommendResponse` (recommendation-service/src/main/java/iuh/fit/se/recommendationservice/dto/ml/MlRecommendResponse.java): (không có method rõ ràng/hoặc là interface/record)
- `MlRecommendRequest` (recommendation-service/src/main/java/iuh/fit/se/recommendationservice/dto/ml/MlRecommendRequest.java): from
- `RecommendationController` (recommendation-service/src/main/java/iuh/fit/se/recommendationservice/controller/RecommendationController.java): forYou, trending, similar, newReleases
- `RecommendationService` (recommendation-service/src/main/java/iuh/fit/se/recommendationservice/service/RecommendationService.java): (không có method rõ ràng/hoặc là interface/record)
- `UserProfileService` (recommendation-service/src/main/java/iuh/fit/se/recommendationservice/service/UserProfileService.java): (không có method rõ ràng/hoặc là interface/record)
- `UserProfileServiceImpl` (recommendation-service/src/main/java/iuh/fit/se/recommendationservice/service/impl/UserProfileServiceImpl.java): buildProfile, invalidateCache, computeProfile, computeGenreAffinity, computeArtistAffinity, normalize, fetchHistory, fetchSongMap, fetchFollowedArtists, fetchFavorites, partition, fetchSongIdSet
- `RecommendationServiceImpl` (recommendation-service/src/main/java/iuh/fit/se/recommendationservice/service/impl/RecommendationServiceImpl.java): forYou, buildSongCatalog, trending, similar, newReleases, computeSimilarity, fillWithTrending, emptyResponse
### Nhận xét review
- - Cần bổ sung unit/integration tests cho các service quan trọng.

## Module `social-service`
- Số class/interface Java: **69**
### Endpoints
| Controller | Mapping | Base path | Path | File |
|---|---|---|---|---|
| `ReactionController` | `RequestMapping` | `/social/reactions` | `/social/reactions` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/ReactionController.java` |
| `ReactionController` | `GetMapping` | `/social/reactions` | `/summary` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/ReactionController.java` |
| `ReactionController` | `GetMapping` | `/social/reactions` | `/likers` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/ReactionController.java` |
| `ReactionController` | `GetMapping` | `/social/reactions` | `/dislikers` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/ReactionController.java` |
| `ReactionController` | `GetMapping` | `/social/reactions` | `/my/{songId}` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/ReactionController.java` |
| `ReactionController` | `PostMapping` | `/social/reactions` | `/like` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/ReactionController.java` |
| `ReactionController` | `PostMapping` | `/social/reactions` | `/dislike` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/ReactionController.java` |
| `ReactionController` | `DeleteMapping` | `/social/reactions` | `/{songId}` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/ReactionController.java` |
| `CommentController` | `RequestMapping` | `/social/comments` | `/social/comments` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/CommentController.java` |
| `CommentController` | `GetMapping` | `/social/comments` | `` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/CommentController.java` |
| `CommentController` | `GetMapping` | `/social/comments` | `/count` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/CommentController.java` |
| `CommentController` | `GetMapping` | `/social/comments` | `/{parentId}/replies` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/CommentController.java` |
| `CommentController` | `PostMapping` | `/social/comments` | `` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/CommentController.java` |
| `CommentController` | `PatchMapping` | `/social/comments` | `/{commentId}` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/CommentController.java` |
| `CommentController` | `DeleteMapping` | `/social/comments` | `/{commentId}` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/CommentController.java` |
| `CommentController` | `PostMapping` | `/social/comments` | `/{commentId}/like` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/CommentController.java` |
| `CommentController` | `DeleteMapping` | `/social/comments` | `/{commentId}/like` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/CommentController.java` |
| `InternalRecommendationController` | `RequestMapping` | `/api/v1` | `/api/v1` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/InternalRecommendationController.java` |
| `InternalRecommendationController` | `GetMapping` | `/api/v1` | `/listen-history/{userId}` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/InternalRecommendationController.java` |
| `InternalRecommendationController` | `GetMapping` | `/api/v1` | `/follows/{userId}/artists` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/InternalRecommendationController.java` |
| `InternalRecommendationController` | `GetMapping` | `/api/v1` | `/follows/{userId}/users` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/InternalRecommendationController.java` |
| `InternalRecommendationController` | `GetMapping` | `/api/v1` | `/reactions/{userId}/liked` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/InternalRecommendationController.java` |
| `InternalRecommendationController` | `GetMapping` | `/api/v1` | `/reactions/{userId}/disliked` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/InternalRecommendationController.java` |
| `HeartController` | `RequestMapping` | `/social/hearts` | `/social/hearts` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/HeartController.java` |
| `HeartController` | `PostMapping` | `/social/hearts` | `` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/HeartController.java` |
| `HeartController` | `DeleteMapping` | `/social/hearts` | `/{songId}` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/HeartController.java` |
| `HeartController` | `GetMapping` | `/social/hearts` | `/check/{songId}` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/HeartController.java` |
| `HeartController` | `GetMapping` | `/social/hearts` | `/count/{songId}` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/HeartController.java` |
| `HeartController` | `GetMapping` | `/social/hearts` | `/my` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/HeartController.java` |
| `FollowController` | `RequestMapping` | `/social` | `/social` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/FollowController.java` |
| `FollowController` | `GetMapping` | `/social` | `/artists/{artistId}/stats` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/FollowController.java` |
| `FollowController` | `PostMapping` | `/social` | `/follows` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/FollowController.java` |
| `FollowController` | `DeleteMapping` | `/social` | `/follows/{artistId}` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/FollowController.java` |
| `FollowController` | `GetMapping` | `/social` | `/follows/check/{artistId}` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/FollowController.java` |
| `FollowController` | `GetMapping` | `/social` | `/follows/my-artists` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/FollowController.java` |
| `FollowController` | `GetMapping` | `/social` | `/artists/{artistId}/followers` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/FollowController.java` |
| `ShareController` | `RequestMapping` | `/social/share` | `/social/share` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/ShareController.java` |
| `ShareController` | `GetMapping` | `/social/share` | `` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/ShareController.java` |
| `ShareController` | `GetMapping` | `/social/share` | `/qr` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/ShareController.java` |
| `ShareController` | `GetMapping` | `/social/share` | `/count` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/ShareController.java` |
| `ListenHistoryController` | `RequestMapping` | `/social/listen-history` | `/social/listen-history` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/ListenHistoryController.java` |
| `ListenHistoryController` | `GetMapping` | `/social/listen-history` | `/my` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/ListenHistoryController.java` |
| `ListenHistoryController` | `GetMapping` | `/social/listen-history` | `/count/{songId}` | `social-service/src/main/java/iuh/fit/se/socialservice/controller/ListenHistoryController.java` |
### Classes & Functions
- `SocialServiceApplication` (social-service/src/main/java/iuh/fit/se/socialservice/SocialServiceApplication.java): main
- `ReactionType` (social-service/src/main/java/iuh/fit/se/socialservice/enums/ReactionType.java): (không có method rõ ràng/hoặc là interface/record)
- `HeartRepository` (social-service/src/main/java/iuh/fit/se/socialservice/repository/HeartRepository.java): (không có method rõ ràng/hoặc là interface/record)
- `ReactionRepository` (social-service/src/main/java/iuh/fit/se/socialservice/repository/ReactionRepository.java): (không có method rõ ràng/hoặc là interface/record)
- `CommentRepository` (social-service/src/main/java/iuh/fit/se/socialservice/repository/CommentRepository.java): (không có method rõ ràng/hoặc là interface/record)
- `FollowRepository` (social-service/src/main/java/iuh/fit/se/socialservice/repository/FollowRepository.java): (không có method rõ ràng/hoặc là interface/record)
- `SongShareRepository` (social-service/src/main/java/iuh/fit/se/socialservice/repository/SongShareRepository.java): (không có method rõ ràng/hoặc là interface/record)
- `ListenHistoryRepository` (social-service/src/main/java/iuh/fit/se/socialservice/repository/ListenHistoryRepository.java): (không có method rõ ràng/hoặc là interface/record)
- `CommentLikeRepository` (social-service/src/main/java/iuh/fit/se/socialservice/repository/CommentLikeRepository.java): (không có method rõ ràng/hoặc là interface/record)
- `UserFollowRepository` (social-service/src/main/java/iuh/fit/se/socialservice/repository/UserFollowRepository.java): (không có method rõ ràng/hoặc là interface/record)
- `MongoIndexInitializer` (social-service/src/main/java/iuh/fit/se/socialservice/config/MongoIndexInitializer.java): initIndexes, createTimeSeriesCollectionIfNotExists
- `OpenApiConfig` (social-service/src/main/java/iuh/fit/se/socialservice/config/OpenApiConfig.java): socialServiceOpenAPI
- `MinioConfig` (social-service/src/main/java/iuh/fit/se/socialservice/config/MinioConfig.java): minioClient
- `SecurityConfig` (social-service/src/main/java/iuh/fit/se/socialservice/config/SecurityConfig.java): filterChain, corsConfigurationSource
- `MongoConfig` (social-service/src/main/java/iuh/fit/se/socialservice/config/MongoConfig.java): (không có method rõ ràng/hoặc là interface/record)
- `RedisConfig` (social-service/src/main/java/iuh/fit/se/socialservice/config/RedisConfig.java): redisTemplate
- `JwtAuthenticationFilter` (social-service/src/main/java/iuh/fit/se/socialservice/config/JwtAuthenticationFilter.java): doFilterInternal
- `RabbitMQConfig` (social-service/src/main/java/iuh/fit/se/socialservice/config/RabbitMQConfig.java): jsonMessageConverter, rabbitTemplate, songListenFanoutExchange, listenHistoryQueue, aiDataLakeQueue, bindListenHistory, bindAiDataLake
- `AppException` (social-service/src/main/java/iuh/fit/se/socialservice/exception/AppException.java): (không có method rõ ràng/hoặc là interface/record)
- `GlobalExceptionHandler` (social-service/src/main/java/iuh/fit/se/socialservice/exception/GlobalExceptionHandler.java): handleAppException, handleValidation, handleAccessDenied, handleAuthentication, handleGeneral
- `ErrorCode` (social-service/src/main/java/iuh/fit/se/socialservice/exception/ErrorCode.java): (không có method rõ ràng/hoặc là interface/record)
- `Comment` (social-service/src/main/java/iuh/fit/se/socialservice/document/Comment.java): (không có method rõ ràng/hoặc là interface/record)
- `Heart` (social-service/src/main/java/iuh/fit/se/socialservice/document/Heart.java): (không có method rõ ràng/hoặc là interface/record)
- `CommentLike` (social-service/src/main/java/iuh/fit/se/socialservice/document/CommentLike.java): (không có method rõ ràng/hoặc là interface/record)
- `ListenHistory` (social-service/src/main/java/iuh/fit/se/socialservice/document/ListenHistory.java): (không có method rõ ràng/hoặc là interface/record)
- `UserFollow` (social-service/src/main/java/iuh/fit/se/socialservice/document/UserFollow.java): (không có method rõ ràng/hoặc là interface/record)
- `SongShare` (social-service/src/main/java/iuh/fit/se/socialservice/document/SongShare.java): (không có method rõ ràng/hoặc là interface/record)
- `Follow` (social-service/src/main/java/iuh/fit/se/socialservice/document/Follow.java): (không có method rõ ràng/hoặc là interface/record)
- `Reaction` (social-service/src/main/java/iuh/fit/se/socialservice/document/Reaction.java): (không có method rõ ràng/hoặc là interface/record)
- `ApiResponse` (social-service/src/main/java/iuh/fit/se/socialservice/dto/ApiResponse.java): success
- `SongListenEvent` (social-service/src/main/java/iuh/fit/se/socialservice/dto/message/SongListenEvent.java): (không có method rõ ràng/hoặc là interface/record)
- `ReactionRequest` (social-service/src/main/java/iuh/fit/se/socialservice/dto/request/ReactionRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `CommentRequest` (social-service/src/main/java/iuh/fit/se/socialservice/dto/request/CommentRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `HeartRequest` (social-service/src/main/java/iuh/fit/se/socialservice/dto/request/HeartRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `CommentUpdateRequest` (social-service/src/main/java/iuh/fit/se/socialservice/dto/request/CommentUpdateRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `FollowRequest` (social-service/src/main/java/iuh/fit/se/socialservice/dto/request/FollowRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `LikeDislikeRequest` (social-service/src/main/java/iuh/fit/se/socialservice/dto/request/LikeDislikeRequest.java): (không có method rõ ràng/hoặc là interface/record)
- `FollowResponse` (social-service/src/main/java/iuh/fit/se/socialservice/dto/response/FollowResponse.java): (không có method rõ ràng/hoặc là interface/record)
- `ShareResponse` (social-service/src/main/java/iuh/fit/se/socialservice/dto/response/ShareResponse.java): (không có method rõ ràng/hoặc là interface/record)
- `HeartResponse` (social-service/src/main/java/iuh/fit/se/socialservice/dto/response/HeartResponse.java): (không có method rõ ràng/hoặc là interface/record)
- `ReactionUserEntry` (social-service/src/main/java/iuh/fit/se/socialservice/dto/response/ReactionUserEntry.java): (không có method rõ ràng/hoặc là interface/record)
- `ReactionResponse` (social-service/src/main/java/iuh/fit/se/socialservice/dto/response/ReactionResponse.java): (không có method rõ ràng/hoặc là interface/record)
- `ListenHistoryResponse` (social-service/src/main/java/iuh/fit/se/socialservice/dto/response/ListenHistoryResponse.java): (không có method rõ ràng/hoặc là interface/record)
- `CommentResponse` (social-service/src/main/java/iuh/fit/se/socialservice/dto/response/CommentResponse.java): (không có method rõ ràng/hoặc là interface/record)
- `ArtistStatsResponse` (social-service/src/main/java/iuh/fit/se/socialservice/dto/response/ArtistStatsResponse.java): (không có method rõ ràng/hoặc là interface/record)
- `AiDataLakeWorker` (social-service/src/main/java/iuh/fit/se/socialservice/listener/AiDataLakeWorker.java): consume, scheduledFlush, flush, buildObjectKey
- `ListenEventListener` (social-service/src/main/java/iuh/fit/se/socialservice/listener/ListenEventListener.java): handleListenEvent
- `ReactionController` (social-service/src/main/java/iuh/fit/se/socialservice/controller/ReactionController.java): getSummary, getLikers, getDislikers, myReaction, like, dislike, removeReaction, extractUserId
- `CommentController` (social-service/src/main/java/iuh/fit/se/socialservice/controller/CommentController.java): getComments, getCommentCount, getReplies, addComment, updateComment, deleteComment, likeComment, unlikeComment, extractUserId, tryExtract
- `InternalRecommendationController` (social-service/src/main/java/iuh/fit/se/socialservice/controller/InternalRecommendationController.java): getListenHistory, getFollowedArtistIds, getFollowedUserIds, fromCache, toCache, getLikedSongIds, getDislikedSongIds
- `HeartController` (social-service/src/main/java/iuh/fit/se/socialservice/controller/HeartController.java): heart, unheart, isHearted, heartCount, myHearts, extractUserId
- `FollowController` (social-service/src/main/java/iuh/fit/se/socialservice/controller/FollowController.java): getArtistStats, follow, unfollow, isFollowing, myFollowedArtists, artistFollowers, extractUserId
- `ShareController` (social-service/src/main/java/iuh/fit/se/socialservice/controller/ShareController.java): shareLink, qrCode, shareCount, tryExtractUserId
- `ListenHistoryController` (social-service/src/main/java/iuh/fit/se/socialservice/controller/ListenHistoryController.java): myHistory, songListenCount
- `FollowService` (social-service/src/main/java/iuh/fit/se/socialservice/service/FollowService.java): (không có method rõ ràng/hoặc là interface/record)
- `ListenHistoryService` (social-service/src/main/java/iuh/fit/se/socialservice/service/ListenHistoryService.java): (không có method rõ ràng/hoặc là interface/record)
- `CommentService` (social-service/src/main/java/iuh/fit/se/socialservice/service/CommentService.java): (không có method rõ ràng/hoặc là interface/record)
- `InternalRecommendationService` (social-service/src/main/java/iuh/fit/se/socialservice/service/InternalRecommendationService.java): (không có method rõ ràng/hoặc là interface/record)
- `ShareService` (social-service/src/main/java/iuh/fit/se/socialservice/service/ShareService.java): (không có method rõ ràng/hoặc là interface/record)
- `HeartService` (social-service/src/main/java/iuh/fit/se/socialservice/service/HeartService.java): (không có method rõ ràng/hoặc là interface/record)
- `ReactionService` (social-service/src/main/java/iuh/fit/se/socialservice/service/ReactionService.java): (không có method rõ ràng/hoặc là interface/record)
- `CommentServiceImpl` (social-service/src/main/java/iuh/fit/se/socialservice/service/impl/CommentServiceImpl.java): addComment, updateComment, deleteComment, getSongComments, getReplies, getCommentCount, likeComment, unlikeComment, toResponse
- `ReactionServiceImpl` (social-service/src/main/java/iuh/fit/se/socialservice/service/impl/ReactionServiceImpl.java): like, dislike, removeReaction, getUserReaction, getSongSummary, getLikers, getDislikers, buildSummary
- `ListenHistoryServiceImpl` (social-service/src/main/java/iuh/fit/se/socialservice/service/impl/ListenHistoryServiceImpl.java): recordListen, getUserHistory, getSongListenCount, toResponse
- `ShareServiceImpl` (social-service/src/main/java/iuh/fit/se/socialservice/service/impl/ShareServiceImpl.java): getShareLink, getQrCode, getShareCount, recordShare, buildPlatformUrl
- `InternalRecommendationServiceImpl` (social-service/src/main/java/iuh/fit/se/socialservice/service/impl/InternalRecommendationServiceImpl.java): getListenHistory, getFollowedArtistIds, getFollowedUserIds, getLikedSongIds, getDislikedSongIds
- `FollowServiceImpl` (social-service/src/main/java/iuh/fit/se/socialservice/service/impl/FollowServiceImpl.java): evictFollowCache, followArtist, unfollowArtist, isFollowing, getFollowerCount, getFollowedArtists, getArtistFollowers, getArtistStats, toResponse
- `AiDataLakeWriter` (social-service/src/main/java/iuh/fit/se/socialservice/service/impl/AiDataLakeWriter.java): uploadJsonl, ensureBucket
- `HeartServiceImpl` (social-service/src/main/java/iuh/fit/se/socialservice/service/impl/HeartServiceImpl.java): heartSong, unheartSong, isHearted, getHeartCount, getUserHearts, toResponse
### Nhận xét review
- - Cần bổ sung unit/integration tests cho các service quan trọng.

## Module `transcode-service`
- Số class/interface Java: **12**
### Endpoints
- Không có controller HTTP trong module này.
### Classes & Functions
- `TranscoderServiceApplication` (transcode-service/src/main/java/iuh/fit/se/transcoderservice/TranscoderServiceApplication.java): main
- `MinioConfig` (transcode-service/src/main/java/iuh/fit/se/transcoderservice/config/MinioConfig.java): minioClient
- `AsyncConfig` (transcode-service/src/main/java/iuh/fit/se/transcoderservice/config/AsyncConfig.java): transcodeTaskExecutor
- `RabbitMQListenerConfig` (transcode-service/src/main/java/iuh/fit/se/transcoderservice/config/RabbitMQListenerConfig.java): rabbitListenerContainerFactory
- `RabbitMQConfig` (transcode-service/src/main/java/iuh/fit/se/transcoderservice/config/RabbitMQConfig.java): jsonMessageConverter, rabbitTemplate, musicExchange, transcodeQueue, transcodeDlq, transcodeSuccessQueue, transcodeFailedQueue, bindTranscodeQueue, bindTranscodeDlq, bindTranscodeSuccessQueue, bindTranscodeFailedQueue, rabbitAdmin
- `TranscodeFailedMessage` (transcode-service/src/main/java/iuh/fit/se/transcoderservice/dto/TranscodeFailedMessage.java): (không có method rõ ràng/hoặc là interface/record)
- `TranscodeSuccessMessage` (transcode-service/src/main/java/iuh/fit/se/transcoderservice/dto/TranscodeSuccessMessage.java): (không có method rõ ràng/hoặc là interface/record)
- `TranscodeSongMessage` (transcode-service/src/main/java/iuh/fit/se/transcoderservice/dto/TranscodeSongMessage.java): (không có method rõ ràng/hoặc là interface/record)
- `TranscodeListener` (transcode-service/src/main/java/iuh/fit/se/transcoderservice/service/TranscodeListener.java): handleTranscodeRequest, nack
- `MinioHelper` (transcode-service/src/main/java/iuh/fit/se/transcoderservice/service/MinioHelper.java): downloadRawFile, uploadHlsDirectory, uploadDownloadFile
- `TranscodeWorkerService` (transcode-service/src/main/java/iuh/fit/se/transcoderservice/service/TranscodeWorkerService.java): process, cleanup
- `FfmpegService` (transcode-service/src/main/java/iuh/fit/se/transcoderservice/service/FfmpegService.java): getDuration, generateHls, generateMp3320k, runWithTimeout, drainThread
### Nhận xét review
- - Cần bổ sung unit/integration tests cho các service quan trọng.
