// music-service/src/main/java/iuh/fit/se/musicservice/service/impl/SoundCloudService.java

package iuh.fit.se.musicservice.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.se.musicservice.entity.Artist;
import iuh.fit.se.musicservice.entity.Genre;
import iuh.fit.se.musicservice.entity.Song;
import iuh.fit.se.musicservice.enums.ArtistStatus;
import iuh.fit.se.musicservice.enums.SongStatus;
import iuh.fit.se.musicservice.enums.SourceType;
import iuh.fit.se.musicservice.enums.TranscodeStatus;
import iuh.fit.se.musicservice.repository.ArtistRepository;
import iuh.fit.se.musicservice.repository.GenreRepository;
import iuh.fit.se.musicservice.repository.SongRepository;
import iuh.fit.se.musicservice.repository.SoundCloudTrackResult;
import iuh.fit.se.musicservice.util.SlugUtils;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class SoundCloudService {

    private final RestTemplate restTemplate;
    private final SongRepository songRepository;
    private final ArtistRepository artistRepository;
    private final GenreRepository genreRepository;
    private final ObjectMapper objectMapper;

    @Value("${soundcloud.client-id}")
    private String clientId;

    private static final String SC_API = "https://api.soundcloud.com";
    private static final UUID SC_SYSTEM_USER = UUID.fromString("00000000-0000-0000-0000-000000000002");

    // ── Search ────────────────────────────────────────────────────────────────

    public List<SoundCloudTrackResult> searchTracks(String query, int limit) {
        try {
            String url = String.format(
                    "%s/tracks?q=%s&client_id=%s&limit=%d&linked_partitioning=1",
                    SC_API,
                    java.net.URLEncoder.encode(query, "UTF-8"),
                    clientId,
                    Math.min(limit, 50)
            );

            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            return parseSearchResults(response.getBody());
        } catch (Exception e) {
            log.error("[SoundCloud] Search failed for query '{}': {}", query, e.getMessage());
            return Collections.emptyList();
        }
    }

    @SuppressWarnings("unchecked")
    private List<SoundCloudTrackResult> parseSearchResults(Map<String, Object> body) {
        if (body == null) return Collections.emptyList();

        // SoundCloud API trả về collection hoặc trực tiếp list
        Object collection = body.get("collection");
        List<Map<String, Object>> items;
        if (collection instanceof List) {
            items = (List<Map<String, Object>>) collection;
        } else {
            return Collections.emptyList();
        }

        List<SoundCloudTrackResult> results = new ArrayList<>();
        for (Map<String, Object> item : items) {
            try {
                // Chỉ lấy track có thể stream (streamable = true)
                if (!Boolean.TRUE.equals(item.get("streamable"))) continue;

                SoundCloudTrackResult track = new SoundCloudTrackResult();
                track.setId(String.valueOf(item.get("id")));
                track.setTitle((String) item.get("title"));
                track.setPermalink((String) item.get("permalink_url")); // Attribution link

                Object duration = item.get("duration");
                if (duration instanceof Number n) {
                    track.setDurationSeconds(n.intValue() / 1000);
                }

                // Artwork
                String artworkUrl = (String) item.get("artwork_url");
                if (artworkUrl != null) {
                    // Upgrade to higher resolution: t500x500 thay vì large (100x100)
                    artworkUrl = artworkUrl.replace("-large.", "-t500x500.");
                }
                track.setThumbnailUrl(artworkUrl);

                track.setWaveformUrl((String) item.get("waveform_url"));

                // Stream URL — append client_id khi dùng
                String streamUrl = (String) item.get("stream_url");
                if (streamUrl == null) {
                    // API v2 format
                    streamUrl = SC_API + "/tracks/" + track.getId() + "/stream";
                }
                track.setStreamUrl(streamUrl + "?client_id=" + clientId);

                // User / Artist
                Map<String, Object> user = (Map<String, Object>) item.get("user");
                if (user != null) {
                    track.setArtistUsername((String) user.get("username"));
                    track.setArtistPermalink((String) user.get("permalink_url"));
                    String avatarUrl = (String) user.get("avatar_url");
                    if (avatarUrl != null) {
                        avatarUrl = avatarUrl.replace("-large.", "-t200x200.");
                    }
                    track.setArtistAvatarUrl(avatarUrl);
                    track.setArtistId(String.valueOf(user.get("id")));
                }

                // Genre
                track.setGenre((String) item.get("genre"));
                track.setPlaybackCount(item.get("playback_count") instanceof Number n ?
                        n.longValue() : 0L);

                results.add(track);
            } catch (Exception e) {
                log.warn("[SoundCloud] Failed to parse track: {}", e.getMessage());
            }
        }
        return results;
    }

    // ── Save to DB (để thêm vào playlist) ───────────────────────────────────

    public Song saveOrGetSoundCloudTrack(String soundcloudId, SoundCloudTrackResult trackData) {
        // Kiểm tra đã tồn tại chưa
        return songRepository.findBySoundcloudId(soundcloudId)
                .orElseGet(() -> {
                    Artist artist = upsertArtist(trackData);
                    Genre genre = resolveGenre(trackData.getGenre());

                    UUID songId = UUID.randomUUID();
                    Song song = Song.builder()
                            .id(songId)
                            .title(trackData.getTitle())
                            .slug(SlugUtils.generate(trackData.getTitle(), songId))
                            .ownerUserId(SC_SYSTEM_USER)
                            .primaryArtistId(artist.getId())
                            .primaryArtistStageName(artist.getStageName())
                            .primaryArtistAvatarUrl(artist.getAvatarUrl())
                            .thumbnailUrl(trackData.getThumbnailUrl())
                            .durationSeconds(trackData.getDurationSeconds())
                            .genres(genre != null ? Set.of(genre) : Collections.emptySet())
                            .status(SongStatus.PUBLIC)
                            .transcodeStatus(TranscodeStatus.COMPLETED)
                            .playCount(trackData.getPlaybackCount())
                            .sourceType(SourceType.SOUNDCLOUD)
                            .soundcloudId(soundcloudId)
                            .soundcloudPermalink(trackData.getPermalink())
                            .soundcloudWaveformUrl(trackData.getWaveformUrl())
                            .soundcloudUsername(trackData.getArtistUsername())
                            .build();

                    log.info("[SoundCloud] Saved new track: id={} title='{}'", soundcloudId, trackData.getTitle());
                    return songRepository.save(song);
                });
    }

    // ── Stream URL ───────────────────────────────────────────────────────────

    /**
     * Trả về stream URL hợp lệ để mobile player dùng.
     * SoundCloud Terms: chỉ dùng để stream, không download.
     */
    public String getStreamUrl(String soundcloudId) {
        // Nếu đã có trong DB, lấy từ cache (không cần gọi SC API lại)
        // Stream URL được rebuild với client_id mới mỗi lần để tránh expire
        return SC_API + "/tracks/" + soundcloudId + "/stream?client_id=" + clientId;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Artist upsertArtist(SoundCloudTrackResult track) {
        String stageName = track.getArtistUsername() != null ?
                track.getArtistUsername().trim() : "Unknown Artist";

        return artistRepository.findByStageNameIgnoreCase(stageName)
                .orElseGet(() -> {
                    UUID artistId = UUID.nameUUIDFromBytes(
                            ("soundcloud-artist:" + track.getArtistId())
                                    .getBytes(StandardCharsets.UTF_8)
                    );
                    Artist newArtist = Artist.builder()
                            .id(artistId)
                            .stageName(stageName)
                            .avatarUrl(track.getArtistAvatarUrl())
                            .isJamendo(false)
                            .userId(null)  // External artist
                            .status(ArtistStatus.ACTIVE)
                            .build();
                    return artistRepository.save(newArtist);
                });
    }

    private Genre resolveGenre(String genreTag) {
        if (genreTag == null || genreTag.isBlank()) return null;
        // Map genre tag thô về canonical genre (tương tự Jamendo worker)
        String canonical = mapToCanonical(genreTag.toLowerCase().trim());
        if (canonical == null) return null;
        String finalCanonical = canonical;
        return genreRepository.findByNameIgnoreCase(canonical)
                .orElseGet(() -> genreRepository.save(
                        Genre.builder().name(finalCanonical).description("From SoundCloud").build()
                ));
    }

    private static final Map<String, String> GENRE_MAP = Map.ofEntries(
            Map.entry("pop", "Pop"), Map.entry("rock", "Rock"),
            Map.entry("hip-hop", "Hip-Hop"), Map.entry("hiphop", "Hip-Hop"),
            Map.entry("electronic", "Electronic"), Map.entry("edm", "Electronic"),
            Map.entry("jazz", "Jazz"), Map.entry("classical", "Classical"),
            Map.entry("r&b", "R&B"), Map.entry("rnb", "R&B"),
            Map.entry("ambient", "Ambient"), Map.entry("lofi", "Lo-fi"),
            Map.entry("folk", "Folk"), Map.entry("country", "Country"),
            Map.entry("reggae", "Reggae"), Map.entry("metal", "Metal"),
            Map.entry("dance", "Dance"), Map.entry("house", "House"),
            Map.entry("indie", "Rock"), Map.entry("alternative", "Rock")
    );

    private String mapToCanonical(String tag) {
        return GENRE_MAP.entrySet().stream()
                .filter(e -> tag.contains(e.getKey()))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElse(null);
    }

}