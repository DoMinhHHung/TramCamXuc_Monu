package iuh.fit.se.identity.controller;

import iuh.fit.se.core.dto.ApiResponse;
import iuh.fit.se.identity.dto.request.PasswordResetRequest;
import iuh.fit.se.identity.dto.request.UserRegistrationRequest;
import iuh.fit.se.identity.dto.request.VerifyOtpRequest;
import iuh.fit.se.identity.dto.response.UserResponse;
import iuh.fit.se.identity.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.AccessLevel;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth/users")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserController {

    AuthService userService;

    @PostMapping("/registration")
    public ApiResponse<UserResponse> register(@RequestBody @Valid UserRegistrationRequest request) {
        return ApiResponse.<UserResponse>builder()
                .result(userService.createUser(request))
                .build();
    }

    @PostMapping("/verify")
    public ApiResponse<Void> verify(@RequestBody VerifyOtpRequest request) {
        userService.verifyOtp(request.getEmail(), request.getOtp());
        return ApiResponse.<Void>builder()
                .message("Account verified successfully")
                .build();
    }

    @PostMapping("/resend-otp")
    public ApiResponse<Void> resendOtp(@RequestParam("email") String email) {
        userService.resendOtp(email);
        return ApiResponse.<Void>builder()
                .message("OTP sent")
                .build();
    }

    @PostMapping("/forgot-password")
    public ApiResponse<Void> forgotPassword(@RequestParam("email") String email) {
        userService.forgotPassword(email);
        return ApiResponse.<Void>builder()
                .message("Reset password OTP has been sent")
                .build();
    }

    @PostMapping("/reset-password")
    public ApiResponse<Void> resetPassword(@RequestBody @Valid PasswordResetRequest request) {
        userService.resetPassword(request);
        return ApiResponse.<Void>builder()
                .message("Password has been reset successfully")
                .build();
    }
}