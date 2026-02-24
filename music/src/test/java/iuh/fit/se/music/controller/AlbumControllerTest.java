package iuh.fit.se.music.controller;

import iuh.fit.se.core.dto.ApiResponse;
import iuh.fit.se.music.dto.request.AlbumCreateRequest;
import iuh.fit.se.music.dto.request.AlbumUpdateRequest;
import iuh.fit.se.music.dto.response.AlbumResponse;
import iuh.fit.se.music.service.AlbumService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AlbumControllerTest {
    @Mock AlbumService albumService;
    @InjectMocks AlbumController albumController;

    @Test void getPublicAlbum(){ UUID id=UUID.randomUUID(); AlbumResponse a=AlbumResponse.builder().id(id).build(); when(albumService.getPublicAlbum(id)).thenReturn(a); assertEquals(a, albumController.getPublicAlbum(id).getResult()); }
    @Test void getByArtist(){ UUID id=UUID.randomUUID(); Pageable p=PageRequest.of(1,5,Sort.by("createdAt").descending()); Page<AlbumResponse> page=new PageImpl<>(List.of(),p,0); when(albumService.getPublicAlbumsByArtist(id,p)).thenReturn(page); assertEquals(page, albumController.getByArtist(id,2,5).getResult()); }
    @Test void getMyAlbums(){ Pageable p=PageRequest.of(0,5,Sort.by("createdAt").descending()); Page<AlbumResponse> page=new PageImpl<>(List.of(),p,0); when(albumService.getMyAlbums(p)).thenReturn(page); assertEquals(page, albumController.getMyAlbums(1,5).getResult()); }
    @Test void getMyAlbumDetail(){ UUID id=UUID.randomUUID(); AlbumResponse a=AlbumResponse.builder().id(id).build(); when(albumService.getMyAlbumDetail(id)).thenReturn(a); assertEquals(a, albumController.getMyAlbumDetail(id).getResult()); }
    @Test void createAlbum(){ AlbumCreateRequest r=AlbumCreateRequest.builder().build(); AlbumResponse a=AlbumResponse.builder().build(); when(albumService.createAlbum(r)).thenReturn(a); assertEquals(a, albumController.createAlbum(r).getResult()); }
    @Test void updateAlbum(){ UUID id=UUID.randomUUID(); AlbumUpdateRequest r=AlbumUpdateRequest.builder().build(); AlbumResponse a=AlbumResponse.builder().id(id).build(); when(albumService.updateAlbum(id,r)).thenReturn(a); assertEquals(a, albumController.updateAlbum(id,r).getResult()); }
    @Test void uploadCover(){ UUID id=UUID.randomUUID(); MultipartFile f=mock(MultipartFile.class); AlbumResponse a=AlbumResponse.builder().id(id).build(); when(albumService.uploadCover(id,f)).thenReturn(a); assertEquals(a, albumController.uploadCover(id,f).getResult()); }
    @Test void deleteAlbum(){ UUID id=UUID.randomUUID(); ApiResponse<Void> resp=albumController.deleteAlbum(id); assertEquals("Album deleted.", resp.getMessage()); verify(albumService).deleteAlbum(id); }
    @Test void addSong(){ UUID aid=UUID.randomUUID(); UUID sid=UUID.randomUUID(); AlbumResponse a=AlbumResponse.builder().id(aid).build(); when(albumService.addSong(aid,sid)).thenReturn(a); assertEquals(a, albumController.addSong(aid,sid).getResult()); }
    @Test void removeSong(){ UUID aid=UUID.randomUUID(); UUID sid=UUID.randomUUID(); assertEquals("Song removed.", albumController.removeSong(aid,sid).getMessage()); verify(albumService).removeSong(aid,sid); }
    @Test void reorderSong(){ UUID aid=UUID.randomUUID(); UUID asid=UUID.randomUUID(); AlbumResponse a=AlbumResponse.builder().id(aid).build(); when(albumService.reorderSong(aid,asid,3)).thenReturn(a); assertEquals(a, albumController.reorderSong(aid,asid,3).getResult()); }
    @Test void submitForReview(){ UUID id=UUID.randomUUID(); AlbumResponse a=AlbumResponse.builder().id(id).build(); when(albumService.submitForReview(id)).thenReturn(a); ApiResponse<AlbumResponse> resp=albumController.submitForReview(id); assertEquals(a, resp.getResult()); assertEquals("Album submitted for review.", resp.getMessage()); }
    @Test void publishAlbum(){ UUID id=UUID.randomUUID(); AlbumResponse a=AlbumResponse.builder().id(id).build(); when(albumService.publishAlbum(id)).thenReturn(a); ApiResponse<AlbumResponse> resp=albumController.publishAlbum(id); assertEquals(a, resp.getResult()); assertEquals("Album is now public.", resp.getMessage()); }
    @Test void schedulePublish(){ UUID id=UUID.randomUUID(); ZonedDateTime t=ZonedDateTime.now(); AlbumResponse a=AlbumResponse.builder().id(id).build(); when(albumService.schedulePublish(id,t)).thenReturn(a); ApiResponse<AlbumResponse> resp=albumController.schedulePublish(id,t); assertEquals(a, resp.getResult()); }
    @Test void cancelSchedule(){ UUID id=UUID.randomUUID(); AlbumResponse a=AlbumResponse.builder().id(id).build(); when(albumService.cancelSchedule(id)).thenReturn(a); ApiResponse<AlbumResponse> resp=albumController.cancelSchedule(id); assertEquals(a, resp.getResult()); assertEquals("Schedule cancelled.", resp.getMessage()); }
}
