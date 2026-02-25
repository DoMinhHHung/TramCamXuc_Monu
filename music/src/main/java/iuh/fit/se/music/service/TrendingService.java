package iuh.fit.se.music.service;

import iuh.fit.se.music.enums.TrendingPeriod;

import java.util.List;
import java.util.UUID;

public interface TrendingService {
    List<UUID> getTopSongs(TrendingPeriod period, int limit);
    List<UUID> getTopAlbums(TrendingPeriod period, int limit);
    List<UUID> getTopArtists(TrendingPeriod period, int limit);
}