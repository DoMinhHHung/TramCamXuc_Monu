package iuh.fit.se.adsservice.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

@Getter
public enum ErrorCode {
    UNCATEGORIZED_EXCEPTION(9999, "Uncategorized error",            HttpStatus.INTERNAL_SERVER_ERROR),
    UNAUTHENTICATED        (9997, "Unauthenticated",                HttpStatus.UNAUTHORIZED),
    ACCESS_DENIED          (9996, "Access denied",                  HttpStatus.FORBIDDEN),
    INVALID_REQUEST        (9995, "Invalid request",                HttpStatus.BAD_REQUEST),

    // Ad errors
    AD_NOT_FOUND           (5001, "Ad not found",                   HttpStatus.NOT_FOUND),
    AD_FILE_REQUIRED       (5002, "Audio file is required",         HttpStatus.BAD_REQUEST),
    AD_FILE_NOT_MP3        (5003, "Only MP3 files are supported",   HttpStatus.BAD_REQUEST),
    AD_NOT_ACTIVE          (5004, "Ad is not active",               HttpStatus.BAD_REQUEST),
    AD_CLICK_SPAM          (5005, "Too many clicks, slow down",     HttpStatus.TOO_MANY_REQUESTS),
    AD_BUDGET_EXCEEDED     (5006, "Ad budget has been exceeded",    HttpStatus.BAD_REQUEST),
    MINIO_UPLOAD_FAILED    (5007, "Failed to upload audio file",    HttpStatus.INTERNAL_SERVER_ERROR);

    private final int code;
    private final String message;
    private final HttpStatusCode statusCode;

    ErrorCode(int code, String message, HttpStatusCode statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }
}
