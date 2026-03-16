package iuh.fit.se.musicservice.config;

import io.minio.MinioClient;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class MinioConfig {

    @Value("${minio.url}")
    private String minioUrl;            // http://localhost:9000 — internal

    @Value("${minio.public-url}")
    private String publicUrl;           // https://minio.oopsgolden.id.vn — external

    @Value("${minio.access-key}")
    private String accessKey;

    @Value("${minio.secret-key}")
    private String secretKey;

    /**
     * Client dùng INTERNAL URL — cho backend operations:
     * uploadRawBytes, uploadPublicFile, downloadRawFile, v.v.
     * Nhanh hơn vì không đi qua internet.
     */
    @Bean
    @Primary
    public MinioClient minioClient() {
        return MinioClient.builder()
                .endpoint(minioUrl)
                .credentials(accessKey, secretKey)
                .build();
    }

    /**
     * Client dùng PUBLIC URL — CHỈ cho sinh presigned URLs trả về mobile client.
     * Signature được ký với Host: minio.oopsgolden.id.vn → hợp lệ khi mobile PUT.
     */
    @Bean("presignedMinioClient")
    public MinioClient presignedMinioClient() {
        return MinioClient.builder()
                .endpoint(publicUrl)
                .credentials(accessKey, secretKey)
                .build();
    }
}