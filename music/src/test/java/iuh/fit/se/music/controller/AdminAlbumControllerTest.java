package iuh.fit.se.music.controller;

import iuh.fit.se.music.dto.request.AlbumApprovalRequest;
import iuh.fit.se.music.dto.response.AlbumResponse;
import iuh.fit.se.music.enums.AlbumApprovalStatus;
import iuh.fit.se.music.service.AlbumService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminAlbumControllerTest {
    @Mock AlbumService albumService;
    @InjectMocks AdminAlbumController adminAlbumController;

    @AfterEach void clearContext(){ SecurityContextHolder.clearContext(); }

    @Test void getQueue_shouldReturnPage(){ Pageable p=PageRequest.of(1,12,Sort.by("createdAt").descending()); Page<AlbumResponse> page=new PageImpl<>(List.of(),p,0); when(albumService.getAdminQueue(AlbumApprovalStatus.APPROVED,"k",p)).thenReturn(page); assertEquals(page, adminAlbumController.getQueue(AlbumApprovalStatus.APPROVED,"k",2,12).getResult()); }
    @Test void getDetail_shouldReturnAlbum(){ UUID id=UUID.randomUUID(); AlbumResponse resp=AlbumResponse.builder().id(id).build(); when(albumService.getAdminAlbumDetail(id)).thenReturn(resp); assertEquals(resp, adminAlbumController.getDetail(id).getResult()); }
    @Test void approveAlbum_shouldUseAdminFromContext(){ UUID albumId=UUID.randomUUID(); UUID adminId=UUID.randomUUID(); SecurityContextHolder.getContext().setAuthentication(new TestingAuthenticationToken(adminId.toString(), null)); AlbumResponse resp=AlbumResponse.builder().id(albumId).build(); when(albumService.approveAlbum(albumId, adminId)).thenReturn(resp); assertEquals(resp, adminAlbumController.approveAlbum(albumId).getResult()); }
    @Test void rejectAlbum_shouldUseAdminFromContext(){ UUID albumId=UUID.randomUUID(); UUID adminId=UUID.randomUUID(); SecurityContextHolder.getContext().setAuthentication(new TestingAuthenticationToken(adminId.toString(), null)); AlbumApprovalRequest req=AlbumApprovalRequest.builder().rejectionReason("bad").build(); AlbumResponse resp=AlbumResponse.builder().id(albumId).build(); when(albumService.rejectAlbum(albumId, adminId, req)).thenReturn(resp); assertEquals(resp, adminAlbumController.rejectAlbum(albumId, req).getResult()); }
}
