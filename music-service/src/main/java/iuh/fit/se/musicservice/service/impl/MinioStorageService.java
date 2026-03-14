package iuh.fit.se.musicservice.service.impl;

import io.minio.*;
import io.minio.http.Method;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class MinioStorageService {

    // Client dùng INTERNAL URL (localhost:9000)
    // → dùng cho mọi backend operation: put, get, exists
    private final MinioClient minioClient;

    // Client dùng PUBLIC URL (https://minio.oopsgolden.id.vn)
    // → CHỈ dùng để sinh presigned URL trả về mobile/client
    // → Signature được ký với Host đúng → mobile PUT thành công
    private final MinioClient presignedMinioClient;

    @Value("${minio.bucket.raw-songs}")
    private String rawBucket;

    @Value("${minio.bucket.public-songs}")
    private String publicBucket;

    @Value("${minio.public-url}")
    private String publicUrl;

    public MinioStorageService(
            MinioClient minioClient,
            @Qualifier("presignedMinioClient") MinioClient presignedMinioClient) {
        this.minioClient          = minioClient;
        this.presignedMinioClient = presignedMinioClient;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PRESIGNED URLS — dùng presignedMinioClient (public URL)
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * PUT presigned URL để artist upload file raw lên MinIO.
     * Ký bằng public client → URL có Host: minio.oopsgolden.id.vn → signature hợp lệ.
     */
    public String generatePresignedUploadUrl(String objectKey) {
        try {
            return presignedMinioClient.getPresignedObjectUrl(
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

    /**
     * GET presigned URL để download file (Premium feature).
     */
    public String generatePresignedDownloadUrl(String objectKey, String fileName) {
        try {
            Map<String, String> extraHeaders = new HashMap<>();
            extraHeaders.put("response-content-disposition",
                    "attachment; filename=\"" + fileName + "\"");

            return presignedMinioClient.getPresignedObjectUrl(
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

    /**
     * GET presigned URL để stream HLS (trả về mobile).
     */
    public String generatePresignedStreamUrl(String objectKey) {
        try {
            return presignedMinioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(publicBucket)
                            .object(objectKey)
                            .expiry(15, TimeUnit.MINUTES)
                            .build());
        } catch (Exception e) {
            log.error("Cannot generate presigned stream URL for key: {}", objectKey, e);
            throw new RuntimeException("Storage service error", e);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PUBLIC URL (HLS direct link)
    // ──────────────────────────────────────────────────────────────────────────

    public String getPublicUrl(String objectKey) {
        return String.format("%s/%s/%s", publicUrl, publicBucket, objectKey);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // BACKEND OPERATIONS — dùng minioClient (internal URL, nhanh hơn)
    // ──────────────────────────────────────────────────────────────────────────

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

    public void uploadRawBytes(String objectKey, byte[] data, String contentType) {
        if (data == null || data.length == 0) {
            throw new IllegalArgumentException(
                    "uploadRawBytes: data must not be null or empty for key=" + objectKey);
        }
        log.info("Uploading {} bytes to raw-songs bucket, key={}", data.length, objectKey);
        try (InputStream is = new ByteArrayInputStream(data)) {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(rawBucket)
                            .object(objectKey)
                            .stream(is, data.length, -1)
                            .contentType(contentType)
                            .build());
        } catch (Exception e) {
            log.error("Failed to upload raw bytes. key={}, size={}", objectKey, data.length, e);
            throw new RuntimeException("MinIO uploadRawBytes failed: " + objectKey, e);
        }
        log.info("Successfully uploaded raw bytes. key={}", objectKey);
    }

    public boolean rawBucketExists() {
        try {
            return minioClient.bucketExists(
                    BucketExistsArgs.builder().bucket(rawBucket).build());
        } catch (Exception e) {
            log.warn("Could not verify raw-songs bucket existence: {}", e.getMessage());
            return false;
        }
    }
}