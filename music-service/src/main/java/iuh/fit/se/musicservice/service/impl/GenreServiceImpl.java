package iuh.fit.se.musicservice.service.impl;

import iuh.fit.se.musicservice.dto.response.GenreResponse;
import iuh.fit.se.musicservice.enums.Genre;
import iuh.fit.se.musicservice.service.GenreService;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

@Service
public class GenreServiceImpl implements GenreService {
    @Override
    public List<GenreResponse> getAll() {
        return Arrays.stream(Genre.values()).map(GenreResponse::from).toList();
    }
}
