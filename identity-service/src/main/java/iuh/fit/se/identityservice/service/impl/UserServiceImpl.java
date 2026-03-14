package iuh.fit.se.identityservice.service.impl;

import iuh.fit.se.identityservice.dto.mapper.UserMapper;
import iuh.fit.se.identityservice.dto.request.ChangePasswordRequest;
import iuh.fit.se.identityservice.dto.request.ProfileUpdateRequest;
import iuh.fit.se.identityservice.dto.request.UpdateFavoritesRequest;
import iuh.fit.se.identityservice.dto.response.FavoritesResponse;
import iuh.fit.se.identityservice.dto.response.UserResponse;
import iuh.fit.se.identityservice.entity.User;
import iuh.fit.se.identityservice.enums.AccountStatus;
import iuh.fit.se.identityservice.enums.Role;
import iuh.fit.se.identityservice.exception.AppException;
import iuh.fit.se.identityservice.exception.ErrorCode;
import iuh.fit.se.identityservice.repository.RefreshTokenRepository;
import iuh.fit.se.identityservice.repository.UserRepository;
import iuh.fit.se.identityservice.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final StorageService storageService;
    private final RefreshTokenRepository refreshTokenRepository;

    private User currentUser() {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findById(UUID.fromString(userId))
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
    }

    @Override
    public UserResponse getMyProfile() {
        return userMapper.toResponse(currentUser());
    }

    @Override
    public UserResponse updateProfile(ProfileUpdateRequest request) {
        User user = currentUser();
        if (request.getFullName() != null) user.setFullName(request.getFullName());
        if (request.getDob()      != null) user.setDob(request.getDob());
        if (request.getGender()   != null) user.setGender(request.getGender());
        return userMapper.toResponse(userRepository.save(user));
    }

    @Override
    public void changePassword(ChangePasswordRequest request) {
        User user = currentUser();
        if (user.getPassword() == null)
            throw new AppException(ErrorCode.CANNOT_CHANGE_PASSWORD_SOCIAL_USER);
        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword()))
            throw new AppException(ErrorCode.INVALID_PASSWORD);
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    @Override
    public UserResponse uploadAvatar(MultipartFile file) {
        User user = currentUser();
        storageService.deleteImage(user.getAvatarUrl());
        user.setAvatarUrl(storageService.uploadImage(file, "phazelsound/avatar"));
        return userMapper.toResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public void deleteAccount() {
        User user = currentUser();
        refreshTokenRepository.deleteByUser(user);
        userRepository.delete(user);
    }

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    public Page<UserResponse> getAllUsers(Pageable pageable) {
        return userRepository.findAllByRoleNot(Role.ADMIN, pageable).map(userMapper::toResponse);
    }

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse getUserById(String id) {
        User user = userRepository.findById(UUID.fromString(id))
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        if (user.getRole() == Role.ADMIN)
            throw new AppException(ErrorCode.CANNOT_ACCESS_ADMIN);
        return userMapper.toResponse(user);
    }

    @Override
    public void banUser(String id) {
        User user = userRepository.findById(UUID.fromString(id))
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        if (user.getRole() == Role.ADMIN)
            throw new AppException(ErrorCode.CANNOT_ACCESS_ADMIN);

        if (user.getStatus() == AccountStatus.BANNED) {
            user.setStatus(AccountStatus.ACTIVE);
        } else {
            user.setStatus(AccountStatus.BANNED);
            refreshTokenRepository.deleteByUser(user);
        }
        userRepository.save(user);
    }
    // ── Favorites for onboarding ──────────────────────────────────────────────

    @Override
    public FavoritesResponse getMyFavorites() {
        User user = currentUser();
        return FavoritesResponse.builder()
                .pickFavorite(user.getPickFavorite())
                .favoriteGenreIds(user.getFavoriteGenreIds())
                .favoriteArtistIds(user.getFavoriteArtistIds())
                .build();
    }

    @Override
    @Transactional
    public FavoritesResponse updateMyFavorites(UpdateFavoritesRequest request) {
        User user = currentUser();

        // Cập nhật favorites
        user.setFavoriteGenreIds(request.getFavoriteGenreIds());
        user.setFavoriteArtistIds(request.getFavoriteArtistIds());
        user.setPickFavorite(true);

        User saved = userRepository.save(user);

        return FavoritesResponse.builder()
                .pickFavorite(saved.getPickFavorite())
                .favoriteGenreIds(saved.getFavoriteGenreIds())
                .favoriteArtistIds(saved.getFavoriteArtistIds())
                .build();
    }
}