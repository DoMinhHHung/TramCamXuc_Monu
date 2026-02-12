package iuh.fit.se.identity.service;

import iuh.fit.se.identity.dto.request.PasswordResetRequest;
import iuh.fit.se.identity.dto.request.UserRegistrationRequest;
import iuh.fit.se.identity.dto.response.UserResponse;

public interface AuthService {
    UserResponse createUser(UserRegistrationRequest request);
    void verifyOtp(String email, String otp);
    void resendOtp(String email);
    void forgotPassword(String email);
    void resetPassword(PasswordResetRequest request);
}