package iuh.fit.se.adsservice.service;

import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface MinioService {

    /**
     * Upload an MP3 file to the ads bucket.
     * Returns the object key (stored in Ad.audioFileKey).
     */
    String uploadAudioFile(MultipartFile file, UUID adId);

    /**
     * Delete an audio file by its object key.
     */
    void deleteAudioFile(String objectKey);

    /**
     * Generate a presigned URL valid for 1 hour.
     */
    String getPresignedUrl(String objectKey);
}
