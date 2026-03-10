package iuh.fit.se.identityservice.service;

import iuh.fit.se.identityservice.dto.request.ChangePasswordRequest;
import iuh.fit.se.identityservice.dto.request.ProfileUpdateRequest;
import iuh.fit.se.identityservice.dto.request.UpdateFavoritesRequest;
import iuh.fit.se.identityservice.dto.response.FavoritesResponse;
import iuh.fit.se.identityservice.dto.response.UserResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

public interface UserService {

    UserResponse getMyProfile();

    UserResponse updateProfile(ProfileUpdateRequest request);

    void changePassword(ChangePasswordRequest request);

    UserResponse uploadAvatar(MultipartFile file);

    void deleteAccount();

    Page<UserResponse> getAllUsers(Pageable pageable);

    UserResponse getUserById(String id);

    void banUser(String id);

    // ── Favorites for onboarding ──────────────────────────────────────────────

    /**
     * Lấy thông tin favorites của user hiện tại.
     */
    FavoritesResponse getMyFavorites();

    /**
     * Cập nhật favorites (lần đầu hoặc chọn lại).
     * Tự động set pickFavorite = true.
     */
    FavoritesResponse updateMyFavorites(UpdateFavoritesRequest request);
}