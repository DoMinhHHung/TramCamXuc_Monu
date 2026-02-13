package iuh.fit.se.identity.service.impl;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import iuh.fit.se.core.event.NotificationEvent;
import iuh.fit.se.core.exception.*;
import iuh.fit.se.identity.dto.mapper.UserMapper;
import iuh.fit.se.identity.dto.request.*;
import iuh.fit.se.identity.dto.response.AuthenticationResponse;
import iuh.fit.se.identity.dto.response.OutboundUserResponse;
import iuh.fit.se.identity.dto.response.UserResponse;
import iuh.fit.se.identity.entity.RefreshToken;
import iuh.fit.se.identity.entity.User;
import iuh.fit.se.identity.enums.*;
import iuh.fit.se.identity.repository.RefreshTokenRepository;
import iuh.fit.se.identity.repository.UserRepository;
import iuh.fit.se.identity.repository.httpclient.IdentityClient;
import iuh.fit.se.identity.service.AuthService;
import iuh.fit.se.identity.service.FreePlanConfigService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthServiceImpl implements AuthService {
    UserRepository userRepository;
    UserMapper userMapper;
    PasswordEncoder passwordEncoder;
    IdentityClient identityClient;
    final RedisTemplate<String, Object> redisTemplate;
    final ApplicationEventPublisher eventPublisher;
    final RefreshTokenRepository refreshTokenRepository;
    private final FreePlanConfigService freePlanConfigService;

    static final String LOWER = "abcdefghijklmnopqrstuvwxyz";
    static final String UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    static final String DIGIT = "0123456789";
    static final String SPECIAL = "!@#$%^&*";
    static final String ALL = LOWER + UPPER + DIGIT + SPECIAL;
    static final int PASSWORD_LENGTH = 12;

    @NonFinal @Value("${jwt.signerKey}")
    protected String signerKey;

    @NonFinal @Value("${jwt.valid-duration}")
    protected long validDuration;

    @NonFinal @Value("${jwt.refreshable-duration}")
    protected long refreshableDuration;


    @Override
    @Transactional
    public UserResponse createUser(UserRegistrationRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException(ErrorCode.USER_EXISTED);
        }

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
        user.setSubscriptionPlan(freePlanConfigService.getCurrentFreePlanName());
        user.setSubscriptionFeatures(freePlanConfigService.getCurrentFreeFeaturesJson());

        try {
            user = userRepository.save(user);
        } catch (Exception e) {
            redisTemplate.delete(redisKey);
            throw new AppException(ErrorCode.DB_CONNECTION_FAILED);
        }

        eventPublisher.publishEvent(NotificationEvent.builder()
                .channel("EMAIL")
                .recipient(user.getEmail())
                .subject("Welcome to Trạm Cảm Xúc - Verify your account")
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

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        user.setStatus(AccountStatus.ACTIVE);
        userRepository.save(user);

        redisTemplate.delete(key);
    }

    @Override
    public void resendOtp(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        if (user.getStatus() == AccountStatus.ACTIVE)
            throw new AppException(ErrorCode.ACCOUNT_ALREADY_VERIFIED);

        String otp = generateOtp();
        redisTemplate.opsForValue().set("auth:otp:registration:" + email, otp, 5, TimeUnit.MINUTES);

        eventPublisher.publishEvent(NotificationEvent.builder()
                .channel("EMAIL")
                .recipient(email)
                .subject("Resend OTP - Verify your account")
                .templateCode("register-otp")
                .paramMap(Map.of("name", email, "otp", otp))
                .build());
    }

    @Override
    public void forgotPassword(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        String otp = generateOtp();

        redisTemplate.opsForValue().set("auth:otp:forgot:" + email, otp, 5, TimeUnit.MINUTES);

        eventPublisher.publishEvent(NotificationEvent.builder()
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

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        redisTemplate.delete(key);
    }

    @Override
    public AuthenticationResponse login(AuthenticationRequest request) {
        var user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        boolean authenticated = passwordEncoder.matches(request.getPassword(), user.getPassword());
        if (!authenticated) throw new AppException(ErrorCode.LOGIN_FAILED);

        if (user.getStatus() != AccountStatus.ACTIVE) throw new AppException(ErrorCode.ACCOUNT_LOCKED);

        String accessToken = generateToken(user, validDuration);
        String refreshToken = generateToken(user, refreshableDuration);

        saveRefreshToken(user, refreshToken);

        return AuthenticationResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .authenticated(true)
                .build();
    }

    @Override
    @Transactional
    public AuthenticationResponse refreshToken(RefreshRequest request) {
        var storedToken = refreshTokenRepository.findByToken(request.getRefreshToken())
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REFRESH_TOKEN));

        if (storedToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            refreshTokenRepository.delete(storedToken);
            throw new AppException(ErrorCode.REFRESH_TOKEN_EXPIRED);
        }

        User user = storedToken.getUser();
        refreshTokenRepository.delete(storedToken);

        String newAccessToken = generateToken(user, validDuration);
        String newRefreshToken = generateToken(user, refreshableDuration);

        saveRefreshToken(user, newRefreshToken);

        return AuthenticationResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .authenticated(true)
                .build();
    }

    @Override
    public AuthenticationResponse outboundAuthentication(ExchangeTokenRequest request) {
        OutboundUserResponse userInfo;

        if (request.getProvider() == AuthProvider.GOOGLE) {
            userInfo = identityClient.getUserInfoFromGoogle(request.getToken());
        } else if (request.getProvider() == AuthProvider.FACEBOOK) {
            userInfo = identityClient.getUserInfoFromFacebook(request.getToken());
        } else {
            throw new AppException(ErrorCode.INVALID_KEY);
        }
        if (userInfo.getEmail() == null || userInfo.getEmail().isBlank()) {
            throw new AppException(ErrorCode.EMAIL_IS_REQUIRED);
        }

        User user = userRepository.findByEmail(userInfo.getEmail()).orElseGet(() -> {
            return userRepository.save(User.builder()
                    .email(userInfo.getEmail())
                    .password(passwordEncoder.encode(generatePassword()))
                    .role(Role.USER)
                    .status(AccountStatus.ACTIVE)
                    .provider(request.getProvider())
                    .providerId(userInfo.getId())
                    .fullName(userInfo.getName())
                    .avatarUrl(userInfo.getPicture())
                    .subscriptionPlan(freePlanConfigService.getCurrentFreePlanName())
                    .subscriptionFeatures(freePlanConfigService.getCurrentFreeFeaturesJson())
                    .build());
        });

        String accessToken = generateToken(user, validDuration);
        String refreshToken = generateToken(user, refreshableDuration);
        saveRefreshToken(user, refreshToken);

        return AuthenticationResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .authenticated(true)
                .build();
        }

    String generateOtp() {
        return String.valueOf(new SecureRandom().nextInt(900000) + 100000);
    }
    String generateToken(User user, long duration) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + duration);

        StringJoiner scopeJoiner = new StringJoiner(" ");
        scopeJoiner.add("ROLE_" + user.getRole().name());

        String features = user.getSubscriptionFeatures();
        String plan = user.getSubscriptionPlan();

        return Jwts.builder()
                .setSubject(user.getId().toString())
                .claim("email", user.getEmail())
                .claim("role", scopeJoiner.toString())
                .claim("scope", scopeJoiner.toString())
                .claim("name", user.getFullName())
                .claim("plan", plan != null ? plan : "FREE")
                .claim("features", features)
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(Keys.hmacShaKeyFor(Decoders.BASE64.decode(signerKey)), SignatureAlgorithm.HS256)
                .compact();
    }
    void saveRefreshToken(User user, String token) {
        RefreshToken refreshTokenEntity = RefreshToken.builder()
                .token(token)
                .user(user)
                .expiryDate(LocalDateTime.now().plusNanos(refreshableDuration * 1000000))
                .build();
        refreshTokenRepository.save(refreshTokenEntity);
    }
    String generatePassword() {
        SecureRandom random = new SecureRandom();
        StringBuilder password = new StringBuilder();

        password.append(LOWER.charAt(random.nextInt(LOWER.length())));
        password.append(UPPER.charAt(random.nextInt(UPPER.length())));
        password.append(DIGIT.charAt(random.nextInt(DIGIT.length())));
        password.append(SPECIAL.charAt(random.nextInt(SPECIAL.length())));

        for (int i = 4; i < PASSWORD_LENGTH; i++) {
            password.append(ALL.charAt(random.nextInt(ALL.length())));
        }
        List<Character> chars = password.chars()
                .mapToObj(c -> (char) c)
                .collect(Collectors.toList());

        Collections.shuffle(chars, random);

        StringBuilder finalPassword = new StringBuilder();
        chars.forEach(finalPassword::append);

        return finalPassword.toString();
    }
}
