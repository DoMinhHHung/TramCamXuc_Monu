package iuh.fit.se.music.service.impl;

import iuh.fit.se.music.enums.TrendingPeriod;
import iuh.fit.se.music.service.TrendingService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.WeekFields;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TrendingServiceImpl implements TrendingService {

    private final StringRedisTemplate redisTemplate;

    @Override
    @Cacheable(value = "trending", key = "#period + ':' + #limit")
    public List<UUID> getTopSongs(TrendingPeriod period, int limit) {
        return getTopIds("trending:song:" + periodKey(period), limit);
    }

    @Override
    public List<UUID> getTopAlbums(TrendingPeriod period, int limit) {
        return getTopIds("trending:album:" + periodKey(period), limit);
    }

    @Override
    public List<UUID> getTopArtists(TrendingPeriod period, int limit) {
        if (period == TrendingPeriod.WEEK) period = TrendingPeriod.MONTH;
        return getTopIds("trending:artist:" + periodKey(period), limit);
    }

    private List<UUID> getTopIds(String key, int limit) {
        Set<String> ids = redisTemplate.opsForZSet()
                .reverseRange(key, 0, limit - 1);
        if (ids == null) return List.of();
        return ids.stream().map(UUID::fromString).collect(Collectors.toList());
    }

    private String periodKey(TrendingPeriod period) {
        LocalDate now = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        return switch (period) {
            case WEEK  -> "week:"  + weekKey(now);
            case MONTH -> "month:" + now.format(DateTimeFormatter.ofPattern("yyyy-MM"));
            case YEAR  -> "year:"  + now.getYear();
        };
    }

    private String weekKey(LocalDate date) {
        int week = date.get(WeekFields.of(Locale.getDefault()).weekOfWeekBasedYear());
        return date.getYear() + "-W" + String.format("%02d", week);
    }
}