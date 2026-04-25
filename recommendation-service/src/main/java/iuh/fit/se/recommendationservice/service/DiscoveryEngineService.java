package iuh.fit.se.recommendationservice.service;

import iuh.fit.se.recommendationservice.dto.RecommendedSongDto;
import iuh.fit.se.recommendationservice.dto.SongDetailDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Discovery Engine: 70% quen thuộc + 30% khám phá.
 *
 * Tránh "filter bubble" — nếu chỉ recommend thứ giống nhau,
 * user sẽ chán vì nghe hoài 1 kiểu.
 *
 * Logic phân loại:
 *   Familiar    = genres user đã nghe trong lịch sử
 *   Exploratory = genres mới, artists mới → tag isDiscovery=true
 *
 * Interleave: 2 familiar → 1 discovery → 2 familiar → 1 discovery...
 * Kết quả: user được mở rộng horizon từ từ, không bị shock.
 */
@Service
@Slf4j
public class DiscoveryEngineService {

    private static final double FAMILIAR_RATIO = 0.70;

    /**
     * Áp dụng 70/30 blend lên danh sách candidates.
     *
     * @param candidates    tất cả candidate songs đã được rank
     * @param details       map songId → SongDetailDto
     * @param userKnownGenreIds genre IDs user đã nghe (dùng để classify familiar vs exploratory)
     * @param limit         số lượng trả về
     */
    public List<RecommendedSongDto> applyDiscoveryBlend(
            List<RecommendedSongDto> candidates,
            Map<String, SongDetailDto> details,
            Set<String> userKnownGenreIds,
            int limit) {

        if (userKnownGenreIds.isEmpty()) {
            // Cold start: chưa có dữ liệu genre → trả về tất cả như familiar
            return candidates.stream().limit(limit).collect(Collectors.toList());
        }

        List<RecommendedSongDto> familiar    = new ArrayList<>();
        List<RecommendedSongDto> exploratory = new ArrayList<>();

        for (RecommendedSongDto s : candidates) {
            SongDetailDto d = details.get(s.getSongId());
            if (d == null) {
                familiar.add(s);
                continue;
            }

            boolean isFamiliar = d.getGenres() != null
                    && d.getGenres().stream().anyMatch(g -> userKnownGenreIds.contains(g.getId()));

            if (isFamiliar) {
                familiar.add(s);
            } else {
                String genreLabel = (d.getGenres() != null && !d.getGenres().isEmpty())
                        ? d.getGenres().iterator().next().getName()
                        : "Mới";

                exploratory.add(RecommendedSongDto.builder()
                        .songId(s.getSongId())
                        .title(s.getTitle())
                        .slug(s.getSlug())
                        .thumbnailUrl(s.getThumbnailUrl())
                        .durationSeconds(s.getDurationSeconds())
                        .playCount(s.getPlayCount())
                        .artistId(s.getArtistId())
                        .artistStageName(s.getArtistStageName())
                        .artistAvatarUrl(s.getArtistAvatarUrl())
                        .reason(RecommendedSongDto.ReasonType.DISCOVERY)
                        .reasonContext("Khám phá · " + genreLabel)
                        .isDiscovery(true)
                        .build());
            }
        }

        int familiarCount    = (int) Math.round(limit * FAMILIAR_RATIO);
        int exploratoryCount = limit - familiarCount;

        List<RecommendedSongDto> result = new ArrayList<>(limit);
        Iterator<RecommendedSongDto> famIt = familiar.stream().limit(familiarCount).iterator();
        Iterator<RecommendedSongDto> expIt = exploratory.stream().limit(exploratoryCount).iterator();

        // Interleave: 2 familiar, 1 discovery, 2 familiar, 1 discovery...
        while (famIt.hasNext() || expIt.hasNext()) {
            for (int i = 0; i < 2 && famIt.hasNext(); i++) result.add(famIt.next());
            if (expIt.hasNext()) result.add(expIt.next());
        }

        log.debug("[Discovery] blend: familiar={} exploratory={} total={}",
                familiar.size(), exploratory.size(), result.size());

        return result.stream().limit(limit).collect(Collectors.toList());
    }

    /**
     * Extract tập genre IDs user quen thuộc từ danh sách bài đã nghe.
     */
    public Set<String> extractUserKnownGenreIds(Collection<SongDetailDto> listenedOrLikedSongs) {
        return listenedOrLikedSongs.stream()
                .filter(s -> s.getGenres() != null)
                .flatMap(s -> s.getGenres().stream())
                .map(SongDetailDto.GenreInfo::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }
}
