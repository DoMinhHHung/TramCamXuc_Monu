package iuh.fit.se.recommendationservice.client;

import iuh.fit.se.recommendationservice.dto.ApiResponse;
import iuh.fit.se.recommendationservice.dto.SongDetailDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.UUID;

@FeignClient(name = "music-service")
public interface MusicInternalClient {

    /**
     * Lấy thông tin nhiều bài hát cùng lúc theo list IDs.
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
     */
    @GetMapping("/songs/by-artist/{artistId}")
    ApiResponse<Page<SongDetailDto>> getSongsByArtistPaged(
            @PathVariable("artistId") UUID artistId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size);

    /**
     * Tìm kiếm bài hát PUBLIC theo genre.
     *
     * Dùng cho cold-start khi trending ZSET chưa có data:
     * thay vì chỉ dựa vào Redis ZSET (có thể rỗng với platform mới),
     * gọi thẳng music-service để lấy bài theo genre từ DB.
     *
     * Trả về Page<SongDetailDto> sắp theo createdAt DESC (mới nhất trước).
     */
    @GetMapping("/songs")
    ApiResponse<Page<SongDetailDto>> searchSongsByGenre(
            @RequestParam(required = false) UUID genreId,
            @RequestParam(defaultValue = "1")  int page,
            @RequestParam(defaultValue = "20") int size);

    /**
     * Bài hát trending toàn cầu — fallback cuối cùng khi không có data.
     */
    @GetMapping("/songs/trending")
    ApiResponse<Page<SongDetailDto>> getTrendingSongs(
            @RequestParam(defaultValue = "1")  int page,
            @RequestParam(defaultValue = "20") int size);
}