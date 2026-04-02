package iuh.fit.se.musicservice.mapper;

import iuh.fit.se.musicservice.dto.response.SongResponse;
import iuh.fit.se.musicservice.entity.Song;
import iuh.fit.se.musicservice.enums.TrackSource;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", uses = {GenreMapper.class})
public interface SongMapper {

    @Mapping(target = "primaryArtist", expression = "java(toArtistInfo(song))")
    @Mapping(target = "deleted", expression = "java(song.isDeleted())")
    @Mapping(target = "uploadUrl", ignore = true)
    @Mapping(target = "streamUrl", ignore = true)
    @Mapping(target = "source", expression = "java(resolveSource(song))")
    @Mapping(target = "externalUrl", ignore = true)
    @Mapping(target = "externalTrackId", ignore = true)
    SongResponse toResponse(Song song);

    default TrackSource resolveSource(Song song) {
        if (song == null) return TrackSource.LOCAL;
        return song.getJamendoId() != null && !song.getJamendoId().isBlank()
                ? TrackSource.JAMENDO
                : TrackSource.LOCAL;
    }

    default SongResponse.ArtistInfo toArtistInfo(Song song) {
        if (song == null) return null;
        return SongResponse.ArtistInfo.builder()
                .artistId(song.getPrimaryArtistId())
                .userId(null) 
                .stageName(song.getPrimaryArtistStageName())
                .avatarUrl(song.getPrimaryArtistAvatarUrl())
                .build();
    }
}
