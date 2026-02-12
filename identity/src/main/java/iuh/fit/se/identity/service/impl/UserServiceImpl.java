package iuh.fit.se.identity.service.impl;

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
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserServiceImpl implements UserService {
    UserRepository userRepository;
    UserMapper userMapper;
    PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();


    @Override
    public UserResponse createUser(UserCreationRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException(ErrorCode.USER_EXISTED);
        }

        User user = userMapper.toEntity(request);

        user.setPassword(passwordEncoder.encode(request.getPassword()));

        user.setRole(Role.USER);

        user = userRepository.save(user);

        return userMapper.toResponse(user);
    }
}
