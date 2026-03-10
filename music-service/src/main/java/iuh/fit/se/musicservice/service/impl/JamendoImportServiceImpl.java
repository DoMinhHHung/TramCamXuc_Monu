package iuh.fit.se.musicservice.service.impl;

import iuh.fit.se.musicservice.config.RabbitMQConfig;
import iuh.fit.se.musicservice.dto.jamendo.JamendoApiResponse;
import iuh.fit.se.musicservice.dto.jamendo.JamendoDownloadMessage;
import iuh.fit.se.musicservice.dto.jamendo.JamendoTrackDto;
import iuh.fit.se.musicservice.repository.SongRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Async Jamendo import publisher.
 *
 * <h2>Architecture role</h2>
 * <pre>
 *   HTTP Request
 *       │
 *       ▼
 *   JamendoImportServiceImpl          ← this class (runs in Tomcat thread)
 *       │  1. Fetch metadata from Jamendo REST API
 *       │  2. Batch-check existing Jamendo IDs in DB
 *       │  3. Publish NEW tracks to jamendo.exchange
 *       │  4. Return immediately (HTTP 200)
 *       ▼
 *   jamendo.download.queue
 *       │
 *       ▼
 *   JamendoDownloadWorker              ← downloads MP3, saves to MinIO, triggers transcode
 * </pre>
 *
 * <h2>Idempotency</h2>
 * <p>Batch-checking existing IDs with a single IN query prevents re-publishing
 * messages for tracks already in the database.  The worker performs a second
 * check before saving as a last-line defence against race conditions during
 * concurrent imports.</p>
 *
 * <h2>Pagination</h2>
 * <p>Jamendo's API is paginated (max 200 tracks per call).  This service
 * fetches all pages in a loop and publishes all new tracks as individual
 * messages, allowing the worker pool to process them in parallel.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class JamendoImportServiceImpl {

    private final RestTemplate    restTemplate;
    private final RabbitTemplate  rabbitTemplate;
    private final SongRepository  songRepository;

    @Value("${jamendo.client-id}")
    private String clientId;

    /** Maximum number of tracks per Jamendo API page (API hard limit = 200). */
    private static final int PAGE_SIZE = 100;

    /** Maximum pages to fetch in a single import run to prevent infinite loops. */
    private static final int MAX_PAGES = 20;

    private static final String JAMENDO_TRACKS_URL =
            "https://api.jamendo.com/v3.0/tracks/";

    // ──────────────────────────────────────────────────────────────────────────
    // PUBLIC API
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Trigger a full Jamendo import run for a given tag/genre query.
     *
     * <p>This method returns immediately after publishing messages; actual
     * MP3 download and transcoding happen asynchronously in the worker.</p>
     *
     * @param tags   Jamendo tag filter, e.g. {@code "pop"}, {@code "rock"}.
     *               Pass {@code null} or empty to fetch all popular tracks.
     * @param limit  Maximum number of NEW tracks to enqueue in this run.
     *               Useful for controlled rollouts. Pass {@code Integer.MAX_VALUE}
     *               to enqueue everything.
     * @return Summary map with {@code fetched}, {@code skipped}, {@code enqueued} counts.
     */
    public Map<String, Integer> importTracks(String tags, int limit) {
        log.info("Starting Jamendo import: tags='{}', limit={}", tags, limit);

        List<JamendoTrackDto> allTracks = fetchAllPages(tags, limit);
        log.info("Fetched {} tracks from Jamendo API", allTracks.size());

        if (allTracks.isEmpty()) {
            return Map.of("fetched", 0, "skipped", 0, "enqueued", 0);
        }

        // ── Batch-check existing IDs ───────────────────────────────────────────
        List<String> fetchedIds = allTracks.stream()
                .map(JamendoTrackDto::getId)
                .collect(Collectors.toList());

        List<String> existingIds = songRepository.findExistingJamendoIds(fetchedIds);
        int skipped = existingIds.size();
        log.info("Skipping {} tracks already in DB", skipped);

        // ── Filter to only new tracks ──────────────────────────────────────────
        List<JamendoTrackDto> newTracks = allTracks.stream()
                .filter(t -> !existingIds.contains(t.getId()))
                .collect(Collectors.toList());

        // ── Publish each new track as an individual message ────────────────────
        int enqueued = 0;
        for (JamendoTrackDto track : newTracks) {
            try {
                JamendoDownloadMessage msg = toDownloadMessage(track);
                rabbitTemplate.convertAndSend(
                        RabbitMQConfig.JAMENDO_EXCHANGE,
                        RabbitMQConfig.JAMENDO_DOWNLOAD_ROUTING_KEY,
                        msg
                );
                enqueued++;
                log.debug("Enqueued download job for Jamendo track id={} title='{}'",
                        track.getId(), track.getName());
            } catch (Exception e) {
                // Log and continue — don't let one bad message abort the whole batch
                log.error("Failed to enqueue download job for track id={}: {}",
                        track.getId(), e.getMessage());
            }
        }

        log.info("Jamendo import complete: fetched={}, skipped={}, enqueued={}",
                allTracks.size(), skipped, enqueued);

        return Map.of(
                "fetched",  allTracks.size(),
                "skipped",  skipped,
                "enqueued", enqueued
        );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PRIVATE — Jamendo API pagination
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Fetches all pages from the Jamendo API until either:
     * <ul>
     *   <li>The API returns an empty page (no more results)</li>
     *   <li>We've collected {@code limit} tracks</li>
     *   <li>We've fetched {@link #MAX_PAGES} pages (safety cap)</li>
     * </ul>
     */
    private List<JamendoTrackDto> fetchAllPages(String tags, int limit) {
        List<JamendoTrackDto> allTracks = new ArrayList<>();
        int offset = 0;
        int page   = 0;

        while (page < MAX_PAGES && allTracks.size() < limit) {
            int pageSize = Math.min(PAGE_SIZE, limit - allTracks.size());

            List<JamendoTrackDto> pageTracks = fetchPage(tags, pageSize, offset);
            if (pageTracks.isEmpty()) {
                break;  // Reached the end of available results
            }

            allTracks.addAll(pageTracks);
            offset += pageTracks.size();
            page++;

            log.debug("Fetched page {}: {} tracks (total so far: {})",
                    page, pageTracks.size(), allTracks.size());

            // If the page came back smaller than requested, we've hit the last page
            if (pageTracks.size() < pageSize) {
                break;
            }
        }

        return allTracks;
    }

    /**
     * Fetches a single page of tracks from the Jamendo API.
     *
     * <p>API parameters:
     * <ul>
     *   <li>{@code include=musicinfo}  — adds the nested tags block</li>
     *   <li>{@code audioformat=mp31}   — ensures {@code audio} field is an MP3 URL</li>
     *   <li>{@code order=popularity_total} — most played tracks first</li>
     *   <li>{@code tags}               — genre filter (optional)</li>
     * </ul>
     *
     * @param tags     Genre tag filter; null = no filter.
     * @param pageSize Number of tracks to request.
     * @param offset   Pagination offset.
     * @return List of track DTOs; empty list on API error or empty result.
     */
    private List<JamendoTrackDto> fetchPage(String tags, int pageSize, int offset) {
        UriComponentsBuilder uriBuilder = UriComponentsBuilder
                .fromHttpUrl(JAMENDO_TRACKS_URL)
                .queryParam("client_id",    clientId)
                .queryParam("format",       "json")
                .queryParam("limit",        pageSize)
                .queryParam("offset",       offset)
                .queryParam("include",      "musicinfo")
                .queryParam("audioformat",  "mp31")
                .queryParam("order",        "popularity_total")
                .queryParam("imagesize",    "600");

        if (tags != null && !tags.isBlank()) {
            uriBuilder.queryParam("tags", tags.trim().toLowerCase());
        }

        String url = uriBuilder.toUriString();
        log.debug("Calling Jamendo API: {}", url);

        try {
            JamendoApiResponse response = restTemplate.getForObject(url, JamendoApiResponse.class);

            if (response == null || !response.isSuccess()) {
                log.warn("Jamendo API returned empty or error response for url={}", url);
                return Collections.emptyList();
            }

            return response.getResults();

        } catch (RestClientException e) {
            // Network error / timeout — log and return empty so the import
            // gracefully degrades rather than crashing.
            log.error("Jamendo API call failed (url={}): {}", url, e.getMessage());
            return Collections.emptyList();
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PRIVATE — DTO mapping
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Maps a {@link JamendoTrackDto} to the lightweight {@link JamendoDownloadMessage}
     * that will be serialised as JSON and placed on the queue.
     *
     * <p>We keep only the fields the worker needs — particularly the {@code audioUrl}
     * so the worker can download the file without making another API call.</p>
     */
    private JamendoDownloadMessage toDownloadMessage(JamendoTrackDto track) {
        return JamendoDownloadMessage.builder()
                .jamendoId(track.getId())
                .title(sanitiseTitle(track.getName()))
                .audioUrl(track.getAudioUrl())
                .thumbnailUrl(track.getImage())
                .artistStageName(track.getArtistName())
                .artistJamendoId(track.getArtistId())
                .durationSeconds(track.durationAsSeconds())
                .genreTags(track.safeGenreTags())
                .build();
    }

    /**
     * Sanitises a track title: trims whitespace and collapses internal spaces.
     * Prevents titles like "  My   Song  " from reaching the DB.
     */
    private String sanitiseTitle(String rawTitle) {
        if (rawTitle == null) return "Unknown Title";
        return rawTitle.trim().replaceAll("\\s+", " ");
    }
}