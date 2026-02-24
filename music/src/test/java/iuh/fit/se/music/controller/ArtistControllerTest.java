package iuh.fit.se.music.controller;

import iuh.fit.se.music.dto.request.ArtistRegisterRequest;
import iuh.fit.se.music.dto.request.ArtistUpdateRequest;
import iuh.fit.se.music.dto.response.ArtistResponse;
import iuh.fit.se.music.dto.response.SongResponse;
import iuh.fit.se.music.enums.ArtistStatus;
import iuh.fit.se.music.service.ArtistService;
import iuh.fit.se.music.service.SongService;
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
class ArtistControllerTest {
    @Mock ArtistService artistService;
    @Mock SongService songService;
    @InjectMocks ArtistController artistController;

    @Test void registerArtist(){ ArtistRegisterRequest r=ArtistRegisterRequest.builder().build(); ArtistResponse a=ArtistResponse.builder().stageName("s").build(); when(artistService.registerArtist(r)).thenReturn(a); assertEquals(a, artistController.registerArtist(r).getResult()); }
    @Test void getMyProfile(){ ArtistResponse a=ArtistResponse.builder().build(); when(artistService.getMyProfile()).thenReturn(a); assertEquals(a, artistController.getMyProfile().getResult()); }
    @Test void updateProfile(){ ArtistUpdateRequest r=ArtistUpdateRequest.builder().build(); ArtistResponse a=ArtistResponse.builder().build(); when(artistService.updateProfile(r)).thenReturn(a); assertEquals(a, artistController.updateProfile(r).getResult()); }
    @Test void uploadAvatar(){ MultipartFile f=mock(MultipartFile.class); ArtistResponse a=ArtistResponse.builder().build(); when(artistService.uploadAvatar(f)).thenReturn(a); assertEquals(a, artistController.uploadAvatar(f).getResult()); }
    @Test void getArtistByUserId(){ UUID id=UUID.randomUUID(); ArtistResponse a=ArtistResponse.builder().id(id).build(); when(artistService.getProfileByUserId(id)).thenReturn(a); assertEquals(a, artistController.getArtistByUserId(id).getResult()); }
    @Test void getSongsByArtist(){ UUID id=UUID.randomUUID(); Pageable p=PageRequest.of(1,5,Sort.by("createdAt").descending()); Page<SongResponse> page=new PageImpl<>(List.of(),p,0); when(songService.getSongsByArtist(id,p)).thenReturn(page); assertEquals(page, artistController.getSongsByArtist(id,2,5).getResult()); }
    @Test void getArtistsForAdmin(){ Pageable p=PageRequest.of(0,10,Sort.by("createdAt").descending()); Page<ArtistResponse> page=new PageImpl<>(List.of(),p,0); when(artistService.getArtistsForAdmin("st", ArtistStatus.ACTIVE,p)).thenReturn(page); assertEquals(page, artistController.getArtistsForAdmin("st", ArtistStatus.ACTIVE,1,10).getResult()); }
    @Test void toggleArtistStatus(){ UUID id=UUID.randomUUID(); assertEquals("Artist status updated successfully", artistController.toggleArtistStatus(id, ArtistStatus.SUSPENDED).getMessage()); verify(artistService).toggleArtistStatus(id, ArtistStatus.SUSPENDED); }
}
