package iuh.fit.se.musicservice.repository;

import lombok.Data;

@Data
public class SoundCloudTrackResult {
    private String id;
    private String title;
    private String artistUsername;
    private String artistId;
    private String artistPermalink;
    private String artistAvatarUrl;
    private String thumbnailUrl;
    private String permalink;
    private String streamUrl;
    private String waveformUrl;
    private String genre;
    private int durationSeconds;
    private long playbackCount;
}