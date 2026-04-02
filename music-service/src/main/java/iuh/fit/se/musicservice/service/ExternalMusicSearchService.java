package iuh.fit.se.musicservice.service;

import iuh.fit.se.musicservice.dto.response.SongResponse;

import java.util.List;

public interface ExternalMusicSearchService {
    List<SongResponse> search(String keyword, int limit);
}

