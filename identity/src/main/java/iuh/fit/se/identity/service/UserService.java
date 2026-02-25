package iuh.fit.se.identity.service;

import iuh.fit.se.identity.dto.request.*;
import iuh.fit.se.identity.dto.response.UserResponse;
import org.springframework.data.domain.*;
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
    boolean existsById(String id);
}
