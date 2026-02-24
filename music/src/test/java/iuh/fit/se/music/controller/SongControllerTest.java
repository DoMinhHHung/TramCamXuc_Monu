package iuh.fit.se.music.controller;

import iuh.fit.se.core.dto.ApiResponse;
import iuh.fit.se.music.dto.request.SongCreateRequest;
import iuh.fit.se.music.dto.request.SongUpdateRequest;
import iuh.fit.se.music.dto.response.SongResponse;
import iuh.fit.se.music.service.SongService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SongControllerTest {
    @Mock SongService songService;
    @InjectMocks SongController songController;

    @Test void searchSongs_shouldReturnPagedResult() {
        Pageable pageable = PageRequest.of(1, 20, Sort.by("createdAt").descending());
        Page<SongResponse> page = new PageImpl<>(List.of(SongResponse.builder().title("A").build()), pageable, 1);
        UUID genreId = UUID.randomUUID(); UUID artistId = UUID.randomUUID();
        when(songService.searchSongs("key", genreId, artistId, pageable)).thenReturn(page);
        assertEquals(page, songController.searchSongs("key", genreId, artistId, 2, 20).getResult());
    }

    @Test void getTrending_shouldReturnResult() {
        Page<SongResponse> page = new PageImpl<>(List.of());
        when(songService.getTrending(PageRequest.of(0, 10))).thenReturn(page);
        assertEquals(page, songController.getTrending(1, 10).getResult());
    }

    @Test void getNewest_shouldReturnResult() {
        Page<SongResponse> page = new PageImpl<>(List.of());
        when(songService.getNewest(PageRequest.of(0, 10))).thenReturn(page);
        assertEquals(page, songController.getNewest(1, 10).getResult());
    }

    @Test void getSongById_shouldReturnSong() {
        UUID id = UUID.randomUUID(); SongResponse song = SongResponse.builder().id(id).build();
        when(songService.getSongById(id)).thenReturn(song);
        assertEquals(song, songController.getSongById(id).getResult());
    }

    @Test void recordPlay_shouldCallService() {
        UUID id = UUID.randomUUID(); ApiResponse<Void> response = songController.recordPlay(id);
        assertEquals("Play recorded.", response.getMessage()); verify(songService).recordPlay(id);
    }

    @Test void getStreamUrl_shouldReturnUrl() {
        UUID id = UUID.randomUUID(); when(songService.getStreamUrl(id)).thenReturn("stream");
        assertEquals("stream", songController.getStreamUrl(id).getResult());
    }

    @Test void getDownloadUrl_shouldReturnUrlWithMessage() {
        UUID id = UUID.randomUUID(); when(songService.getDownloadUrl(id)).thenReturn("download");
        ApiResponse<String> response = songController.getDownloadUrl(id);
        assertEquals("download", response.getResult());
        assertEquals("Link tải nhạc sống trong 5 phút.", response.getMessage());
    }

    @Test void getMySongs_shouldReturnPage() {
        Pageable pageable = PageRequest.of(0, 20, Sort.by("createdAt").descending());
        Page<SongResponse> page = new PageImpl<>(List.of());
        when(songService.getMySONGs(pageable)).thenReturn(page);
        assertEquals(page, songController.getMySongs(1, 20).getResult());
    }

    @Test void requestUploadUrl_shouldReturnSong() {
        SongCreateRequest request = SongCreateRequest.builder().build();
        SongResponse song = SongResponse.builder().build();
        when(songService.requestUploadUrl(request)).thenReturn(song);
        assertEquals(song, songController.requestUploadUrl(request).getResult());
    }

    @Test void confirmUpload_shouldCallService() {
        UUID id = UUID.randomUUID();
        assertEquals("Upload confirmed. Transcoding started.", songController.confirmUpload(id).getMessage());
        verify(songService).confirmUpload(id);
    }

    @Test void updateSong_shouldReturnUpdatedSong() {
        UUID id = UUID.randomUUID(); SongUpdateRequest request = SongUpdateRequest.builder().build();
        SongResponse updated = SongResponse.builder().id(id).build();
        when(songService.updateSong(id, request)).thenReturn(updated);
        assertEquals(updated, songController.updateSong(id, request).getResult());
    }

    @Test void deleteSong_shouldCallService() {
        UUID id = UUID.randomUUID();
        assertEquals("Song deleted successfully.", songController.deleteSong(id).getMessage());
        verify(songService).deleteSong(id);
    }

    @Test void submitSong_shouldReturnSong() {
        UUID id = UUID.randomUUID(); SongResponse song = SongResponse.builder().id(id).build();
        when(songService.submitSong(id)).thenReturn(song);
        ApiResponse<SongResponse> response = songController.submitSong(id);
        assertEquals(song, response.getResult());
        assertEquals("Song submitted for review.", response.getMessage());
    }
}
