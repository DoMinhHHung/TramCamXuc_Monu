package iuh.fit.se.socialservice.service;

import iuh.fit.se.socialservice.dto.response.TopSongListenEntry;

import java.util.List;

public interface ListenStatsService {

    List<TopSongListenEntry> topSongs(ListenPeriod period, int limit);
}
