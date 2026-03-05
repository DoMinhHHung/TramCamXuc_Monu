package iuh.fit.se.musicservice.service.impl;

import io.minio.*;
import io.minio.http.Method;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class MinioStorageService {

    private final MinioClient minioClient;

    @Value("${minio.bucket.raw-songs}")
    private String rawBucket;

    @Value("${minio.bucket.public-songs}")
    private String publicBucket;

    @Value("${minio.public-url}")
    private String publicUrl;

    /** Tạo presigned PUT URL để artist upload file thẳng lên MinIO (15 phút) */
    public String generatePresignedUploadUrl(String objectKey) {
        try {
            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.PUT)
                            .bucket(rawBucket)
                            .object(objectKey)
                            .expiry(15, TimeUnit.MINUTES)
                            .build());
        } catch (Exception e) {
            log.error("Cannot generate presigned upload URL for key: {}", objectKey, e);
            throw new RuntimeException("Storage service error", e);
        }
    }

    /** Tạo presigned GET URL để download (5 phút) */
    public String generatePresignedDownloadUrl(String objectKey, String fileName) {
        try {
            Map<String, String> extraHeaders = new HashMap<>();
            extraHeaders.put("response-content-disposition",
                    "attachment; filename=\"" + fileName + "\"");

            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(rawBucket)
                            .object(objectKey)
                            .expiry(5, TimeUnit.MINUTES)
                            .extraQueryParams(extraHeaders)
                            .build());
        } catch (Exception e) {
            log.error("Cannot generate presigned download URL for key: {}", objectKey, e);
            throw new RuntimeException("Storage service error", e);
        }
    }

    public String getPublicUrl(String objectKey) {
        return String.format("%s/%s/%s", publicUrl, publicBucket, objectKey);
    }

    public String uploadPublicFile(String objectKey, MultipartFile file) {
        try (InputStream is = file.getInputStream()) {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(publicBucket)
                            .object(objectKey)
                            .stream(is, file.getSize(), -1)
                            .contentType(file.getContentType())
                            .build());
            return getPublicUrl(objectKey);
        } catch (Exception e) {
            log.error("Cannot upload public file: {}", objectKey, e);
            throw new RuntimeException("Storage service error", e);
        }
    }
}