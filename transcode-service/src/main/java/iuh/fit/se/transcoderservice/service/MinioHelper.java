package iuh.fit.se.transcoderservice.service;

import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;

@Service
@RequiredArgsConstructor
@Slf4j
public class MinioHelper {

    private final MinioClient minioClient;

    @Value("${minio.bucket.raw-songs}")
    private String rawBucket;

    @Value("${minio.bucket.public-songs}")
    private String publicBucket;

    // ────────────────────────────────────────────────────────────────────────
    // DOWNLOAD
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Download file raw từ MinIO về local tmp.
     */
    public void downloadRawFile(String rawFileKey, String localFilePath) throws Exception {
        log.info("Downloading raw file: bucket={} key={}", rawBucket, rawFileKey);
        try (InputStream stream = minioClient.getObject(
                GetObjectArgs.builder()
                        .bucket(rawBucket)
                        .object(rawFileKey)
                        .build())) {

            File target = new File(localFilePath);
            target.getParentFile().mkdirs();
            Files.copy(stream, target.toPath(), StandardCopyOption.REPLACE_EXISTING);
            log.info("Downloaded to {}", localFilePath);
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // UPLOAD
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Upload toàn bộ thư mục HLS output lên MinIO public-songs bucket.
     * Các file .m3u8 → content-type: application/vnd.apple.mpegurl
     * Các file .ts   → content-type: video/MP2T
     */
    public void uploadHlsDirectory(String localDirPath, String minioPrefix) throws Exception {
        File dir = new File(localDirPath);
        if (!dir.exists() || !dir.isDirectory()) {
            log.warn("HLS output directory not found: {}", localDirPath);
            return;
        }

        File[] files = dir.listFiles();
        if (files == null || files.length == 0) {
            log.warn("HLS output directory is empty: {}", localDirPath);
            return;
        }

        for (File file : files) {
            String objectKey  = minioPrefix + "/" + file.getName();
            String contentType = file.getName().endsWith(".m3u8")
                    ? "application/vnd.apple.mpegurl"
                    : "video/MP2T";

            try (InputStream is = new FileInputStream(file)) {
                minioClient.putObject(
                        PutObjectArgs.builder()
                                .bucket(publicBucket)
                                .object(objectKey)
                                .stream(is, file.length(), -1)
                                .contentType(contentType)
                                .build()
                );
                log.debug("Uploaded HLS segment: {}", objectKey);
            }
        }
        log.info("Uploaded HLS directory → MinIO prefix: {}", minioPrefix);
    }

    /**
     * Upload một file đơn lẻ (MP3 320k) lên MinIO raw-songs bucket.
     * Dùng raw bucket vì đây là file download private (cần presigned URL).
     */
    public void uploadDownloadFile(String localFilePath,
                                   String objectKey,
                                   String contentType) throws Exception {
        File file = new File(localFilePath);
        if (!file.exists()) {
            log.warn("Download file not found, skipping upload: {}", localFilePath);
            return;
        }

        try (InputStream is = new FileInputStream(file)) {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(rawBucket)
                            .object(objectKey)
                            .stream(is, file.length(), -1)
                            .contentType(contentType)
                            .build()
            );
            log.info("Uploaded download file → MinIO: {}/{}", rawBucket, objectKey);
        }
    }
}
