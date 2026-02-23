package iuh.fit.se.music.service;

import iuh.fit.se.music.dto.request.*;
import iuh.fit.se.music.dto.response.ArtistResponse;
import iuh.fit.se.music.enums.ArtistStatus;
import org.springframework.data.domain.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface ArtistService {
    ArtistResponse registerArtist(ArtistRegisterRequest request);
    ArtistResponse getMyProfile();
    ArtistResponse getProfileByUserId(UUID userId);
    ArtistResponse updateProfile(ArtistUpdateRequest request);
    ArtistResponse uploadAvatar(MultipartFile file);
    void toggleArtistStatus(UUID artistId, ArtistStatus status);
    Page<ArtistResponse> getArtistsForAdmin(String stageName, ArtistStatus status, Pageable pageable);
}
