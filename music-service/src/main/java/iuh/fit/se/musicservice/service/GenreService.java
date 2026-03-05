package iuh.fit.se.musicservice.service;

import iuh.fit.se.musicservice.dto.response.GenreResponse;

import java.util.List;

public interface GenreService {
    List<GenreResponse> getAll();
}
