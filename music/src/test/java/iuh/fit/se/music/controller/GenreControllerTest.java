package iuh.fit.se.music.controller;

import iuh.fit.se.music.dto.response.GenreResponse;
import iuh.fit.se.music.service.GenreService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GenreControllerTest {
    @Mock GenreService genreService;
    @InjectMocks GenreController genreController;

    @Test void getAllGenres(){ List<GenreResponse> list = List.of(GenreResponse.builder().name("Pop").build()); when(genreService.getAllGenres()).thenReturn(list); assertEquals(list, genreController.getAllGenres().getResult()); }
    @Test void getGenreById(){ UUID id=UUID.randomUUID(); GenreResponse genre=GenreResponse.builder().id(id).build(); when(genreService.getGenreById(id)).thenReturn(genre); assertEquals(genre, genreController.getGenreById(id).getResult()); }
}
