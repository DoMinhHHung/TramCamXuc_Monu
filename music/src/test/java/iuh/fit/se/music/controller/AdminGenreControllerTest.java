package iuh.fit.se.music.controller;

import iuh.fit.se.music.dto.request.GenreRequest;
import iuh.fit.se.music.dto.response.GenreResponse;
import iuh.fit.se.music.service.GenreService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminGenreControllerTest {
    @Mock GenreService genreService;
    @InjectMocks AdminGenreController adminGenreController;

    @Test void createGenre(){ GenreRequest req=GenreRequest.builder().name("Pop").build(); GenreResponse resp=GenreResponse.builder().name("Pop").build(); when(genreService.createGenre(req)).thenReturn(resp); assertEquals(resp, adminGenreController.createGenre(req).getResult()); }
    @Test void updateGenre(){ UUID id=UUID.randomUUID(); GenreRequest req=GenreRequest.builder().name("Rock").build(); GenreResponse resp=GenreResponse.builder().id(id).build(); when(genreService.updateGenre(id, req)).thenReturn(resp); assertEquals(resp, adminGenreController.updateGenre(id, req).getResult()); }
    @Test void deleteGenre(){ UUID id=UUID.randomUUID(); assertEquals("Genre deleted successfully", adminGenreController.deleteGenre(id).getMessage()); verify(genreService).deleteGenre(id); }
}
