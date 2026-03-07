package iuh.fit.se.musicservice.service.impl;

import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.errors.MinioException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MinioStorageServiceTest {

    @Mock
    private MinioClient minioClient;

    @InjectMocks
    private MinioStorageService storageService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(storageService, "rawBucket", "raw-bucket");
        ReflectionTestUtils.setField(storageService, "publicBucket", "public-bucket");
        ReflectionTestUtils.setField(storageService, "publicUrl", "http://localhost:9000");
    }

    @Test
    void uploadRawBytes_shouldPutObjectWithExpectedBucketAndContentType() throws Exception {
        byte[] data = "mock-audio".getBytes();

        storageService.uploadRawBytes("raw/jamendo/abc.mp3", data, "audio/mpeg");

        ArgumentCaptor<PutObjectArgs> argsCaptor = ArgumentCaptor.forClass(PutObjectArgs.class);
        verify(minioClient).putObject(argsCaptor.capture());

        PutObjectArgs args = argsCaptor.getValue();
        assertThat(args.bucket()).isEqualTo("raw-bucket");
        assertThat(args.object()).isEqualTo("raw/jamendo/abc.mp3");
        assertThat(args.contentType()).isEqualTo("audio/mpeg");
    }

    @Test
    void uploadRawBytes_whenMinioThrows_shouldWrapAndRethrowRuntimeException() throws Exception {
        byte[] data = "mock-audio".getBytes();
        doThrow(new MinioException("MinIO down")).when(minioClient).putObject(any(PutObjectArgs.class));

        assertThatThrownBy(() -> storageService.uploadRawBytes("raw/jamendo/abc.mp3", data, "audio/mpeg"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("MinIO uploadRawBytes failed");
    }
}
