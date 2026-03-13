package iuh.fit.se.identityservice.service.impl;

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
import iuh.fit.se.identityservice.exception.ErrorCode;
import iuh.fit.se.identityservice.repository.UserRepository;
import iuh.fit.se.identityservice.repository.httpclient.IdentityClient;
import iuh.fit.se.identityservice.service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
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
    private final RabbitTemplate rabbitTemplate;   // ← thay ApplicationEventPublisher

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

        // Gửi email qua RabbitMQ (integration-service lắng nghe)
        publishNotification(NotificationEvent.builder()
                .channel("EMAIL")
                .recipient(user.getEmail())
                .subject("Welcome to TramCamXuc - Verify your account")
                .templateCode("register-otp")
                .paramMap(Map.of("name", request.getFullName(), "otp", otp))
                .build());

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
    public void resendOtp(String email) {
        User user = getByEmail(email);
        if (user.getStatus() == AccountStatus.ACTIVE)
            throw new AppException(ErrorCode.ACCOUNT_ALREADY_VERIFIED);

        String otp = generateOtp();
        redisTemplate.opsForValue().set("auth:otp:registration:" + email, otp, 5, TimeUnit.MINUTES);

        publishNotification(NotificationEvent.builder()
                .channel("EMAIL")
                .recipient(email)
                .subject("Resend OTP")
                .templateCode("register-otp")
                .paramMap(Map.of("name", email, "otp", otp))
                .build());
    }

    @Override
    public void forgotPassword(String email) {
        User user = getByEmail(email);
        String otp = generateOtp();
        redisTemplate.opsForValue().set("auth:otp:forgot:" + email, otp, 5, TimeUnit.MINUTES);

        publishNotification(NotificationEvent.builder()
                .channel("EMAIL")
                .recipient(email)
                .subject("Reset Password Request")
                .templateCode("forgot-password")
                .paramMap(Map.of("name", user.getFullName(), "otp", otp))
                .build());
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
    public AuthenticationResponse login(AuthenticationRequest request) {
        User user = getByEmail(request.getEmail());

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword()))
            throw new AppException(ErrorCode.LOGIN_FAILED);
        if (user.getStatus() != AccountStatus.ACTIVE)
            throw new AppException(ErrorCode.ACCOUNT_LOCKED);

        return buildTokenResponse(user);
    }

    @Override
    @Transactional
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

        User user = userRepository.findByEmail(info.getEmail()).orElseGet(() ->
                userRepository.save(User.builder()
                        .email(info.getEmail())
                        .password(passwordEncoder.encode(generatePassword()))
                        .role(Role.USER)
                        .status(AccountStatus.ACTIVE)
                        .provider(request.getProvider())
                        .providerId(info.getId())
                        .fullName(info.getName())
                        .avatarUrl(info.getPicture())
                        .build())
        );

        return buildTokenResponse(user);
    }


    @Override
    @Transactional
    public void logout(RefreshRequest request) {
        if (request == null || request.getRefreshToken() == null
                || request.getRefreshToken().isBlank()) return;
        redisTemplate.delete(refreshTokenRedisKey(request.getRefreshToken()));
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

    /**
     * Publish notification event sang integration-service qua RabbitMQ.
     */
    private void publishNotification(NotificationEvent event) {
        try {
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.NOTIFICATION_EXCHANGE,
                    RabbitMQConfig.ROUTING_NOTIFICATION_EMAIL,
                    event
            );
        } catch (Exception e) {
            log.error("Failed to publish notification event", e);
        }
    }
}