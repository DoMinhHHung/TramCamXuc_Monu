package iuh.fit.se.musicservice.service;

import iuh.fit.se.musicservice.dto.request.GenreRequest;
import iuh.fit.se.musicservice.dto.response.GenreResponse;

import java.util.List;
import java.util.UUID;

public interface GenreService {
    GenreResponse createGenre(GenreRequest request);
    GenreResponse updateGenre(UUID id, GenreRequest request);
    void deleteGenre(UUID id);
    GenreResponse getGenreById(UUID id);
    List<GenreResponse> getAllGenres();

    /**
     * Lấy danh sách genres phổ biến (dựa vào số lượng bài hát).
     * Dùng cho onboarding screen.
     */
    List<GenreResponse> getPopularGenres(int limit);
}
