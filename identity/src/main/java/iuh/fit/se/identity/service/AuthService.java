package iuh.fit.se.identity.service;

import iuh.fit.se.identity.dto.request.*;
import iuh.fit.se.identity.dto.response.*;

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