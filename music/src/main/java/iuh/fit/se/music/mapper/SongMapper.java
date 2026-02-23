package iuh.fit.se.music.mapper;

import iuh.fit.se.music.dto.request.SongCreateRequest;
import iuh.fit.se.music.dto.response.SongResponse;
import iuh.fit.se.music.entity.Artist;
import iuh.fit.se.music.entity.Song;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", uses = {GenreMapper.class})
public interface SongMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "slug", ignore = true)
    @Mapping(target = "primaryArtist", ignore = true)
    @Mapping(target = "genres", ignore = true)
    @Mapping(target = "rawFileKey", ignore = true)
    @Mapping(target = "hlsMasterUrl", ignore = true)
    @Mapping(target = "durationSeconds", ignore = true)
    @Mapping(target = "lyricUrl", ignore = true)
    @Mapping(target = "thumbnailUrl", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "approvalStatus", ignore = true)
    @Mapping(target = "transcodeStatus", ignore = true)
    @Mapping(target = "rejectionReason", ignore = true)
    @Mapping(target = "reviewedAt", ignore = true)
    @Mapping(target = "reviewedBy", ignore = true)
    @Mapping(target = "playCount", ignore = true)
    Song toEntity(SongCreateRequest request);

    @Mapping(target = "uploadUrl", ignore = true)
    @Mapping(target = "streamUrl", ignore = true)
    @Mapping(target = "primaryArtist", source = "primaryArtist")
    SongResponse toResponse(Song song);

    default SongResponse.ArtistSummary toArtistSummary(Artist artist) {
        if (artist == null) return null;
        return SongResponse.ArtistSummary.builder()
                .id(artist.getId())
                .userId(artist.getUserId())
                .stageName(artist.getStageName())
                .avatarUrl(artist.getAvatarUrl())
                .build();
    }
}