package iuh.fit.se.identity.controller;

import iuh.fit.se.core.dto.ApiResponse;
import iuh.fit.se.identity.dto.request.*;
import iuh.fit.se.identity.dto.response.AuthenticationResponse;
import iuh.fit.se.identity.dto.response.UserResponse;
import iuh.fit.se.identity.service.AuthService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    @Test
    void register_shouldReturnUser() {
        UserRegistrationRequest request = UserRegistrationRequest.builder().build();
        UserResponse user = UserResponse.builder().email("a@b.com").build();
        when(authService.createUser(request)).thenReturn(user);

        ApiResponse<UserResponse> response = authController.register(request);

        assertEquals(user, response.getResult());
        verify(authService).createUser(request);
    }

    @Test
    void verify_shouldCallServiceAndReturnMessage() {
        VerifyOtpRequest request = new VerifyOtpRequest();
        request.setEmail("a@b.com");
        request.setOtp("123456");

        ApiResponse<Void> response = authController.verify(request);

        assertEquals("Account verified successfully", response.getMessage());
        verify(authService).verifyOtp("a@b.com", "123456");
    }

    @Test
    void resendOtp_shouldCallService() {
        ApiResponse<Void> response = authController.resendOtp("a@b.com");
        assertEquals("OTP sent", response.getMessage());
        verify(authService).resendOtp("a@b.com");
    }

    @Test
    void forgotPassword_shouldCallService() {
        ApiResponse<Void> response = authController.forgotPassword("a@b.com");
        assertEquals("Reset password OTP has been sent", response.getMessage());
        verify(authService).forgotPassword("a@b.com");
    }

    @Test
    void resetPassword_shouldCallService() {
        PasswordResetRequest request = PasswordResetRequest.builder().build();
        ApiResponse<Void> response = authController.resetPassword(request);
        assertEquals("Password has been reset successfully", response.getMessage());
        verify(authService).resetPassword(request);
    }

    @Test
    void login_shouldReturnAuthResponse() {
        AuthenticationRequest request = AuthenticationRequest.builder().build();
        AuthenticationResponse auth = AuthenticationResponse.builder().authenticated(true).build();
        when(authService.login(request)).thenReturn(auth);

        ApiResponse<AuthenticationResponse> response = authController.login(request);

        assertEquals(auth, response.getResult());
        verify(authService).login(request);
    }

    @Test
    void refresh_shouldReturnAuthResponse() {
        RefreshRequest request = new RefreshRequest();
        request.setRefreshToken("t");
        AuthenticationResponse auth = AuthenticationResponse.builder().authenticated(true).build();
        when(authService.refreshToken(request)).thenReturn(auth);

        ApiResponse<AuthenticationResponse> response = authController.refresh(request);

        assertEquals(auth, response.getResult());
        verify(authService).refreshToken(request);
    }

    @Test
    void outboundAuthentication_shouldReturnAuthResponse() {
        ExchangeTokenRequest request = ExchangeTokenRequest.builder().token("abc").build();
        AuthenticationResponse auth = AuthenticationResponse.builder().authenticated(true).build();
        when(authService.outboundAuthentication(request)).thenReturn(auth);

        ApiResponse<AuthenticationResponse> response = authController.outboundAuthentication(request);

        assertEquals(auth, response.getResult());
        verify(authService).outboundAuthentication(request);
    }
}
