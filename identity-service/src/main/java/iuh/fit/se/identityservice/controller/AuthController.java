package iuh.fit.se.identityservice.controller;

import iuh.fit.se.identityservice.dto.ApiResponse;
import iuh.fit.se.identityservice.dto.request.*;
import iuh.fit.se.identityservice.dto.response.AuthenticationResponse;
import iuh.fit.se.identityservice.dto.response.UserResponse;
import iuh.fit.se.identityservice.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/registration")
    public ApiResponse<UserResponse> register(@RequestBody @Valid UserRegistrationRequest request) {
        return ApiResponse.<UserResponse>builder().result(authService.createUser(request)).build();
    }

    @PostMapping("/verify")
    public ApiResponse<Void> verify(@RequestBody VerifyOtpRequest request) {
        authService.verifyOtp(request.getEmail(), request.getOtp());
        return ApiResponse.<Void>builder().message("Account verified successfully").build();
    }

    @PostMapping("/resend-otp")
    public ApiResponse<Void> resendOtp(@RequestParam String email) {
        authService.resendOtp(email);
        return ApiResponse.<Void>builder().message("OTP sent").build();
    }

    @PostMapping("/forgot-password")
    public ApiResponse<Void> forgotPassword(@RequestParam String email) {
        authService.forgotPassword(email);
        return ApiResponse.<Void>builder().message("Reset password OTP has been sent").build();
    }

    @PostMapping("/reset-password")
    public ApiResponse<Void> resetPassword(@RequestBody @Valid PasswordResetRequest request) {
        authService.resetPassword(request);
        return ApiResponse.<Void>builder().message("Password has been reset successfully").build();
    }

    @PostMapping("/login")
    public ApiResponse<AuthenticationResponse> login(@RequestBody AuthenticationRequest request) {
        return ApiResponse.<AuthenticationResponse>builder().result(authService.login(request)).build();
    }

    @PostMapping("/refresh")
    public ApiResponse<AuthenticationResponse> refresh(@RequestBody RefreshRequest request) {
        return ApiResponse.<AuthenticationResponse>builder().result(authService.refreshToken(request)).build();
    }

    @PostMapping("/social")
    public ApiResponse<AuthenticationResponse> social(@RequestBody @Valid ExchangeTokenRequest request) {
        return ApiResponse.<AuthenticationResponse>builder().result(authService.outboundAuthentication(request)).build();
    }
}