package iuh.fit.se.recommendationservice.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    UNCATEGORIZED_EXCEPTION(9999, "Uncategorized error", HttpStatus.INTERNAL_SERVER_ERROR),
    UNAUTHENTICATED(1006, "Unauthenticated", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED(1007, "You do not have permission", HttpStatus.FORBIDDEN),
    USER_NOT_FOUND(1008, "User not found", HttpStatus.NOT_FOUND),
    SONG_NOT_FOUND(1009, "Song not found", HttpStatus.NOT_FOUND),
    EXTERNAL_SERVICE_ERROR(1010, "External service error", HttpStatus.SERVICE_UNAVAILABLE),
    ;

    ErrorCode(int code, String message, HttpStatus status) {
        this.code = code;
        this.message = message;
        this.httpStatus = status;
    }

    private final int code;
    private final String message;
    private final HttpStatus httpStatus;
}