package iuh.fit.se.musicservice.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

@Getter
public enum ErrorCode {
    UNCATEGORIZED_EXCEPTION(9999, "Uncategorized error", HttpStatus.INTERNAL_SERVER_ERROR),
    UNAUTHENTICATED(1000, "Unauthenticated", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED(9900, "Unauthorized access", HttpStatus.FORBIDDEN),
    INVALID_REQUEST(9901, "Invalid request", HttpStatus.BAD_REQUEST),

    ARTIST_NOT_FOUND(2001, "Artist not found", HttpStatus.NOT_FOUND),
    ARTIST_ALREADY_REGISTERED(2002, "Artist already registered", HttpStatus.BAD_REQUEST),
    ARTIST_STAGE_NAME_EXISTS(2003, "Stage name already taken", HttpStatus.CONFLICT),
    ARTIST_RESTRICTED(2004, "Artist account is restricted", HttpStatus.FORBIDDEN),
    INVALID_FILE(2005, "Invalid file", HttpStatus.BAD_REQUEST),

    SONG_NOT_FOUND(3001, "Song not found", HttpStatus.NOT_FOUND),
    SONG_NOT_READY(3002, "Song is not ready yet (still transcoding)", HttpStatus.BAD_REQUEST),
    SONG_UNAUTHORIZED_ACCESS(3003, "You don't have permission to access this song", HttpStatus.FORBIDDEN),
    SONG_NOT_AVAILABLE_FOR_PLAYLIST(3004, "Song is not available", HttpStatus.BAD_REQUEST),

    ALBUM_NOT_FOUND(4001, "Album not found", HttpStatus.NOT_FOUND),
    ALBUM_UNAUTHORIZED(4002, "You don't own this album", HttpStatus.FORBIDDEN),
    ALBUM_INVALID_STATUS(4003, "Invalid album status transition", HttpStatus.BAD_REQUEST),
    ALBUM_SUBMIT_FAILED(4004, "Album must have at least one transcoded song", HttpStatus.BAD_REQUEST),
    ALBUM_SONG_ALREADY_EXISTS(4005, "Song already in this album", HttpStatus.CONFLICT),
    ALBUM_SONG_NOT_FOUND(4006, "Album song not found", HttpStatus.NOT_FOUND),
    ALBUM_SCHEDULE_INVALID_TIME(4007, "Scheduled time must be in the future", HttpStatus.BAD_REQUEST),
    ALBUM_SCHEDULE_NOT_FOUND(4008, "No schedule found for this album", HttpStatus.BAD_REQUEST),
    SONG_ALREADY_IN_ALBUM(4009, "Song is already in another album", HttpStatus.CONFLICT),

    PLAYLIST_LIMIT_EXCEEDED(5001, "Playlist limit exceeded for your plan", HttpStatus.FORBIDDEN),

    SUBSCRIPTION_NOT_SUPPORTED(6001, "Your subscription does not support this feature", HttpStatus.FORBIDDEN),
    FREE_SUBSCRIPTION_NOT_ALLOWED(6002, "Upgrade your plan to access this feature", HttpStatus.FORBIDDEN),
    UPGRADE_REQUIRED(6003, "Upgrade required", HttpStatus.PAYMENT_REQUIRED);

    private final int code;
    private final String message;
    private final HttpStatusCode statusCode;

    ErrorCode(int code, String message, HttpStatusCode statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }
}