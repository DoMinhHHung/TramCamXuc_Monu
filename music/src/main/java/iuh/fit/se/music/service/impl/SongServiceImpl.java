package iuh.fit.se.music.service.impl;

import iuh.fit.se.core.configuration.RabbitMQConfig;
import iuh.fit.se.core.dto.message.TranscodeSongMessage;
import iuh.fit.se.core.exception.*;
import iuh.fit.se.core.service.StorageService;
import iuh.fit.se.music.dto.request.SongCreateRequest;
import iuh.fit.se.music.dto.response.SongResponse;
import iuh.fit.se.music.entity.*;
import iuh.fit.se.music.enums.ArtistStatus;
import iuh.fit.se.music.enums.SongStatus;
import iuh.fit.se.music.mapper.SongMapper;
import iuh.fit.se.music.repository.*;
import iuh.fit.se.music.service.SongService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class SongServiceImpl implements SongService {

    private final SongRepository songRepository;
    private final ArtistRepository artistRepository;
    private final GenreRepository genreRepository;
    private final SongMapper songMapper;
    private final StorageService storageService;
    private final RabbitTemplate rabbitTemplate;

    @Override
    @Transactional
    public SongResponse requestUploadUrl(SongCreateRequest request) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        UUID userId = UUID.fromString(authentication.getName());

        Artist artist = artistRepository.findByUserId(userId)
                .orElseThrow(() -> new AppException(ErrorCode.ARTIST_NOT_FOUND));

        if (artist.getStatus() != ArtistStatus.ACTIVE) {
            log.warn("Artist {} tried to upload but status is {}", artist.getStageName(), artist.getStatus());
            throw new AppException(ErrorCode.ARTIST_RESTRICTED);
        }

        List<Genre> genres = genreRepository.findAllById(request.getGenreIds());
        if (genres.size() != request.getGenreIds().size()) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        UUID songId = UUID.randomUUID();
        String rawFileKey = String.format("raw/%s/%s.%s",
                artist.getId().toString(),
                songId.toString(),
                request.getFileExtension().replace(".", ""));

        String presignedUrl = storageService.generatePresignedUploadUrl(rawFileKey);

        Song song = Song.builder()
                .id(songId)
                .title(request.getTitle())
                .slug(generateSlug(request.getTitle(), songId))
                .primaryArtist(artist)
                .genres(new HashSet<>(genres))
                .rawFileKey(rawFileKey)
                .status(SongStatus.PENDING)
                .playCount(0L)
                .build();

        song = songRepository.save(song);

        SongResponse response = songMapper.toResponse(song);
        response.setUploadUrl(presignedUrl);

        log.info("Generated upload URL for song: {} by artist: {}", song.getTitle(), artist.getStageName());
        return response;
    }

    @Override
    @Transactional
    public void confirmUpload(UUID songId) {
        UUID userId = UUID.fromString(SecurityContextHolder.getContext().getAuthentication().getName());

        Song song = songRepository.findById(songId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST));

        if (!song.getPrimaryArtist().getUserId().equals(userId)) {
            throw new AppException(ErrorCode.ARTIST_NOT_FOUND);
        }

        if (song.getStatus() != SongStatus.PENDING) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }
        song.setStatus(SongStatus.PROCESSING);
        songRepository.save(song);

        TranscodeSongMessage message = TranscodeSongMessage.builder()
                .songId(song.getId())
                .rawFileKey(song.getRawFileKey())
                .fileExtension(song.getRawFileKey().substring(song.getRawFileKey().lastIndexOf(".") + 1))
                .build();

        rabbitTemplate.convertAndSend(
                RabbitMQConfig.MUSIC_EXCHANGE,
                RabbitMQConfig.TRANSCODE_ROUTING_KEY,
                message
        );

        log.info("Sent transcode request for song: {}", songId);
    }

    private String generateSlug(String title, UUID songId) {
        try {
            String temp = Normalizer.normalize(title, Normalizer.Form.NFD);
            Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
            String slug = pattern.matcher(temp).replaceAll("").toLowerCase()
                    .replaceAll("[^a-z0-9\\s-]", "")
                    .replaceAll("\\s+", "-");

            if (slug.length() > 100) slug = slug.substring(0, 100);
            return slug + "-" + songId.toString().substring(0, 8);
        } catch (Exception e) {
            return songId.toString();
        }
    }
}
