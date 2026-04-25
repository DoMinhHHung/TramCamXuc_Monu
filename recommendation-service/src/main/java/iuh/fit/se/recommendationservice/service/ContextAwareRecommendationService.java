package iuh.fit.se.recommendationservice.service;

import iuh.fit.se.recommendationservice.dto.ContextSignalDto;
import iuh.fit.se.recommendationservice.dto.RecommendedSongDto;
import iuh.fit.se.recommendationservice.dto.SongDetailDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Recommendation hiểu ngữ cảnh, không chỉ sở thích.
 *
 * Thay vì chỉ "bạn thích gì → gợi ý cái giống vậy":
 *   22h        → lofi, indie, acoustic
 *   Thứ 2 sáng → nhạc boost năng lượng
 *   Stressed   → ambient, classical, lofi
 *
 * Scoring: so khớp genre name với keyword list của mỗi context.
 * Multiplier [0.6, 2.0] — áp lên candidate score trước khi blend.
 */
@Service
@Slf4j
public class ContextAwareRecommendationService {

    // Genre keywords cho từng khung giờ
    private static final Map<ContextSignalDto.TimeSlot, List<String>> SLOT_GENRES = Map.of(
            ContextSignalDto.TimeSlot.EARLY_MORNING, List.of("workout", "gym", "edm", "pop", "upbeat", "hiphop", "dance"),
            ContextSignalDto.TimeSlot.MORNING,       List.of("pop", "indie", "acoustic", "focus", "chill", "coffee"),
            ContextSignalDto.TimeSlot.AFTERNOON,     List.of("pop", "hiphop", "rnb", "tropical", "dance", "k-pop"),
            ContextSignalDto.TimeSlot.EVENING,       List.of("chill", "rnb", "indie", "soul", "jazz", "café"),
            ContextSignalDto.TimeSlot.NIGHT,         List.of("ballad", "indie", "acoustic", "emotional", "soul", "tâm trạng"),
            ContextSignalDto.TimeSlot.LATE_NIGHT,    List.of("lofi", "ambient", "chill", "classical", "jazz", "deep")
    );

    // Genre keywords cho từng tâm trạng
    private static final Map<ContextSignalDto.MoodType, List<String>> MOOD_GENRES = Map.of(
            ContextSignalDto.MoodType.HAPPY,     List.of("pop", "upbeat", "dance", "tropical", "k-pop"),
            ContextSignalDto.MoodType.SAD,       List.of("ballad", "acoustic", "emotional", "soul", "tâm trạng"),
            ContextSignalDto.MoodType.STRESSED,  List.of("lofi", "ambient", "classical", "nature", "chill"),
            ContextSignalDto.MoodType.FOCUSED,   List.of("lofi", "classical", "instrumental", "ambient", "focus"),
            ContextSignalDto.MoodType.ROMANTIC,  List.of("rnb", "soul", "ballad", "jazz", "tình cảm"),
            ContextSignalDto.MoodType.ENERGETIC, List.of("edm", "hiphop", "workout", "rock", "dance")
    );

    /** Auto-detect TimeSlot từ giờ hiện tại của server */
    public ContextSignalDto.TimeSlot detectCurrentTimeSlot() {
        int h = LocalTime.now().getHour();
        if (h >= 5  && h < 8)  return ContextSignalDto.TimeSlot.EARLY_MORNING;
        if (h >= 8  && h < 12) return ContextSignalDto.TimeSlot.MORNING;
        if (h >= 12 && h < 17) return ContextSignalDto.TimeSlot.AFTERNOON;
        if (h >= 17 && h < 20) return ContextSignalDto.TimeSlot.EVENING;
        if (h >= 20 && h < 23) return ContextSignalDto.TimeSlot.NIGHT;
        return ContextSignalDto.TimeSlot.LATE_NIGHT;
    }

