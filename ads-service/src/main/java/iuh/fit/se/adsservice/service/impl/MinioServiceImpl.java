package iuh.fit.se.adsservice.service.impl;

import io.minio.*;
import io.minio.http.Method;
import iuh.fit.se.adsservice.service.MinioService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class MinioServiceImpl implements MinioService {

    private final MinioClient minioClient;

    @Value("${minio.bucket.ads:ads-audio}")
    private String adsBucket;

    @Override
    public String uploadAudioFile(MultipartFile file, UUID adId) {
        try {
            ensureBucketExists();
            String objectKey = "ads/" + adId + "/" + System.currentTimeMillis() + ".mp3";

            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(adsBucket)
                            .object(objectKey)
                            .stream(file.getInputStream(), file.getSize(), -1)
                            .contentType("audio/mpeg")
                            .build()
            );
            log.info("Uploaded ad audio: {}/{}", adsBucket, objectKey);
            return objectKey;
        } catch (Exception e) {
            log.error("Failed to upload ad audio for adId={}", adId, e);
            throw new RuntimeException("MinIO upload failed: " + e.getMessage(), e);
        }
    }

    @Override
    public void deleteAudioFile(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) return;
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(adsBucket)
                            .object(objectKey)
                            .build()
            );
            log.info("Deleted ad audio: {}/{}", adsBucket, objectKey);
        } catch (Exception e) {
            log.warn("Failed to delete ad audio key={}: {}", objectKey, e.getMessage());
        }
    }

    @Override
    public String getPresignedUrl(String objectKey) {
        try {
            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .bucket(adsBucket)
                            .object(objectKey)
                            .method(Method.GET)
                            .expiry(1, TimeUnit.HOURS)
                            .build()
            );
        } catch (Exception e) {
            log.error("Failed to generate presigned URL for key={}", objectKey, e);
            return null;
        }
    }

    private void ensureBucketExists() throws Exception {
        boolean exists = minioClient.bucketExists(
                BucketExistsArgs.builder().bucket(adsBucket).build());
        if (!exists) {
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(adsBucket).build());
            log.info("Created MinIO bucket: {}", adsBucket);
        }
    }
}
