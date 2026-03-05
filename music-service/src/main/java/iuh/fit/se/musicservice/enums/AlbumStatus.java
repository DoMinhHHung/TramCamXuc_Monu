package iuh.fit.se.musicservice.enums;

/**
 * Represents the operational lifecycle of an album.
 * No approval statuses - albums go directly to ACTIVE once published.
 */
public enum AlbumStatus {
    /**
     * Album is in draft mode, not visible publicly
     */
    DRAFT,
    
    /**
     * Album is publicly visible
     */
    PUBLIC,
    
    /**
     * Album is private (only owner can see)
     */
    PRIVATE,
    
    /**
     * Album was soft-deleted (reported/banned by admin)
     */
    DELETED
}