    /** Label hiển thị cho section context trên UI */
    public String getSectionLabel(ContextSignalDto context) {
        if (context.getMood() != null) {
            return switch (context.getMood()) {
                case HAPPY     -> "Vui vẻ - Nhảy thôi 🎉";
                case SAD       -> "Buồn - Chill cùng mình 🌧️";
                case STRESSED  -> "Thư giãn - Hít thở đi 🌿";
                case FOCUSED   -> "Tập trung - Focus mode 🎯";
                case ROMANTIC  -> "Lãng mạn 💕";
                case ENERGETIC -> "Năng lượng - Bùng cháy 🔥";
            };
        }
        ContextSignalDto.TimeSlot slot = context.getTimeSlot() != null
                ? context.getTimeSlot() : detectCurrentTimeSlot();
        return switch (slot) {
            case EARLY_MORNING -> "Sáng sớm - Năng lượng 🌅";
            case MORNING       -> "Buổi sáng - Tập trung ☀️";
            case AFTERNOON     -> "Chiều nay - Phấn khích 🎶";
            case EVENING       -> "Tối nay - Thư giãn 🌆";
            case NIGHT         -> "Đêm - Cảm xúc 🌙";
            case LATE_NIGHT    -> "Khuya - Chiêm nghiệm 🌃";
        };
    }

    /**
     * Tính multiplier ngữ cảnh cho một bài hát.
     *
     * @return [0.6, 2.0] — 0.6 nếu genre lệch hoàn toàn, 2.0 nếu match tốt
     */
    public double computeContextMultiplier(SongDetailDto song, ContextSignalDto context) {
        ContextSignalDto.TimeSlot slot = context.getTimeSlot() != null
                ? context.getTimeSlot() : detectCurrentTimeSlot();

        List<String> keywords = new ArrayList<>(SLOT_GENRES.getOrDefault(slot, List.of()));
        if (context.getMood() != null) {
            keywords.addAll(MOOD_GENRES.getOrDefault(context.getMood(), List.of()));
        }

        if (keywords.isEmpty() || song.getGenres() == null || song.getGenres().isEmpty()) {
            return 1.0;
        }

        long matches = song.getGenres().stream()
                .filter(g -> {
                    String name = g.getName() == null ? "" : g.getName().toLowerCase();
                    return keywords.stream().anyMatch(kw -> name.contains(kw) || kw.contains(name));
                })
                .count();

        if (matches == 0) return 0.6;
        return Math.min(1.5 + (matches - 1) * 0.25, 2.0);
    }

    /**
     * Lọc và boost candidates theo ngữ cảnh → trả về contextual section.
     * Chỉ lấy các bài match context (multiplier >= 1.0).
     */
    public List<RecommendedSongDto> buildContextualSection(
            List<RecommendedSongDto> candidates,
            Map<String, SongDetailDto> details,
            ContextSignalDto context,
            int limit) {

        String label = getSectionLabel(context);

        return candidates.stream()
                .filter(s -> details.containsKey(s.getSongId()))
                .map(s -> Map.entry(s, computeContextMultiplier(details.get(s.getSongId()), context)))
                .filter(e -> e.getValue() >= 1.0)
                .sorted(Comparator.comparingDouble(Map.Entry<RecommendedSongDto, Double>::getValue).reversed())
                .limit(limit)
                .map(e -> {
                    RecommendedSongDto s = e.getKey();
                    return RecommendedSongDto.builder()
                            .songId(s.getSongId())
                            .title(s.getTitle())
                            .slug(s.getSlug())
                            .thumbnailUrl(s.getThumbnailUrl())
                            .durationSeconds(s.getDurationSeconds())
                            .playCount(s.getPlayCount())
                            .artistId(s.getArtistId())
                            .artistStageName(s.getArtistStageName())
                            .artistAvatarUrl(s.getArtistAvatarUrl())
                            .reason(RecommendedSongDto.ReasonType.CONTEXT_TIME)
                            .reasonContext(label)
                            .build();
                })
                .collect(Collectors.toList());
    }

    /**
     * Re-rank một danh sách candidates bằng cách nhân với context multiplier.
     * Dùng để boost forYou section thay vì tạo section riêng.
     */
    public List<RecommendedSongDto> reRankByContext(
            List<RecommendedSongDto> songs,
            Map<String, SongDetailDto> details,
            ContextSignalDto context) {

        return songs.stream()
                .map(s -> {
                    SongDetailDto d = details.get(s.getSongId());
                    double mult = d != null ? computeContextMultiplier(d, context) : 1.0;
                    return Map.entry(s, mult);
                })
                .sorted(Comparator.comparingDouble(Map.Entry<RecommendedSongDto, Double>::getValue).reversed())
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
    }
}
