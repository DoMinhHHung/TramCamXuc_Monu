package iuh.fit.se.musicservice.mapper;

import iuh.fit.se.musicservice.dto.response.AlbumResponse;
import iuh.fit.se.musicservice.dto.response.AlbumSongResponse;
import iuh.fit.se.musicservice.entity.Album;
import iuh.fit.se.musicservice.entity.AlbumSong;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AlbumMapper {

    @Mapping(target = "songs", ignore = true)
    @Mapping(target = "totalSongs", ignore = true)
    AlbumResponse toResponse(Album album);

    @Mapping(target = "albumSongId", source = "id")
    @Mapping(target = "songId", source = "songId")
    @Mapping(target = "prevId", source = "prevId")
    @Mapping(target = "nextId", source = "nextId")
    @Mapping(target = "addedAt", source = "addedAt")
    @Mapping(target = "title", ignore = true)
    @Mapping(target = "slug", ignore = true)
    @Mapping(target = "thumbnailUrl", ignore = true)
    @Mapping(target = "durationSeconds", ignore = true)
    @Mapping(target = "playCount", ignore = true)
    @Mapping(target = "available", ignore = true)
    @Mapping(target = "unavailableReason", ignore = true)
    @Mapping(target = "artistId", ignore = true)
    @Mapping(target = "artistStageName", ignore = true)
    @Mapping(target = "artistAvatarUrl", ignore = true)
    @Mapping(target = "genres", ignore = true)
    AlbumSongResponse toSongResponse(AlbumSong albumSong);
}
