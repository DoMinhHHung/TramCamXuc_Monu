package iuh.fit.se.musicservice.service.impl;

import com.rabbitmq.client.Channel;
import iuh.fit.se.musicservice.config.RabbitMQConfig;
import iuh.fit.se.musicservice.dto.jamendo.JamendoDownloadMessage;
import iuh.fit.se.musicservice.entity.Artist;
import iuh.fit.se.musicservice.entity.Genre;
import iuh.fit.se.musicservice.entity.Song;
import iuh.fit.se.musicservice.enums.ArtistStatus;
import iuh.fit.se.musicservice.enums.SongStatus;
import iuh.fit.se.musicservice.enums.TranscodeStatus;
import iuh.fit.se.musicservice.repository.ArtistRepository;
import iuh.fit.se.musicservice.repository.GenreRepository;
import iuh.fit.se.musicservice.repository.SongRepository;
import iuh.fit.se.musicservice.util.SlugUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Lazy(false)
@RequiredArgsConstructor
@Slf4j
public class JamendoDownloadWorker {

    private final RestTemplate restTemplate;
    private final MinioStorageService storageService;
    private final SongRepository songRepository;
    private final GenreRepository genreRepository;
    private final ArtistRepository artistRepository;
    private final RabbitTemplate rabbitTemplate;

    private static final Map<String, String> GENRE_WHITELIST = Map.ofEntries(
            Map.entry("pop", "Pop"), Map.entry("indie pop", "Pop"), Map.entry("electropop", "Pop"),
            Map.entry("rock", "Rock"), Map.entry("indie rock", "Rock"), Map.entry("alternative", "Rock"),
            Map.entry("punk", "Rock"), Map.entry("metal", "Metal"), Map.entry("hard rock", "Rock"),
            Map.entry("electronic", "Electronic"), Map.entry("electronica", "Electronic"), Map.entry("edm", "Electronic"),
            Map.entry("techno", "Electronic"), Map.entry("trance", "Electronic"), Map.entry("dubstep", "Electronic"),
            Map.entry("house", "House"), Map.entry("deep house", "House"),
            Map.entry("hiphop", "Hip-Hop"), Map.entry("hip hop", "Hip-Hop"), Map.entry("rap", "Hip-Hop"),
            Map.entry("rnb", "R&B"), Map.entry("r&b", "R&B"), Map.entry("soul", "R&B"),
            Map.entry("jazz", "Jazz"), Map.entry("blues", "Blues"), Map.entry("swing", "Jazz"),
            Map.entry("classical", "Classical"), Map.entry("orchestra", "Classical"), Map.entry("piano", "Classical"),
            Map.entry("ambient", "Ambient"), Map.entry("lofi", "Lo-fi"), Map.entry("lo-fi", "Lo-fi"),
            Map.entry("chillout", "Ambient"), Map.entry("chill", "Ambient"),
            Map.entry("folk", "Folk"), Map.entry("acoustic", "Folk"), Map.entry("country", "Country"),
            Map.entry("latin", "Latin"), Map.entry("reggae", "Reggae"), Map.entry("world", "World"),
            Map.entry("dance", "Dance"), Map.entry("disco", "Dance"), Map.entry("funk", "Funk"),
            Map.entry("instrumental", "Instrumental"), Map.entry("soundtrack", "Soundtrack"), Map.entry("cinematic", "Soundtrack")
    );

    private static final String AUDIO_CONTENT_TYPE = "audio/mpeg";
    private static final UUID JAMENDO_SYSTEM_ARTIST_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @RabbitListener(queues = RabbitMQConfig.JAMENDO_DOWNLOAD_QUEUE, ackMode = "MANUAL")
    @Transactional
    public void processDownload(
            JamendoDownloadMessage message,
            Channel channel,
            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) {

        String jamendoId = message.getJamendoId();
        log.info("==== [JAMENDO WORKER] START jamendoId={} title='{}' ====", jamendoId, message.getTitle());

        try {
            if (songRepository.existsByJamendoId(jamendoId)) {
                log.info("[JAMENDO WORKER] Duplicate detected — skipping jamendoId={}", jamendoId);
                ack(channel, deliveryTag);
                return;
            }

            if (message.getAudioUrl() == null || message.getAudioUrl().isBlank()) {
                log.warn("[JAMENDO WORKER] No audio URL for jamendoId={} — discarding", jamendoId);
                nack(channel, deliveryTag, jamendoId);
                return;
            }

            byte[] audioBytes = downloadAudioBytes(message.getAudioUrl(), jamendoId);
            String rawFileKey = buildRawFileKey(jamendoId);
            storageService.uploadRawBytes(rawFileKey, audioBytes, AUDIO_CONTENT_TYPE);

            Set<Genre> genres = upsertGenres(message.getGenreTags());
            Artist artist = upsertArtist(message.getArtistJamendoId(), message.getArtistStageName(), message.getThumbnailUrl());

            UUID songId = UUID.randomUUID();
            Song song = Song.builder()
                    .id(songId)
                    .title(message.getTitle())
                    .slug(SlugUtils.generate(message.getTitle(), songId))
                    .jamendoId(jamendoId)
                    .ownerUserId(JAMENDO_SYSTEM_ARTIST_ID)
                    .primaryArtistId(artist.getId())
                    .primaryArtistStageName(artist.getStageName())
                    .primaryArtistAvatarUrl(artist.getAvatarUrl())
                    .thumbnailUrl(message.getThumbnailUrl())
                    .durationSeconds(message.getDurationSeconds() > 0 ? message.getDurationSeconds() : null)
                    .genres(genres)
                    .rawFileKey(rawFileKey)
                    .status(SongStatus.DRAFT)
                    .transcodeStatus(TranscodeStatus.PENDING)
                    .playCount(0L)
                    .build();

            song = songRepository.save(song);
            log.info("[JAMENDO WORKER] Saved Song id={} jamendoId={}", songId, jamendoId);

            publishTranscodeRequest(song);
            ack(channel, deliveryTag);
            log.info("==== [JAMENDO WORKER] SUCCESS jamendoId={} songId={} ====", jamendoId, songId);

        } catch (Exception e) {
            log.error("==== [JAMENDO WORKER] FAILED jamendoId={}: {} ====", jamendoId, e.getMessage(), e);
            nack(channel, deliveryTag, jamendoId);
        }
    }

