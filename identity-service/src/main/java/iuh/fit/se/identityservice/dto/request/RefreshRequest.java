package iuh.fit.se.identityservice.dto.request;

import lombok.Data;

@Data
public class RefreshRequest {
    private String refreshToken;
}