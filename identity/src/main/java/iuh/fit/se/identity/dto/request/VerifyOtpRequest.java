package iuh.fit.se.identity.dto.request;

import lombok.Data;

@Data
public class VerifyOtpRequest {
    private String email;
    private String otp;
}
