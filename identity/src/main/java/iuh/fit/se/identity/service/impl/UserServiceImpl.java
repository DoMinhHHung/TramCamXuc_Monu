package iuh.fit.se.identity.service.impl;

import iuh.fit.se.core.exception.*;
import iuh.fit.se.identity.dto.mapper.UserMapper;
import iuh.fit.se.identity.dto.request.ChangePasswordRequest;
import iuh.fit.se.identity.dto.request.ProfileUpdateRequest;
import iuh.fit.se.identity.dto.response.UserResponse;
import iuh.fit.se.identity.entity.User;
import iuh.fit.se.identity.enums.AccountStatus;
import iuh.fit.se.identity.enums.Role;
import iuh.fit.se.identity.repository.UserRepository;
import iuh.fit.se.identity.service.StorageService;
import iuh.fit.se.identity.service.UserService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;


@RequiredArgsConstructor
@Service
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserServiceImpl implements UserService {
    UserRepository userRepository;
    UserMapper userMapper;
    PasswordEncoder passwordEncoder;

    final StorageService storageService;

    private User getCurrentUser() {
        var context = SecurityContextHolder.getContext();
        String userId = context.getAuthentication().getName();
        return userRepository.findById(UUID.fromString(userId))
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
    }

    @Override
    public UserResponse getMyProfile() {
        return userMapper.toResponse(getCurrentUser());
    }

    @Override
    public UserResponse updateProfile(ProfileUpdateRequest request) {
        User user = getCurrentUser();

        if (request.getFullName() != null) user.setFullName(request.getFullName());
        if (request.getDob() != null) user.setDob(request.getDob());
        if (request.getGender() != null) user.setGender(request.getGender());

        return userMapper.toResponse(userRepository.save(user));
    }

    @Override
    public void changePassword(ChangePasswordRequest request) {
        User user = getCurrentUser();

        if (user.getPassword() == null) throw new AppException(ErrorCode.INVALID_PASSWORD);
        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword()))
            throw new AppException(ErrorCode.INVALID_PASSWORD);

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    @Override
    public UserResponse uploadAvatar(MultipartFile file) {
        User user = getCurrentUser();
        storageService.deleteImage(user.getAvatarUrl());

        String url = storageService.uploadImage(file, "phazelsound/avatar");
        user.setAvatarUrl(url);

        return userMapper.toResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public void deleteAccount() {
        User user = getCurrentUser();
        userRepository.delete(user);
    }

    @Override
    public Page<UserResponse> getAllUsers(Pageable pageable) {
        User user = getCurrentUser();
        if (user.getRole() != Role.ADMIN) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }
        return userRepository.findAllByRoleNot(Role.ADMIN, pageable)
                .map(userMapper::toResponse);
    }

    @Override
    public UserResponse getUserById(String id) {
        User user = getCurrentUser();
        if (user.getRole() != Role.ADMIN) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }
        user = userRepository.findById(UUID.fromString(id))
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        if (user.getRole() == Role.ADMIN) {
            throw new AppException(ErrorCode.CANNOT_ACCESS_ADMIN);
        }

        return userMapper.toResponse(user);
    }

    @Override
    public void banUser(String id) {
        User user = userRepository.findById(UUID.fromString(id))
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        if (user.getRole() == Role.ADMIN) {
            throw new AppException(ErrorCode.CANNOT_ACCESS_ADMIN);
        }

        if (user.getStatus() == AccountStatus.BANNED) {
            user.setStatus(AccountStatus.ACTIVE);
        } else {
            user.setStatus(AccountStatus.BANNED);
        }

        if (user.getStatus() == AccountStatus.BANNED) {
            user.getRefreshTokens().clear();
        }

        userRepository.save(user);
    }
}
