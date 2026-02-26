package iuh.fit.se.identityservice.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

@Getter
public enum ErrorCode {
    UNCATEGORIZED_EXCEPTION(9999, "Uncategorized error", HttpStatus.INTERNAL_SERVER_ERROR),
    UNAUTHENTICATED(1000, "Unauthenticated", HttpStatus.UNAUTHORIZED),
    INVALID_KEY(1001, "Invalid message key", HttpStatus.BAD_REQUEST),
    UNAUTHORIZED(9900, "Unauthorized access", HttpStatus.FORBIDDEN),
    DB_CONNECTION_FAILED(9901, "Database connection failed", HttpStatus.SERVICE_UNAVAILABLE),
    REDIS_CONNECTION_FAILED(9902, "Redis connection failed", HttpStatus.SERVICE_UNAVAILABLE),
    EMAIL_SEND_FAILED(9904, "Failed to send email", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_FILE(9905, "Invalid file", HttpStatus.BAD_REQUEST),
    INVALID_REQUEST(9906, "Invalid request", HttpStatus.BAD_REQUEST),

    USER_EXISTED(1002, "User already exists", HttpStatus.BAD_REQUEST),
    INVALID_PASSWORD(1004, "Password must be at least 8 characters and contain uppercase, lowercase, digit, and special character", HttpStatus.BAD_REQUEST),
    USER_NOT_EXISTED(1005, "User not existed", HttpStatus.NOT_FOUND),
    EMAIL_INVALID_FORMAT(1006, "Email invalid format", HttpStatus.BAD_REQUEST),
    EMAIL_NOT_BLANK(1007, "Email must not be blank", HttpStatus.BAD_REQUEST),
    DOB_REQUIRED(1008, "Date of birth is required", HttpStatus.BAD_REQUEST),
    DOB_MUST_BE_IN_PAST(1009, "Date of birth must be in the past", HttpStatus.BAD_REQUEST),
    AGE_TOO_YOUNG(1010, "User must be at least 13 years old", HttpStatus.BAD_REQUEST),
    OTP_EXPIRED(1011, "OTP has expired", HttpStatus.BAD_REQUEST),
    OTP_INVALID(1012, "Invalid OTP", HttpStatus.BAD_REQUEST),
    ACCOUNT_ALREADY_VERIFIED(1013, "Account already verified", HttpStatus.BAD_REQUEST),
    LOGIN_FAILED(1014, "Login failed: invalid credentials", HttpStatus.UNAUTHORIZED),
    ACCOUNT_LOCKED(1015, "Account is locked", HttpStatus.FORBIDDEN),
    INVALID_REFRESH_TOKEN(1016, "Invalid refresh token", HttpStatus.UNAUTHORIZED),
    REFRESH_TOKEN_EXPIRED(1017, "Refresh token has expired", HttpStatus.UNAUTHORIZED),
    FULLNAME_NOT_BLANK(1018, "Full name must not be blank", HttpStatus.BAD_REQUEST),
    INVALID_SOCIAL_TOKEN(1019, "Invalid social token", HttpStatus.UNAUTHORIZED),
    EMAIL_IS_REQUIRED(1020, "Email is required from social provider", HttpStatus.BAD_REQUEST),
    INVALID_TOKEN(1021, "Invalid token", HttpStatus.UNAUTHORIZED),
    TYPE_FILE_NOT_SUPPORTED(1022, "File type not supported", HttpStatus.BAD_REQUEST),
    FILE_NOT_NULL(1023, "File must not be null", HttpStatus.BAD_REQUEST),
    STORAGE_SERVICE_ERROR(1024, "Storage service error", HttpStatus.INTERNAL_SERVER_ERROR),
    CANNOT_ACCESS_ADMIN(1025, "Cannot access or ban Admin account", HttpStatus.FORBIDDEN),
    ACCESS_DENIED(1026, "Access denied", HttpStatus.FORBIDDEN);

    private final int code;
    private final String message;
    private final HttpStatusCode statusCode;

    ErrorCode(int code, String message, HttpStatusCode statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }
}