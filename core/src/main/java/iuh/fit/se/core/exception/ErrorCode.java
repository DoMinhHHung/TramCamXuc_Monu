package iuh.fit.se.core.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

@Getter
public enum ErrorCode {
    UNCATEGORIZED_EXCEPTION(9999, "Uncategorized error", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_KEY(1001, "Invalid message key", HttpStatus.BAD_REQUEST),

    DB_CONNECTION_FAILED(9901, "Database connection failed", HttpStatus.SERVICE_UNAVAILABLE),
    REDIS_CONNECTION_FAILED(9902, "Redis connection failed", HttpStatus.SERVICE_UNAVAILABLE),
    RABBITMQ_ERROR(9903, "Message Queue error", HttpStatus.SERVICE_UNAVAILABLE),

    USER_EXISTED(1002, "User already exists", HttpStatus.BAD_REQUEST),
    USERNAME_INVALID(1003, "Username must be at least 3 characters", HttpStatus.BAD_REQUEST),
    INVALID_PASSWORD(1004, "Password must be at least 8 characters", HttpStatus.BAD_REQUEST),
    USER_NOT_EXISTED(1005, "User not existed", HttpStatus.NOT_FOUND),
    EMAIL_INVALID_FORMAT(1006, "Email invalid format", HttpStatus.BAD_REQUEST),
    EMAIL_NOT_BLANK(1007, "Email must not be blank", HttpStatus.BAD_REQUEST)
    ;

    private final int code;
    private final String message;
    private final HttpStatusCode statusCode;

    ErrorCode(int code, String message, HttpStatusCode statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }
}