package iuh.fit.se.identity.service.impl;

import iuh.fit.se.core.event.NotificationEvent;
import iuh.fit.se.core.exception.*;
import iuh.fit.se.identity.dto.mapper.UserMapper;
import iuh.fit.se.identity.dto.request.UserCreationRequest;
import iuh.fit.se.identity.dto.response.UserResponse;
import iuh.fit.se.identity.entity.User;
import iuh.fit.se.identity.enums.*;
import iuh.fit.se.identity.repository.UserRepository;
import iuh.fit.se.identity.service.UserService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserServiceImpl implements UserService {
    UserRepository userRepository;
    UserMapper userMapper;
    PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final RedisTemplate<String, Object> redisTemplate;
    private final ApplicationEventPublisher eventPublisher;


    @Override
    @Transactional
    public UserResponse createUser(UserCreationRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException(ErrorCode.USER_EXISTED);
        }

        String otp = generateOtp();
        String redisKey = "auth:otp:" + request.getEmail();

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

        eventPublisher.publishEvent(NotificationEvent.builder()
                .channel("EMAIL")
                .recipient(user.getEmail())
                .subject("Welcome to Trạm Cảm Xúc - Verify your account")
                .templateCode("register-otp")
                .paramMap(Map.of("name", request.getEmail(), "otp", otp))
                .build());

        return userMapper.toResponse(user);
    }

    @Override
    public void verifyOtp(String email, String otp) {
        String key = "auth:otp:" + email;
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
        redisTemplate.opsForValue().set("auth:otp:" + email, otp, 5, TimeUnit.MINUTES);

        eventPublisher.publishEvent(NotificationEvent.builder()
                .channel("EMAIL")
                .recipient(email)
                .subject("Resend OTP - Verify your account")
                .templateCode("register-otp")
                .paramMap(Map.of("name", email, "otp", otp))
                .build());
    }

    private String generateOtp() {
        return String.valueOf(new SecureRandom().nextInt(900000) + 100000);
    }
}
