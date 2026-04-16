package iuh.fit.se.musicservice.service.impl;

import io.minio.*;
import io.minio.http.Method;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class MinioStorageService {

    private final MinioClient minioClient;

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
     * PUT presigned URL để upload object public (cover/thumbnail).
     */
    public String generatePresignedPublicUploadUrl(String objectKey) {
        try {
            return presignedMinioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.PUT)
                            .bucket(publicBucket)
                            .object(objectKey)
                            .expiry(15, TimeUnit.MINUTES)
                            .build());
        } catch (Exception e) {
            log.error("Cannot generate presigned public upload URL for key: {}", objectKey, e);
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
     * Presigned GET để phát MP3 trên app (inline, TTL dài) — AI preview / raw trước transcode.
     */
    public String generatePresignedPlaybackUrl(String objectKey, String fileName, int expiryMinutes) {
        try {
            Map<String, String> extraHeaders = new HashMap<>();
            extraHeaders.put("response-content-disposition",
                    "inline; filename=\"" + fileName + "\"");

            return presignedMinioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(rawBucket)
                            .object(objectKey)
                            .expiry(Math.max(5, expiryMinutes), TimeUnit.MINUTES)
                            .extraQueryParams(extraHeaders)
                            .build());
        } catch (Exception e) {
            log.error("Cannot generate presigned playback URL for key: {}", objectKey, e);
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

    public void deleteRawObject(String objectKey) {
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(rawBucket)
                            .object(objectKey)
                            .build());
            log.info("Deleted raw object: {}", objectKey);
        } catch (Exception e) {
            log.warn("Failed to delete raw object {}: {}", objectKey, e.getMessage());
        }
    }

    /**
     * Copy trong cùng bucket raw (preview AI → raw bài hát chính thức).
     */
    public void copyRawObject(String sourceKey, String destKey) {
        try {
            minioClient.copyObject(
                    CopyObjectArgs.builder()
                            .bucket(rawBucket)
                            .object(destKey)
                            .source(CopySource.builder().bucket(rawBucket).object(sourceKey).build())
                            .build());
            log.info("Copied raw {} → {}", sourceKey, destKey);
        } catch (Exception e) {
            log.error("copyRawObject failed {} → {}", sourceKey, destKey, e);
            throw new RuntimeException("MinIO copy failed", e);
        }
    }

    /**
     * Read raw object từ MinIO thành byte array.
     */
    public byte[] readRawObject(String objectKey) {
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(rawBucket)
                            .object(objectKey)
                            .build())
                    .transferTo(baos);
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Failed to read raw object: {}", objectKey, e);
            throw new RuntimeException("MinIO read failed: " + objectKey, e);
        }
    }

    public byte[] readPublicObject(String objectKey) {
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(publicBucket)
                            .object(objectKey)
                            .build())
                    .transferTo(baos);
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Failed to read public object: {}", objectKey, e);
            throw new RuntimeException("MinIO read public failed: " + objectKey, e);
        }
    }

    /**
     * Check xem object có tồn tại trong raw bucket không.
     */
    public boolean objectExists(String objectKey) {
        try {
            minioClient.statObject(
                    StatObjectArgs.builder()
                            .bucket(rawBucket)
                            .object(objectKey)
                            .build());
            return true;
        } catch (Exception e) {
            log.debug("Object does not exist: {}", objectKey);
            return false;
        }
    }

    /**
     * Upload bytes vào public bucket (dùng cho cover, thumbnail — client cần download trực tiếp).
     */
    public void uploadPublicBytes(String objectKey, byte[] data, String contentType) {
        if (data == null || data.length == 0) {
            throw new IllegalArgumentException("uploadPublicBytes: data is empty for key=" + objectKey);
        }
        log.info("Uploading {} bytes to public-songs bucket, key={}", data.length, objectKey);
        try (InputStream is = new ByteArrayInputStream(data)) {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(publicBucket)
                            .object(objectKey)
                            .stream(is, data.length, -1)
                            .contentType(contentType)
                            .build());
        } catch (Exception e) {
            log.error("Failed to upload public bytes. key={}, size={}", objectKey, data.length, e);
            throw new RuntimeException("MinIO uploadPublicBytes failed: " + objectKey, e);
        }
        log.info("Successfully uploaded public bytes. key={}", objectKey);
    }

    /**
     * Check xem object có tồn tại trong public bucket không.
     */
    public boolean publicObjectExists(String objectKey) {
        try {
            minioClient.statObject(
                    StatObjectArgs.builder()
                            .bucket(publicBucket)
                            .object(objectKey)
                            .build());
            return true;
        } catch (Exception e) {
            log.debug("Object does not exist in public bucket: {}", objectKey);
            return false;
        }
    }
}
