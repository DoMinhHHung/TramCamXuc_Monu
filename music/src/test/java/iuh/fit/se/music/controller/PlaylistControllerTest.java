package iuh.fit.se.music.controller;

import iuh.fit.se.music.dto.request.PlaylistCreateRequest;
import iuh.fit.se.music.dto.request.PlaylistUpdateRequest;
import iuh.fit.se.music.dto.request.ReorderRequest;
import iuh.fit.se.music.dto.response.PlaylistResponse;
import iuh.fit.se.music.service.PlaylistService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PlaylistControllerTest {
    @Mock PlaylistService playlistService;
    @InjectMocks PlaylistController playlistController;

    @Test void getBySlug_shouldReturnPlaylist() {
        PlaylistResponse p = PlaylistResponse.builder().slug("slug").build();
        when(playlistService.getBySlug("slug")).thenReturn(p);
        assertEquals(p, playlistController.getBySlug("slug").getResult());
    }

    @Test void getMyPlaylists_shouldReturnPage() {
        Pageable pageable = PageRequest.of(1, 5, Sort.by("createdAt").descending());
        Page<PlaylistResponse> page = new PageImpl<>(List.of(), pageable, 0);
        when(playlistService.getMyPlaylists(pageable)).thenReturn(page);
        assertEquals(page, playlistController.getMyPlaylists(2, 5).getResult());
    }

    @Test void createPlaylist_shouldReturnCreated() {
        PlaylistCreateRequest request = PlaylistCreateRequest.builder().build();
        PlaylistResponse p = PlaylistResponse.builder().build();
        when(playlistService.createPlaylist(request)).thenReturn(p);
        assertEquals(p, playlistController.createPlaylist(request).getResult());
    }

    @Test void updatePlaylist_shouldReturnUpdated() {
        UUID id = UUID.randomUUID(); PlaylistUpdateRequest request = PlaylistUpdateRequest.builder().build();
        PlaylistResponse p = PlaylistResponse.builder().id(id).build();
        when(playlistService.updatePlaylist(id, request)).thenReturn(p);
        assertEquals(p, playlistController.updatePlaylist(id, request).getResult());
    }

    @Test void deletePlaylist_shouldCallService() {
        UUID id = UUID.randomUUID();
        assertEquals("Playlist deleted.", playlistController.deletePlaylist(id).getMessage());
        verify(playlistService).deletePlaylist(id);
    }

    @Test void uploadCover_shouldReturnPlaylist() {
        UUID id = UUID.randomUUID(); MultipartFile file = mock(MultipartFile.class);
        PlaylistResponse p = PlaylistResponse.builder().id(id).build();
        when(playlistService.uploadCover(id, file)).thenReturn(p);
        assertEquals(p, playlistController.uploadCover(id, file).getResult());
    }

    @Test void addSong_shouldReturnPlaylist() {
        UUID pid = UUID.randomUUID(); UUID sid = UUID.randomUUID();
        PlaylistResponse p = PlaylistResponse.builder().id(pid).build();
        when(playlistService.addSong(pid, sid)).thenReturn(p);
        assertEquals(p, playlistController.addSong(pid, sid).getResult());
    }

    @Test void removeSong_shouldCallService() {
        UUID pid = UUID.randomUUID(); UUID sid = UUID.randomUUID();
        assertEquals("Song removed.", playlistController.removeSong(pid, sid).getMessage());
        verify(playlistService).removeSong(pid, sid);
    }

    @Test void reorder_shouldReturnPlaylist() {
        UUID pid = UUID.randomUUID(); ReorderRequest request = ReorderRequest.builder().build();
        PlaylistResponse p = PlaylistResponse.builder().id(pid).build();
        when(playlistService.reorder(pid, request)).thenReturn(p);
        assertEquals(p, playlistController.reorder(pid, request).getResult());
    }
}
