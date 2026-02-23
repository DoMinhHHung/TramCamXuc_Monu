package iuh.fit.se.transcoder.service;

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

    public void downloadRawFile(String rawFileKey, String localFilePath) throws Exception {
        log.info("Downloading raw file {} from MinIO...", rawFileKey);
        try (InputStream stream = minioClient.getObject(
                GetObjectArgs.builder()
                        .bucket(rawBucket)
                        .object(rawFileKey)
                        .build())) {
            File targetFile = new File(localFilePath);
            targetFile.getParentFile().mkdirs();
            Files.copy(stream, targetFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
            log.info("Downloaded successfully to {}", localFilePath);
        }
    }

    public void uploadHlsDirectory(String localDirPath, String minioTargetPrefix) throws Exception {
        File dir = new File(localDirPath);
        if (!dir.exists() || !dir.isDirectory()) return;

        File[] files = dir.listFiles();
        if (files == null) return;

        for (File file : files) {
            String objectKey = minioTargetPrefix + "/" + file.getName();
            String contentType = file.getName().endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : "video/MP2T";

            try (InputStream is = new FileInputStream(file)) {
                minioClient.putObject(
                        PutObjectArgs.builder()
                                .bucket(publicBucket)
                                .object(objectKey)
                                .stream(is, file.length(), -1)
                                .contentType(contentType)
                                .build()
                );
                log.debug("Uploaded HLS segment/playlist: {}", objectKey);
            }
        }
        log.info("Uploaded entire HLS directory to MinIO prefix: {}", minioTargetPrefix);
    }
}