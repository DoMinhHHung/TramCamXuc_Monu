package iuh.fit.se.identity.controller;

import iuh.fit.se.core.dto.ApiResponse;
import iuh.fit.se.identity.dto.request.ChangePasswordRequest;
import iuh.fit.se.identity.dto.request.ProfileUpdateRequest;
import iuh.fit.se.identity.dto.response.UserResponse;
import iuh.fit.se.identity.service.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock
    private UserService userService;

    @InjectMocks
    private UserController userController;

    @Test
    void getMyProfile_shouldReturnProfile() {
        UserResponse profile = UserResponse.builder().email("me@test.com").build();
        when(userService.getMyProfile()).thenReturn(profile);
        assertEquals(profile, userController.getMyProfile().getResult());
    }

    @Test
    void updateProfile_shouldReturnUpdatedProfile() {
        ProfileUpdateRequest request = ProfileUpdateRequest.builder().fullName("Name").build();
        UserResponse updated = UserResponse.builder().fullName("Name").build();
        when(userService.updateProfile(request)).thenReturn(updated);
        assertEquals(updated, userController.updateProfile(request).getResult());
    }

    @Test
    void uploadAvatar_shouldDelegateService() {
        MultipartFile file = mock(MultipartFile.class);
        UserResponse updated = UserResponse.builder().avatarUrl("url").build();
        when(userService.uploadAvatar(file)).thenReturn(updated);
        assertEquals(updated, userController.uploadAvatar(file).getResult());
    }

    @Test
    void changePassword_shouldCallService() {
        ChangePasswordRequest request = ChangePasswordRequest.builder().build();
        ApiResponse<Void> response = userController.changePassword(request);
        assertEquals("Password changed successfully", response.getMessage());
        verify(userService).changePassword(request);
    }

    @Test
    void deleteAccount_shouldCallService() {
        ApiResponse<Void> response = userController.deleteAccount();
        assertEquals("Account deleted", response.getMessage());
        verify(userService).deleteAccount();
    }

    @Test
    void getAllUsers_shouldMapPageAndSort() {
        Pageable pageable = PageRequest.of(1, 5, Sort.by("createdAt").descending());
        Page<UserResponse> page = new PageImpl<>(List.of(UserResponse.builder().build()), pageable, 1);
        when(userService.getAllUsers(pageable)).thenReturn(page);

        ApiResponse<Page<UserResponse>> response = userController.getAllUsers(2, 5);

        assertEquals(page, response.getResult());
        verify(userService).getAllUsers(pageable);
    }

    @Test
    void getUserById_shouldReturnUser() {
        java.util.UUID userId = java.util.UUID.randomUUID();
        UserResponse user = UserResponse.builder().id(userId).build();
        when(userService.getUserById("u1")).thenReturn(user);
        assertEquals(user, userController.getUserById("u1").getResult());
    }

    @Test
    void banUser_shouldCallService() {
        ApiResponse<Void> response = userController.banUser("u1");
        assertEquals("User status updated successfully", response.getMessage());
        verify(userService).banUser("u1");
    }
}
