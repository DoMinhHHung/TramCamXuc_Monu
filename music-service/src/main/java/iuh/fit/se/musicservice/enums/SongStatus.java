package iuh.fit.se.musicservice.enums;

/**
 * Represents the operational lifecycle of a song.
 * No approval statuses - songs go directly to ACTIVE after transcoding.
 */
public enum SongStatus {
    /**
     * Song is being processed (transcoding in progress)
     */
    PROCESSING,
    
    /**
     * Song is active and available for playback
     */
    ACTIVE,
    
    /**
     * Song transcoding/processing failed
     */
    FAILED,
    
    /**
     * Song was soft-deleted (reported/banned by admin)
     */
    DELETED
}