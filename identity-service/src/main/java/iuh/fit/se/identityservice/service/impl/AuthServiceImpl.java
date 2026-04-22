package iuh.fit.se.identityservice.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import iuh.fit.se.identityservice.config.RabbitMQConfig;
import iuh.fit.se.identityservice.dto.mapper.UserMapper;
import iuh.fit.se.identityservice.dto.request.*;
import iuh.fit.se.identityservice.dto.response.AuthenticationResponse;
import iuh.fit.se.identityservice.dto.response.OutboundUserResponse;
import iuh.fit.se.identityservice.dto.response.UserResponse;
import iuh.fit.se.identityservice.entity.User;
import iuh.fit.se.identityservice.enums.AccountStatus;
import iuh.fit.se.identityservice.enums.AuthProvider;
import iuh.fit.se.identityservice.enums.Role;
import iuh.fit.se.identityservice.event.NotificationEvent;
import iuh.fit.se.identityservice.exception.AppException;
import iuh.fit.se.identityservice.entity.OutboxEvent;
import iuh.fit.se.identityservice.repository.OutboxEventRepository;
import iuh.fit.se.identityservice.enums.OutboxEventTypes;
import iuh.fit.se.identityservice.exception.ErrorCode;
import iuh.fit.se.identityservice.repository.UserRepository;
import iuh.fit.se.identityservice.repository.httpclient.IdentityClient;
import iuh.fit.se.identityservice.service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final IdentityClient identityClient;
    private final RedisTemplate<String, Object> redisTemplate;
    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    @Value("${jwt.signerKey}")
    private String signerKey;

    @Value("${jwt.valid-duration}")
    private long validDuration;

    @Value("${jwt.refreshable-duration}")
    private long refreshableDuration;

    // ── Password charset ────────────────────────────────────────
    private static final String LOWER   = "abcdefghijklmnopqrstuvwxyz";
    private static final String UPPER   = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private static final String DIGIT   = "0123456789";
    private static final String SPECIAL = "!@#$%^&*";
    private static final String ALL     = LOWER + UPPER + DIGIT + SPECIAL;

    // ────────────────────────────────────────────────────────────
    // AUTH METHODS
    // ────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public UserResponse createUser(UserRegistrationRequest request) {
        if (userRepository.existsByEmail(request.getEmail()))
            throw new AppException(ErrorCode.USER_EXISTED);

        String otp = generateOtp();
        String redisKey = "auth:otp:registration:" + request.getEmail();

        try {
            redisTemplate.opsForValue().set(redisKey, otp, 5, TimeUnit.MINUTES);
        } catch (Exception e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        }

        User user = userMapper.toEntity(request);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(Role.USER);

        try {
            user = userRepository.save(user);
        } catch (Exception e) {
            redisTemplate.delete(redisKey);
            throw new AppException(ErrorCode.DB_CONNECTION_FAILED);
        }

        enqueueNotificationEmail(
                NotificationEvent.builder()
                        .channel("EMAIL")
                        .recipient(user.getEmail())
                        .subject("Welcome to TramCamXuc - Verify your account")
                        .templateCode("register-otp")
                        .paramMap(Map.of("name", request.getFullName(), "otp", otp))
                        .build(),
                "User",
                user.getId().toString());

        return userMapper.toResponse(user);
    }

    @Override
    @Transactional
    public void verifyOtp(String email, String otp) {
        String key = "auth:otp:registration:" + email;
        String savedOtp = (String) redisTemplate.opsForValue().get(key);

        if (savedOtp == null) throw new AppException(ErrorCode.OTP_EXPIRED);
        if (!savedOtp.equals(otp)) throw new AppException(ErrorCode.OTP_INVALID);

        User user = getByEmail(email);
        user.setStatus(AccountStatus.ACTIVE);
        userRepository.save(user);
        redisTemplate.delete(key);
    }

    @Override
    @Transactional
    public void resendOtp(String email) {
        User user = getByEmail(email);
        if (user.getStatus() == AccountStatus.ACTIVE)
            throw new AppException(ErrorCode.ACCOUNT_ALREADY_VERIFIED);

        String otp = generateOtp();
        redisTemplate.opsForValue().set("auth:otp:registration:" + email, otp, 5, TimeUnit.MINUTES);

        enqueueNotificationEmail(
                NotificationEvent.builder()
                        .channel("EMAIL")
                        .recipient(email)
                        .subject("Resend OTP")
                        .templateCode("register-otp")
                        .paramMap(Map.of("name", email, "otp", otp))
                        .build(),
                "User",
                user.getId().toString());
    }

    @Override
    @Transactional
    public void forgotPassword(String email) {
        User user = getByEmail(email);
        String otp = generateOtp();
        redisTemplate.opsForValue().set("auth:otp:forgot:" + email, otp, 5, TimeUnit.MINUTES);

        enqueueNotificationEmail(
                NotificationEvent.builder()
                        .channel("EMAIL")
                        .recipient(email)
                        .subject("Reset Password Request")
                        .templateCode("forgot-password")
                        .paramMap(Map.of("name", user.getFullName(), "otp", otp))
                        .build(),
                "User",
                user.getId().toString());
    }

    @Override
    public void resetPassword(PasswordResetRequest request) {
        String key = "auth:otp:forgot:" + request.getEmail();
        String savedOtp = (String) redisTemplate.opsForValue().get(key);

        if (savedOtp == null) throw new AppException(ErrorCode.OTP_EXPIRED);
        if (!savedOtp.equals(request.getOtp())) throw new AppException(ErrorCode.OTP_INVALID);

        User user = getByEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        redisTemplate.delete(key);
    }

    @Override
    @Transactional(readOnly = true)
    public AuthenticationResponse login(AuthenticationRequest request) {
        User user = getByEmail(request.getEmail());

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword()))
            throw new AppException(ErrorCode.LOGIN_FAILED);
        if (user.getStatus() != AccountStatus.ACTIVE)
            throw new AppException(ErrorCode.ACCOUNT_LOCKED);

        return buildTokenResponse(user);
    }

    @Override
    @Transactional(readOnly = true)
    public AuthenticationResponse refreshToken(RefreshRequest request) {
        String redisKey = refreshTokenRedisKey(request.getRefreshToken());
        Object userIdRaw = redisTemplate.opsForValue().get(redisKey);

        if (userIdRaw == null) {
            validateRefreshTokenExpiry(request.getRefreshToken());
            throw new AppException(ErrorCode.INVALID_REFRESH_TOKEN);
        }

        UUID userId = UUID.fromString(String.valueOf(userIdRaw));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        redisTemplate.delete(redisKey);
        return buildTokenResponse(user);
    }

    @Override
    public AuthenticationResponse outboundAuthentication(ExchangeTokenRequest request) {
        OutboundUserResponse info = request.getProvider() == AuthProvider.GOOGLE
                ? identityClient.getUserInfoFromGoogle(request.getToken())
                : identityClient.getUserInfoFromFacebook(request.getToken());

        if (info.getEmail() == null || info.getEmail().isBlank())
            throw new AppException(ErrorCode.EMAIL_IS_REQUIRED);

        String displayName = resolveOAuthDisplayName(info);

        User user = userRepository.findByEmail(info.getEmail()).orElse(null);
        if (user == null) {
            user = userRepository.save(User.builder()
                    .email(info.getEmail())
                    .password(passwordEncoder.encode(generatePassword()))
                    .role(Role.USER)
                    .status(AccountStatus.ACTIVE)
                    .provider(request.getProvider())
                    .providerId(info.getId())
                    .fullName(displayName)
                    .avatarUrl(info.getPicture())
                    .build());
        } else if (shouldRefreshOAuthFullName(user, displayName)) {
            user.setFullName(displayName);
            if (info.getPicture() != null && !info.getPicture().isBlank()) {
                user.setAvatarUrl(info.getPicture());
            }
            user.setProvider(request.getProvider());
            if (info.getId() != null && !info.getId().isBlank()) {
                user.setProviderId(info.getId());
            }
            userRepository.save(user);
        }

        return buildTokenResponse(user);
    }


    @Override
    @Transactional
    public void logout(RefreshRequest request, String accessToken) {
        if (request != null && request.getRefreshToken() != null
                && !request.getRefreshToken().isBlank()) {
            redisTemplate.delete(refreshTokenRedisKey(request.getRefreshToken()));
        }
        blacklistAccessToken(accessToken);
    }

    private void blacklistAccessToken(String accessToken) {
        if (accessToken == null || accessToken.isBlank()) return;
        try {
            Date expiration = Jwts.parserBuilder()
                    .setSigningKey(Keys.hmacShaKeyFor(Decoders.BASE64.decode(signerKey)))
                    .build()
                    .parseClaimsJws(accessToken)
                    .getBody()
                    .getExpiration();

            long ttlSeconds = (expiration.getTime() - System.currentTimeMillis()) / 1000;
            if (ttlSeconds <= 0) return; // token đã hết hạn tự nhiên, không cần blacklist

            String key = "auth:blacklist:" + sha256Hex(accessToken);
            redisTemplate.opsForValue().set(key, "1", ttlSeconds, TimeUnit.SECONDS);
            log.debug("Blacklisted access token, TTL={}s", ttlSeconds);
        } catch (Exception e) {
            log.warn("Could not blacklist access token: {}", e.getMessage());
        }
    }

    private static String sha256Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    @Override
    @Transactional
    public String grantArtistRoleAndIssueToken(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        if (user.getRole() == Role.USER) {
            user.setRole(Role.ARTIST);
            userRepository.save(user);
            log.info("Granted ARTIST role to user {}", userId);
        }

        return generateToken(user, validDuration);
    }

    // ────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ────────────────────────────────────────────────────────────

    /**
     * Display name for Google/Facebook: use provider "name" parts only, never the email address.
     */
    private String resolveOAuthDisplayName(OutboundUserResponse info) {
        String email = info.getEmail() != null ? info.getEmail().trim() : "";

        String primary = trimToNull(info.getName());
        if (isUsableDisplayName(primary, email)) {
            return primary;
        }

        String fromGoogle = joinNameParts(info.getGivenName(), info.getFamilyName());
        if (isUsableDisplayName(fromGoogle, email)) {
            return fromGoogle;
        }

        String fromFacebook = joinNameParts(info.getFirstName(), info.getLastName());
        if (isUsableDisplayName(fromFacebook, email)) {
            return fromFacebook;
        }

        return "User";
    }

    private static String trimToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private static String joinNameParts(String a, String b) {
        String x = trimToNull(a);
        String y = trimToNull(b);
        if (x == null && y == null) return null;
        if (x == null) return y;
        if (y == null) return x;
        return x + " " + y;
    }

    private static boolean isUsableDisplayName(String candidate, String email) {
        if (candidate == null || candidate.isEmpty()) return false;
        if (email.isEmpty()) return true;
        return !candidate.equalsIgnoreCase(email);
    }

    /** Fix accounts where full_name was mistakenly set to the email; refresh from latest OAuth profile. */
    private boolean shouldRefreshOAuthFullName(User user, String displayName) {
        if (displayName == null || displayName.isBlank()) return false;
        String current = user.getFullName();
        if (current == null || current.isBlank()) return true;
        String email = user.getEmail();
        if (email != null && current.trim().equalsIgnoreCase(email.trim())) return true;
        return false;
    }

    private AuthenticationResponse buildTokenResponse(User user) {
        String accessToken  = generateToken(user, validDuration);
        String refreshToken = generateToken(user, refreshableDuration);
        saveRefreshToken(user, refreshToken);
        return AuthenticationResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .authenticated(true)
                .build();
    }

    private User getByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
    }

    String generateToken(User user, long duration) {
        Date now = new Date();

        return Jwts.builder()
                .setSubject(user.getId().toString())
                .claim("email", user.getEmail())
                .claim("role", user.getRole().name())
                .setIssuedAt(now)
                .setExpiration(new Date(now.getTime() + duration))
                .signWith(Keys.hmacShaKeyFor(Decoders.BASE64.decode(signerKey)), SignatureAlgorithm.HS256)
                .compact();
    }

    void saveRefreshToken(User user, String token) {
        redisTemplate.opsForValue().set(
                refreshTokenRedisKey(token),
                user.getId().toString(),
                refreshableDuration,
                TimeUnit.MILLISECONDS
        );
    }

    private String refreshTokenRedisKey(String token) {
        return "auth:refresh:" + token;
    }

    private void validateRefreshTokenExpiry(String refreshToken) {
        try {
            Date expiration = Jwts.parserBuilder()
                    .setSigningKey(Keys.hmacShaKeyFor(Decoders.BASE64.decode(signerKey)))
                    .build()
                    .parseClaimsJws(refreshToken)
                    .getBody()
                    .getExpiration();

            if (expiration.before(new Date())) {
                throw new AppException(ErrorCode.REFRESH_TOKEN_EXPIRED);
            }
        } catch (AppException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new AppException(ErrorCode.INVALID_REFRESH_TOKEN);
        }
    }

    String generateOtp() {
        return String.valueOf(new SecureRandom().nextInt(900000) + 100000);
    }

    String generatePassword() {
        SecureRandom random = new SecureRandom();
        StringBuilder pw = new StringBuilder();
        pw.append(LOWER.charAt(random.nextInt(LOWER.length())));
        pw.append(UPPER.charAt(random.nextInt(UPPER.length())));
        pw.append(DIGIT.charAt(random.nextInt(DIGIT.length())));
        pw.append(SPECIAL.charAt(random.nextInt(SPECIAL.length())));
        for (int i = 4; i < 12; i++) pw.append(ALL.charAt(random.nextInt(ALL.length())));

        List<Character> chars = pw.chars().mapToObj(c -> (char) c).collect(Collectors.toList());
        Collections.shuffle(chars, random);
        StringBuilder result = new StringBuilder();
        chars.forEach(result::append);
        return result.toString();
    }

    /** Cùng transaction với save user / Redis OTP — scheduler gửi RabbitMQ. */
    private void enqueueNotificationEmail(NotificationEvent event, String aggregateType, String aggregateId) {
        try {
            outboxEventRepository.save(OutboxEvent.builder()
                    .aggregateType(aggregateType)
                    .aggregateId(aggregateId)
                    .eventType(OutboxEventTypes.NOTIFICATION_EMAIL)
                    .exchange(RabbitMQConfig.NOTIFICATION_EXCHANGE)
                    .routingKey(RabbitMQConfig.ROUTING_NOTIFICATION_EMAIL)
                    .payload(objectMapper.writeValueAsString(event))
                    .published(false)
                    .createdAt(Instant.now())
                    .build());
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize notification for outbox", e);
        }
    }
}