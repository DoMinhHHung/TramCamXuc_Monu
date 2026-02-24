package iuh.fit.se.music.controller;

import iuh.fit.se.music.dto.request.SongApprovalRequest;
import iuh.fit.se.music.dto.response.SongResponse;
import iuh.fit.se.music.enums.ApprovalStatus;
import iuh.fit.se.music.service.SongService;
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
class AdminSongControllerTest {
    @Mock SongService songService;
    @InjectMocks AdminSongController adminSongController;

    @AfterEach void clearContext(){ SecurityContextHolder.clearContext(); }

    @Test void getQueue_shouldReturnPage(){ Pageable p=PageRequest.of(1,12,Sort.by("createdAt").descending()); Page<SongResponse> page=new PageImpl<>(List.of(),p,0); when(songService.getAdminQueue(ApprovalStatus.APPROVED,"key",p)).thenReturn(page); assertEquals(page, adminSongController.getQueue(ApprovalStatus.APPROVED,"key",2,12).getResult()); }

    @Test void approveSong_shouldUseAdminFromSecurityContext(){ UUID songId=UUID.randomUUID(); UUID adminId=UUID.randomUUID(); SecurityContextHolder.getContext().setAuthentication(new TestingAuthenticationToken(adminId.toString(), null)); SongResponse resp=SongResponse.builder().id(songId).build(); when(songService.approveSong(songId, adminId)).thenReturn(resp); assertEquals(resp, adminSongController.approveSong(songId).getResult()); verify(songService).approveSong(songId, adminId); }

    @Test void rejectSong_shouldUseAdminFromSecurityContext(){ UUID songId=UUID.randomUUID(); UUID adminId=UUID.randomUUID(); SecurityContextHolder.getContext().setAuthentication(new TestingAuthenticationToken(adminId.toString(), null)); SongApprovalRequest req=SongApprovalRequest.builder().rejectionReason("bad").build(); SongResponse resp=SongResponse.builder().id(songId).build(); when(songService.rejectSong(songId, adminId, req)).thenReturn(resp); assertEquals(resp, adminSongController.rejectSong(songId, req).getResult()); verify(songService).rejectSong(songId, adminId, req); }
}
