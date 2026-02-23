package iuh.fit.se.music.mapper;

import iuh.fit.se.music.dto.request.GenreRequest;
import iuh.fit.se.music.dto.response.GenreResponse;
import iuh.fit.se.music.entity.Genre;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface GenreMapper {

    @Mapping(target = "id", ignore = true)
    Genre toEntity(GenreRequest request);

    GenreResponse toResponse(Genre genre);

    @Mapping(target = "id", ignore = true)
    void updateEntity(GenreRequest request, @MappingTarget Genre genre);
}