package iuh.fit.se.identityservice.controller;

import iuh.fit.se.identityservice.dto.ApiResponse;
import iuh.fit.se.identityservice.dto.request.ChangePasswordRequest;
import iuh.fit.se.identityservice.dto.request.ProfileUpdateRequest;
import iuh.fit.se.identityservice.dto.response.UserResponse;
import iuh.fit.se.identityservice.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/my-profile")
    public ApiResponse<UserResponse> getMyProfile() {
        return ApiResponse.<UserResponse>builder().result(userService.getMyProfile()).build();
    }

    @PutMapping("/my-profile")
    public ApiResponse<UserResponse> updateProfile(@RequestBody @Valid ProfileUpdateRequest request) {
        return ApiResponse.<UserResponse>builder().result(userService.updateProfile(request)).build();
    }

    @PostMapping(value = "/upload-avatar", consumes = "multipart/form-data")
    public ApiResponse<UserResponse> uploadAvatar(@RequestPart("file") MultipartFile file) {
        return ApiResponse.<UserResponse>builder().result(userService.uploadAvatar(file)).build();
    }

    @PutMapping("/change-password")
    public ApiResponse<Void> changePassword(@RequestBody @Valid ChangePasswordRequest request) {
        userService.changePassword(request);
        return ApiResponse.<Void>builder().message("Password changed successfully").build();
    }

    @DeleteMapping("/my-profile")
    public ApiResponse<Void> deleteAccount() {
        userService.deleteAccount();
        return ApiResponse.<Void>builder().message("Account deleted").build();
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Page<UserResponse>> getAllUsers(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by("createdAt").descending());
        return ApiResponse.<Page<UserResponse>>builder().result(userService.getAllUsers(pageable)).build();
    }

    @GetMapping("/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<UserResponse> getUserById(@PathVariable String userId) {
        return ApiResponse.<UserResponse>builder().result(userService.getUserById(userId)).build();
    }

    @PatchMapping("/{userId}/ban")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> banUser(@PathVariable String userId) {
        userService.banUser(userId);
        return ApiResponse.<Void>builder().message("User status updated successfully").build();
    }
}