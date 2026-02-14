package iuh.fit.se.music.service.impl;

import iuh.fit.se.core.exception.AppException;
import iuh.fit.se.core.exception.ErrorCode;
import iuh.fit.se.music.dto.request.GenreRequest;
import iuh.fit.se.music.dto.response.GenreResponse;
import iuh.fit.se.music.entity.Genre;
import iuh.fit.se.music.mapper.GenreMapper;
import iuh.fit.se.music.repository.GenreRepository;
import iuh.fit.se.music.service.GenreService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GenreServiceImpl implements GenreService {

    private final GenreRepository genreRepository;
    private final GenreMapper genreMapper;

    @Override
    @Transactional
    public GenreResponse createGenre(GenreRequest request) {
        if (genreRepository.existsByName(request.getName())) {
            throw new AppException(ErrorCode.GENRE_ALREADY_EXISTS);
        }

        Genre genre = genreMapper.toEntity(request);

        return genreMapper.toResponse(genreRepository.save(genre));
    }

    @Override
    @Transactional
    public GenreResponse updateGenre(UUID id, GenreRequest request) {
        Genre genre = genreRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.GENRE_NOT_FOUND));

        if (!genre.getName().equals(request.getName()) && genreRepository.existsByName(request.getName())) {
            throw new AppException(ErrorCode.GENRE_ALREADY_EXISTS);
        }

        genreMapper.updateEntity(request, genre);

        return genreMapper.toResponse(genreRepository.save(genre));
    }

    @Override
    @Transactional
    public void deleteGenre(UUID id) {
// TODO: Sau này có Song thì phải check xem Genre này có đang được dùng không trước khi xóa
        if (!genreRepository.existsById(id)) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }
        genreRepository.deleteById(id);
    }

    @Override
    public GenreResponse getGenreById(UUID id) {
        Genre genre = genreRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST));
        return genreMapper.toResponse(genre);
    }

    @Override
    public List<GenreResponse> getAllGenres() {
        return genreRepository.findAll().stream()
                .map(genreMapper::toResponse)
                .collect(Collectors.toList());
    }
}
