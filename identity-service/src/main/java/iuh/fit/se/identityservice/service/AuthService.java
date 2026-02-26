package iuh.fit.se.identityservice.service;

import iuh.fit.se.identityservice.dto.request.*;
import iuh.fit.se.identityservice.dto.response.AuthenticationResponse;
import iuh.fit.se.identityservice.dto.response.UserResponse;

public interface AuthService {

    UserResponse createUser(UserRegistrationRequest request);

    void verifyOtp(String email, String otp);

    void resendOtp(String email);

    void forgotPassword(String email);

    void resetPassword(PasswordResetRequest request);

    AuthenticationResponse login(AuthenticationRequest request);

    AuthenticationResponse refreshToken(RefreshRequest request);

    AuthenticationResponse outboundAuthentication(ExchangeTokenRequest request);
}