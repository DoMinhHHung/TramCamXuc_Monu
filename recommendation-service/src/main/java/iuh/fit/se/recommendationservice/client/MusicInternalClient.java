package iuh.fit.se.recommendationservice.client;

import iuh.fit.se.recommendationservice.dto.ApiResponse;
import iuh.fit.se.recommendationservice.dto.SongDetailDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.UUID;

@FeignClient(name = "music-service")
public interface MusicInternalClient {

    /**
     * Lấy thông tin nhiều bài hát cùng lúc theo list IDs.
     * Dùng để hydrate songId → full SongDetailDto sau khi có list từ ML/trending.
     * music-service đã cache endpoint này trong Redis (CACHE_BATCH_TTL = 10 min).
     */
    @GetMapping("/songs/batch")
    ApiResponse<List<SongDetailDto>> getSongsByIds(@RequestParam("ids") List<UUID> ids);

    /**
     * Top bài hát PUBLIC của một artist, sort by playCount DESC.
     * Có cache 15 min phía music-service.
     */
    @GetMapping("/artists/{artistId}/songs")
    ApiResponse<List<SongDetailDto>> getSongsByArtist(
            @PathVariable("artistId") UUID artistId,
            @RequestParam(defaultValue = "10") int limit);

    /**
     * Bài hát mới nhất của artist (dùng cho new releases section).
     * Lọc theo createdAt DESC, chỉ lấy PUBLIC + COMPLETED.
     */
    @GetMapping("/songs/by-artist/{artistId}")
    ApiResponse<org.springframework.data.domain.Page<SongDetailDto>> getSongsByArtistPaged(
            @PathVariable("artistId") UUID artistId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size);
}
