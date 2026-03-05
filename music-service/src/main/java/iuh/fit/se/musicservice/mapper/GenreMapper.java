package iuh.fit.se.musicservice.mapper;

import iuh.fit.se.musicservice.dto.request.GenreRequest;
import iuh.fit.se.musicservice.dto.response.GenreResponse;
import iuh.fit.se.musicservice.entity.Genre;
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