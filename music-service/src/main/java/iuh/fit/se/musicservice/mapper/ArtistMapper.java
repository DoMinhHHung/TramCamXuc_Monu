package iuh.fit.se.musicservice.mapper;

import iuh.fit.se.musicservice.dto.response.ArtistResponse;
import iuh.fit.se.musicservice.entity.Artist;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ArtistMapper {

    @Mapping(target = "hint", ignore = true)
    @Mapping(target = "newToken", ignore = true)
    ArtistResponse toResponse(Artist artist);
}
