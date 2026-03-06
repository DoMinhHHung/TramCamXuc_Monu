package iuh.fit.se.musicservice.service.impl;

import io.minio.*;
import io.minio.http.Method;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
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

    // ──────────────────────────────────────────────────────────────────────────
    // PRESIGNED URLS
    // ──────────────────────────────────────────────────────────────────────────

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

    // ──────────────────────────────────────────────────────────────────────────
    // PUBLIC URL (HLS / CDN)
    // ──────────────────────────────────────────────────────────────────────────

    public String getPublicUrl(String objectKey) {
        return String.format("%s/%s/%s", publicUrl, publicBucket, objectKey);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // UPLOAD — MultipartFile (playlist covers, thumbnails, etc.)
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

    // ──────────────────────────────────────────────────────────────────────────
    // UPLOAD — Raw bytes (Jamendo import worker, no local disk I/O)
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Uploads a pre-buffered {@code byte[]} directly to the <b>raw-songs</b> bucket.
     *
     * <p>Designed for the {@code JamendoDownloadWorker} which downloads the MP3
     * into a byte array via {@code RestTemplate.getForObject(..., byte[].class)}
     * and then hands it straight to this method — eliminating any local disk
     * write and avoiding disk-space issues in containerised environments.</p>
     *
     * <h3>Why byte[] and not InputStream?</h3>
     * <p>RestTemplate's {@code getForObject} already buffers the response body.
     * Wrapping it in a {@code ByteArrayInputStream} is zero-copy and avoids a
     * second read pass.  For very large files (>200 MB) consider switching to a
     * streaming download, but Jamendo tracks are typically 3–15 MB so this is fine.</p>
     *
     * @param objectKey   Target path inside raw-songs bucket, e.g.
     *                    {@code "raw/jamendo/<trackId>.mp3"}.
     * @param data        Raw audio bytes downloaded from Jamendo CDN.
     * @param contentType MIME type, typically {@code "audio/mpeg"}.
     * @throws RuntimeException wrapping the underlying MinIO SDK exception if
     *                          the upload fails (caller should NACK the message).
     */
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
                            .stream(is, data.length, -1)   // size known → no multipart chunking
                            .contentType(contentType)
                            .build());
        } catch (Exception e) {
            log.error("Failed to upload raw bytes to MinIO. key={}, size={}", objectKey, data.length, e);
            throw new RuntimeException("MinIO uploadRawBytes failed: " + objectKey, e);
        }

        log.info("Successfully uploaded raw bytes to MinIO. key={}", objectKey);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // BUCKET EXISTENCE CHECK (utility / health-check)
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Returns {@code true} if the raw-songs bucket exists and is accessible.
     * Useful for actuator health checks or startup validation.
     */
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