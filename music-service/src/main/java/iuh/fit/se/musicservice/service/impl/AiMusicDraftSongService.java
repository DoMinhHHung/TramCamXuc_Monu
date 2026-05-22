package iuh.fit.se.musicservice.service.impl;

import iuh.fit.se.musicservice.dto.internal.AiMusicJobRedisState;
import iuh.fit.se.musicservice.entity.Artist;
import iuh.fit.se.musicservice.entity.Genre;
import iuh.fit.se.musicservice.entity.Song;
import iuh.fit.se.musicservice.enums.SongStatus;
import iuh.fit.se.musicservice.enums.SourceType;
import iuh.fit.se.musicservice.enums.TranscodeStatus;
import iuh.fit.se.musicservice.exception.AppException;
import iuh.fit.se.musicservice.exception.ErrorCode;
import iuh.fit.se.musicservice.repository.ArtistRepository;
import iuh.fit.se.musicservice.repository.GenreRepository;
import iuh.fit.se.musicservice.repository.SongRepository;
import iuh.fit.se.musicservice.util.SlugUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
@Service
@RequiredArgsConstructor
@Slf4j
public class AiMusicDraftSongService {

    private final ArtistRepository artistRepository;
    private final GenreRepository genreRepository;
    private final SongRepository songRepository;

    @Transactional
    public UUID createDraftForAiJob(UUID jobId, AiMusicJobRedisState state, UUID userId) {
        Artist artist = artistRepository.findByUserId(userId)
                .orElseThrow(() -> new AppException(ErrorCode.ARTIST_NOT_FOUND));

        Set<Genre> genreSet = new HashSet<>();
        if (state.getGenreIds() != null) {
            for (String gid : state.getGenreIds()) {
                UUID id = UUID.fromString(gid);
                genreSet.add(genreRepository.findById(id)
                        .orElseThrow(() -> new AppException(ErrorCode.GENRE_NOT_FOUND)));
            }
        }

        UUID songId = UUID.randomUUID();
        Song song = Song.builder()
                .id(songId)
                .title(state.getTitle())
                .slug(SlugUtils.generate(state.getTitle(), songId))
                .ownerUserId(userId)
                .primaryArtistId(artist.getId())
                .primaryArtistStageName(artist.getStageName())
                .primaryArtistAvatarUrl(artist.getAvatarUrl())
                .genres(genreSet)
                .rawFileKey(state.getPreviewRawKey())
                .coverFileKey(null)
                .status(SongStatus.DRAFT)
                .transcodeStatus(TranscodeStatus.PENDING)
                .playCount(0L)
                .sourceType(SourceType.AI)
                .aiJobId(jobId)
                .aiVisibilityTarget(null)
                .build();

        Song saved = songRepository.save(song);
        log.info("[AiMusic] draft song {} for job {}", saved.getId(), jobId);
        return saved.getId();
    }
}
