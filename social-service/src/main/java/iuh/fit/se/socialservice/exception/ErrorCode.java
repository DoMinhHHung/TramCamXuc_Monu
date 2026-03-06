package iuh.fit.se.socialservice.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

@Getter
public enum ErrorCode {
    UNCATEGORIZED_EXCEPTION(9999, "Uncategorized error",        HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_REQUEST        (9998, "Invalid request",            HttpStatus.BAD_REQUEST),
    UNAUTHENTICATED        (9997, "Unauthenticated",            HttpStatus.UNAUTHORIZED),
    ACCESS_DENIED          (9996, "Access denied",              HttpStatus.FORBIDDEN),
    EDIT_WINDOW_EXPIRED    (9995, "Edit window expired (15 min)",HttpStatus.FORBIDDEN),

    // Follow
    ALREADY_FOLLOWING      (4001, "Already following this artist",HttpStatus.CONFLICT),
    NOT_FOLLOWING          (4002, "Not following this artist",   HttpStatus.BAD_REQUEST),

    // Heart / Reaction
    ALREADY_HEARTED        (4011, "Already hearted this song",  HttpStatus.CONFLICT),
    NOT_HEARTED            (4012, "Not hearted this song",      HttpStatus.BAD_REQUEST),
    REACTION_NOT_FOUND     (4021, "Reaction not found",         HttpStatus.NOT_FOUND),

    // Comment
    COMMENT_NOT_FOUND      (4031, "Comment not found",          HttpStatus.NOT_FOUND),
    COMMENT_LIKE_CONFLICT  (4032, "Already liked this comment", HttpStatus.CONFLICT),

    // Listen History
    LISTEN_HISTORY_NOT_FOUND(4041, "Listen history not found",  HttpStatus.NOT_FOUND);

    private final int code;
    private final String message;
    private final HttpStatusCode statusCode;

    ErrorCode(int code, String message, HttpStatusCode statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }
}
