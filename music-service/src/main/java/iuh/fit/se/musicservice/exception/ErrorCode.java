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
    LYRIC_NOT_FOUND             (2012, "Lyric not found for this song",             HttpStatus.NOT_FOUND),
    LYRIC_INVALID_FILE          (2013, "Invalid lyric file (only .lrc, .srt, .txt allowed)", HttpStatus.BAD_REQUEST),

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
    ARTIST_NOT_FOUND             (2300, "Artist profile not found",                       HttpStatus.NOT_FOUND),
    ARTIST_RESTRICTED            (2301, "Artist account is restricted",                   HttpStatus.FORBIDDEN),
    ARTIST_ALREADY_REGISTERED    (2302, "You already have an artist profile",              HttpStatus.CONFLICT),
    ARTIST_STAGE_NAME_EXISTS     (2303, "Stage name is already taken",                    HttpStatus.CONFLICT),
    SUBSCRIPTION_NOT_SUPPORTED   (2304, "Your subscription does not allow artist registration", HttpStatus.PAYMENT_REQUIRED),

    // ── Album ──────────────────────────────────────────────────────────────────
    ALBUM_NOT_FOUND              (2400, "Album not found",                                HttpStatus.NOT_FOUND),
    ALBUM_UNAUTHORIZED           (2401, "You do not own this album",                      HttpStatus.FORBIDDEN),
    ALBUM_INVALID_STATUS         (2402, "Invalid album status transition",                HttpStatus.CONFLICT),
    ALBUM_SONG_NOT_FOUND         (2403, "Song not found in this album",                   HttpStatus.NOT_FOUND),
    ALBUM_SONG_ALREADY_EXISTS    (2404, "Song is already in this album",                  HttpStatus.CONFLICT),
    SONG_ALREADY_IN_ALBUM        (2405, "Song already belongs to another album",          HttpStatus.CONFLICT),
    ALBUM_EMPTY                  (2406, "Album must have at least one song",              HttpStatus.CONFLICT),
    ALBUM_HAS_UNREADY_SONGS      (2407, "Album has songs that are not ready yet",         HttpStatus.CONFLICT),
    ALBUM_SCHEDULE_INVALID_TIME  (2408, "Scheduled time must be in the future",           HttpStatus.BAD_REQUEST),
    ALBUM_SCHEDULE_NOT_FOUND     (2409, "No scheduled publish time set for this album",   HttpStatus.NOT_FOUND),
    ALBUM_SCHEDULE_EDIT_COOLDOWN (2410, "You can change the release schedule only 6 hours after the last confirmation", HttpStatus.CONFLICT),
    ALBUM_PENDING_PUBLISH_LOCKED (2411, "Cannot modify album tracks while a release is scheduled", HttpStatus.CONFLICT),

    // ── Playlist ────────────────────────────────────────────────────────────
    PLAYLIST_NOT_FOUND               (2500, "Playlist not found",                                    HttpStatus.NOT_FOUND),
    PLAYLIST_UNAUTHORIZED            (2501, "You do not own this playlist",                          HttpStatus.FORBIDDEN),
    PLAYLIST_LIMIT_EXCEEDED          (2502, "Playlist limit reached — upgrade your subscription",    HttpStatus.PAYMENT_REQUIRED),
    PLAYLIST_SONG_NOT_FOUND          (2503, "Song not found in this playlist",                       HttpStatus.NOT_FOUND),
    PLAYLIST_SONG_ALREADY_EXISTS     (2504, "Song is already in this playlist",                      HttpStatus.CONFLICT),
    SONG_NOT_AVAILABLE_FOR_PLAYLIST  (2505, "Song is not available to add to playlist",              HttpStatus.BAD_REQUEST),

    // ── Subscription ────────────────────────────────────────────────────────
    FREE_SUBSCRIPTION_NOT_ALLOWED    (2600, "This feature requires a paid subscription",             HttpStatus.PAYMENT_REQUIRED);

    private final int code;
    private final String message;
    private final HttpStatusCode statusCode;

    ErrorCode(int code, String message, HttpStatusCode statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }
}
