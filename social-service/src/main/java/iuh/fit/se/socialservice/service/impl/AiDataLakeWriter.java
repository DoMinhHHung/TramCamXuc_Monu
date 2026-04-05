package iuh.fit.se.socialservice.service.impl;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiDataLakeWriter {

    private final MinioClient minioClient;

    @Value("${minio.bucket.ai-training-data}")
    private String aiTrainingBucket;

    public void uploadJsonl(String objectKey, String payload) {
        try {
            ensureBucket();
            byte[] bytes = payload.getBytes(StandardCharsets.UTF_8);
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(aiTrainingBucket)
                            .object(objectKey)
                            .stream(new ByteArrayInputStream(bytes), bytes.length, -1)
                            .contentType("application/x-ndjson")
                            .build()
            );
            log.info("Uploaded AI training batch to {}/{} ({} bytes)", aiTrainingBucket, objectKey, bytes.length);
        } catch (Exception e) {
            throw new RuntimeException("Failed uploading AI training data", e);
        }
    }

    private void ensureBucket() throws Exception {
        boolean exists = minioClient.bucketExists(
                BucketExistsArgs.builder().bucket(aiTrainingBucket).build()
        );
        if (!exists) {
            minioClient.makeBucket(
                    MakeBucketArgs.builder().bucket(aiTrainingBucket).build()
            );
            log.info("Created bucket {}", aiTrainingBucket);
        }
    }
}
