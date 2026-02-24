package iuh.fit.se.core.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

@Getter
public enum ErrorCode {
    UNCATEGORIZED_EXCEPTION(9999, "Uncategorized error", HttpStatus.INTERNAL_SERVER_ERROR),
    UNAUTHENTICATED(1000, "Unauthenticated", HttpStatus.UNAUTHORIZED),
    INVALID_KEY(1001, "Invalid message key", HttpStatus.BAD_REQUEST),

    DB_CONNECTION_FAILED(9901, "Database connection failed", HttpStatus.SERVICE_UNAVAILABLE),
    REDIS_CONNECTION_FAILED(9902, "Redis connection failed", HttpStatus.SERVICE_UNAVAILABLE),
    RABBITMQ_ERROR(9903, "Message Queue error", HttpStatus.SERVICE_UNAVAILABLE),
    EMAIL_SEND_FAILED(9904, "Failed to send email", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_FILE(9905, "Invalid file", HttpStatus.BAD_REQUEST),
    INVALID_REQUEST(9906, "Invalid request", HttpStatus.BAD_REQUEST),

    USER_EXISTED(1002, "User already exists", HttpStatus.BAD_REQUEST),
    USERNAME_INVALID(1003, "Username must be at least 3 characters", HttpStatus.BAD_REQUEST),
    INVALID_PASSWORD(1004, "Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one digit, and one special character", HttpStatus.BAD_REQUEST),
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
    TYPE_FILE_NOT_SUPPORTED(1022, "File type not supported || File is not a valid image", HttpStatus.BAD_REQUEST),
    FILE_NOT_NULL(1023, "File must not be null", HttpStatus.BAD_REQUEST),
    STORAGE_SERVICE_ERROR(1024, "Storage service error", HttpStatus.INTERNAL_SERVER_ERROR),
    CANNOT_ACCESS_ADMIN(1025, "Cannot access or ban Admin account", HttpStatus.FORBIDDEN),
    ACCESS_DENIED(1026, "Access denied", HttpStatus.FORBIDDEN),

    SUBSCRIPTION_PLAN_NOT_FOUND(2001, "Subscription plan not found", HttpStatus.NOT_FOUND),
    SUBSCRIPTION_PLAN_ALREADY_EXISTS(2002, "Subscription plan with this name already exists", HttpStatus.BAD_REQUEST),
    SUBSCRIPTION_PLAN_NOT_ACTIVE(2003, "Subscription plan is not active", HttpStatus.BAD_REQUEST),
    USER_SUBSCRIPTION_NOT_FOUND(2004, "User subscription not found", HttpStatus.NOT_FOUND),
    USER_ALREADY_HAS_ACTIVE_SUBSCRIPTION(2005, "User already has an active subscription", HttpStatus.BAD_REQUEST),
    PAYMENT_TRANSACTION_NOT_FOUND(2006, "Payment transaction not found", HttpStatus.NOT_FOUND),
    PAYMENT_PROCESSING_ERROR(2007, "Error processing payment", HttpStatus.INTERNAL_SERVER_ERROR),
    CANNOT_DELETE_PLAN_WITH_ACTIVE_SUBSCRIPTIONS(2008, "Cannot delete plan with active subscriptions", HttpStatus.BAD_REQUEST),
    SUBSCRIPTION_NOT_SUPPORTED(2009, "Subscription plan not supported", HttpStatus.BAD_REQUEST),
    FREE_SUBSCRIPTION_NOT_ALLOWED(2010, "Free subscription plan not allowed for this operation", HttpStatus.BAD_REQUEST),

    STAGE_NAME_REQUIRED(3001, "Stage name is required", HttpStatus.BAD_REQUEST),
    STAGE_NAME_INVALID_LENGTH(3002, "Stage name must be between 2 and 100 characters", HttpStatus.BAD_REQUEST),
    BIO_TOO_LONG(3003, "Bio must not exceed 1000 characters", HttpStatus.BAD_REQUEST),
    ARTIST_ALREADY_REGISTERED(3004, "Artist profile already registered for this user", HttpStatus.BAD_REQUEST),
    ARTIST_NOT_FOUND(3005, "Artist profile not found", HttpStatus.NOT_FOUND),
    ARTIST_STAGE_NAME_EXISTS(3006, "Artist stage name already exists", HttpStatus.BAD_REQUEST),
    ARTIST_RESTRICTED(3007, "Artist account is restricted or expired", HttpStatus.FORBIDDEN),

    GENRE_NAME_REQUIRED(4001, "Genre name is required", HttpStatus.BAD_REQUEST),
    GENRE_NAME_TOO_LONG(4002, "Genre name must not exceed 100 characters", HttpStatus.BAD_REQUEST),
    DESCRIPTION_TOO_LONG(4003, "Genre description must not exceed 500 characters", HttpStatus.BAD_REQUEST),
    GENRE_ALREADY_EXISTS(4004, "Genre with this name already exists", HttpStatus.BAD_REQUEST),
    GENRE_NOT_FOUND(4005, "Genre not found", HttpStatus.NOT_FOUND),

    TITLE_REQUIRED(5001, "Title is required", HttpStatus.BAD_REQUEST),
    TITLE_TOO_LONG(5002, "Title must not exceed 200 characters", HttpStatus.BAD_REQUEST),
    FILE_EXTENSION_REQUIRED(5003, "File extension is required", HttpStatus.BAD_REQUEST),
    GENRES_REQUIRED(5004, "At least one genre is required", HttpStatus.BAD_REQUEST),
    UPGRADE_REQUIRED(5005, "Upgrade required to access this feature", HttpStatus.UPGRADE_REQUIRED),

    PLAYLIST_LIMIT_EXCEEDED(6001, "Playlist limit exceeded", HttpStatus.FORBIDDEN),
    PLAYLIST_NAME_REQUIRED(6002, "Playlist name is required", HttpStatus.BAD_REQUEST),
    PLAYLIST_NAME_TOO_LONG(6003, "Playlist name must not exceed 200 characters", HttpStatus.BAD_REQUEST),
    PLAYLIST_DESCRIPTION_TOO_LONG(6004, "Playlist description must not exceed 500 characters", HttpStatus.BAD_REQUEST),

    SONG_NOT_READY(7001, "Song must be fully transcoded before adding to album", HttpStatus.BAD_REQUEST),
    SONG_ALREADY_IN_ALBUM(7002, "Song is already attached to another album", HttpStatus.BAD_REQUEST),
    ALBUM_NOT_FOUND(7003, "Album not found", HttpStatus.NOT_FOUND),
    ALBUM_UNAUTHORIZED(7004, "Only album owner can perform this action", HttpStatus.FORBIDDEN),
    ALBUM_SONG_ALREADY_EXISTS(7005, "Song already exists in this album", HttpStatus.BAD_REQUEST),
    ALBUM_SONG_NOT_FOUND(7006, "Song not found in this album", HttpStatus.NOT_FOUND),
    ALBUM_SUBMIT_FAILED(7007, "All songs must be fully transcoded before submitting", HttpStatus.BAD_REQUEST),
    ALBUM_INVALID_STATUS_TRANSITION(7008, "Invalid album status transition", HttpStatus.BAD_REQUEST),
    ALBUM_HAS_REJECTED_SONG(7009, "Album contains rejected songs — remove them before resubmitting", HttpStatus.BAD_REQUEST),
    ALBUM_SCHEDULE_INVALID_TIME(7010, "Scheduled publish time must be in the future", HttpStatus.BAD_REQUEST),
    ALBUM_SCHEDULE_NOT_FOUND(7011, "No scheduled publish time set for this album", HttpStatus.BAD_REQUEST),
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