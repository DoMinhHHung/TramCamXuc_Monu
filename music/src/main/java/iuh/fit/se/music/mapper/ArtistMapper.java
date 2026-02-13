package iuh.fit.se.music.mapper;

import iuh.fit.se.music.dto.request.ArtistRegisterRequest;
import iuh.fit.se.music.dto.response.ArtistResponse;
import iuh.fit.se.music.entity.Artist;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ArtistMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "status", ignore = true)
    Artist toEntity(ArtistRegisterRequest request);

    ArtistResponse toResponse(Artist artist);
}