package iuh.fit.se.music.service;

import iuh.fit.se.music.dto.request.GenreRequest;
import iuh.fit.se.music.dto.response.GenreResponse;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.UUID;

public interface GenreService {
    GenreResponse createGenre(GenreRequest request);
    GenreResponse updateGenre(UUID id, GenreRequest request);
    void deleteGenre(UUID id);
    GenreResponse getGenreById(UUID id);
    List<GenreResponse> getAllGenres();
}