    private byte[] downloadAudioBytes(String audioUrl, String jamendoId) {
        log.info("[JAMENDO WORKER] Downloading MP3 for jamendoId={} url={}", jamendoId, audioUrl);
        byte[] bytes = restTemplate.getForObject(audioUrl, byte[].class);
        if (bytes == null || bytes.length == 0) {
            throw new IllegalStateException("Downloaded 0 bytes from URL: " + audioUrl);
        }
        log.info("[JAMENDO WORKER] Downloaded {} bytes for jamendoId={}", bytes.length, jamendoId);
        return bytes;
    }

    private Set<Genre> upsertGenres(List<String> rawTags) {
        if (rawTags == null || rawTags.isEmpty()) return Collections.emptySet();

        Set<String> canonicalNames = rawTags.stream()
                .filter(Objects::nonNull)
                .map(tag -> GENRE_WHITELIST.get(tag.trim().toLowerCase()))
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        if (canonicalNames.isEmpty()) return Collections.emptySet();

        Set<Genre> result = new HashSet<>();
        for (String name : canonicalNames) {
            Genre genre = genreRepository.findByNameIgnoreCase(name)
                    .orElseGet(() -> genreRepository.save(
                            Genre.builder().name(name).description("Imported from Jamendo").build()
                    ));
            result.add(genre);
        }
        return result;
    }

    private Artist upsertArtist(String artistJamendoId, String stageName, String thumbnailUrl) {
        String resolvedStageName = (stageName != null && !stageName.isBlank()) ? stageName.trim() : "Unknown Artist";
        Optional<Artist> existingByName = artistRepository.findByStageNameIgnoreCase(resolvedStageName);

        if (existingByName.isPresent()) return existingByName.get();

        UUID artistUuid = UUID.nameUUIDFromBytes(("jamendo-artist:" + artistJamendoId).getBytes(StandardCharsets.UTF_8));

        Artist newArtist = Artist.builder()
                .id(artistUuid)
                .stageName(resolvedStageName)
                .avatarUrl(thumbnailUrl)
                .isJamendo(true)
                .userId(null)
                .status(ArtistStatus.ACTIVE)
                .build();

        return artistRepository.save(newArtist);
    }

    private void publishTranscodeRequest(Song song) {
        Map<String, Object> transcodeMsg = Map.of(
                "songId", song.getId().toString(),
                "rawFileKey", song.getRawFileKey(),
                "fileExtension", extractExtension(song.getRawFileKey())
        );
        rabbitTemplate.convertAndSend(RabbitMQConfig.MUSIC_EXCHANGE, RabbitMQConfig.TRANSCODE_ROUTING_KEY, transcodeMsg);
        log.info("[JAMENDO WORKER] Transcode request published for songId={}", song.getId());
    }

    private void ack(Channel channel, long deliveryTag) {
        try {
            channel.basicAck(deliveryTag, false);
        } catch (IOException e) {
            log.error("[JAMENDO WORKER] Failed to ACK deliveryTag={}: {}", deliveryTag, e.getMessage());
        }
    }

    private void nack(Channel channel, long deliveryTag, String jamendoId) {
        try {
            channel.basicNack(deliveryTag, false, false);
        } catch (IOException e) {
            log.error("[JAMENDO WORKER] Failed to NACK deliveryTag={}: {}", deliveryTag, e.getMessage());
        }
    }

    private String buildRawFileKey(String jamendoId) {
        return String.format("raw/jamendo/%s.mp3", jamendoId);
    }

    private String extractExtension(String rawFileKey) {
        if (rawFileKey == null) return "mp3";
        int dotIdx = rawFileKey.lastIndexOf('.');
        return dotIdx >= 0 ? rawFileKey.substring(dotIdx + 1) : "mp3";
    }

}

