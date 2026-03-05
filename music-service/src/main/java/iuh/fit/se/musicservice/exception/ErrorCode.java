package iuh.fit.se.musicservice.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

@Getter
public enum ErrorCode {
    // ── Generic ────────────────────────────────────────────────────────────────
    UNCATEGORIZED_EXCEPTION(9999, "Uncategorized error",          HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_REQUEST        (9998, "Invalid request",              HttpStatus.BAD_REQUEST),
    UNAUTHENTICATED        (9997, "Unauthenticated",              HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED           (9996, "Unauthorized access",          HttpStatus.FORBIDDEN),
    UPGRADE_REQUIRED       (9995, "Upgrade subscription required",HttpStatus.PAYMENT_REQUIRED),

    // ── Song ───────────────────────────────────────────────────────────────────
    SONG_NOT_FOUND              (2001, "Song not found",                           HttpStatus.NOT_FOUND),
    SONG_NOT_READY              (2002, "Song is not ready yet (transcoding)",       HttpStatus.CONFLICT),
    SONG_ALREADY_DELETED        (2003, "Song has already been deleted",             HttpStatus.GONE),
    SONG_UNAUTHORIZED_ACCESS    (2004, "You do not have access to this song",       HttpStatus.FORBIDDEN),
    SONG_NOT_AVAILABLE          (2005, "Song is not publicly available",            HttpStatus.GONE),
    SONG_TRANSCODE_FAILED       (2006, "Transcoding failed for this song",          HttpStatus.INTERNAL_SERVER_ERROR),
    SONG_INVALID_STATUS         (2007, "Invalid song status transition",            HttpStatus.CONFLICT),
    TITLE_REQUIRED              (2008, "Title must not be blank",                   HttpStatus.BAD_REQUEST),
    TITLE_TOO_LONG              (2009, "Title exceeds maximum length",              HttpStatus.BAD_REQUEST),
    GENRES_REQUIRED             (2010, "At least one genre is required",            HttpStatus.BAD_REQUEST),
    INVALID_FILE_EXTENSION      (2011, "Unsupported file extension",                HttpStatus.BAD_REQUEST),

    // ── Genre ──────────────────────────────────────────────────────────────────
    GENRE_NOT_FOUND        (2100, "Genre not found",                               HttpStatus.NOT_FOUND),
    GENRE_ALREADY_EXISTS   (2101, "Genre with this name already exists",            HttpStatus.CONFLICT),
    GENRE_NAME_REQUIRED    (2102, "Genre name must not be blank",                   HttpStatus.BAD_REQUEST),
    GENRE_IN_USE           (2103, "Genre is still used by one or more songs",       HttpStatus.CONFLICT),

    // ── Report ─────────────────────────────────────────────────────────────────
    REPORT_NOT_FOUND       (2200, "Report not found",                               HttpStatus.NOT_FOUND),
    REPORT_ALREADY_SENT    (2201, "You have already reported this song",             HttpStatus.CONFLICT),
    REPORT_ALREADY_HANDLED (2202, "This report has already been handled",            HttpStatus.CONFLICT),

    // ── Artist ─────────────────────────────────────────────────────────────────
    ARTIST_NOT_FOUND       (2300, "Artist profile not found",                       HttpStatus.NOT_FOUND),
    ARTIST_RESTRICTED      (2301, "Artist account is restricted",                   HttpStatus.FORBIDDEN);

    private final int code;
    private final String message;
    private final HttpStatusCode statusCode;

    ErrorCode(int code, String message, HttpStatusCode statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }
}