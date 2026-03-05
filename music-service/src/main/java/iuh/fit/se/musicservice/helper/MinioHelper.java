package iuh.fit.se.musicservice.helper;

import io.minio.*;
import io.minio.messages.DeleteError;
import io.minio.messages.DeleteObject;
import io.minio.messages.Item;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Helper class for MinIO storage operations.
 * Provides methods for uploading, downloading, and deleting files.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MinioHelper {

    private final MinioClient minioClient;

    @Value("${minio.bucket.raw-songs}")
    private String rawSongsBucket;

    @Value("${minio.bucket.public-songs}")
    private String publicSongsBucket;

    /**
     * Generate a presigned URL for uploading a file
     */
    public String generatePresignedUploadUrl(String objectKey) {
        try {
            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(io.minio.http.Method.PUT)
                            .bucket(rawSongsBucket)
                            .object(objectKey)
                            .expiry(30, TimeUnit.MINUTES)
                            .build()
            );
        } catch (Exception e) {
            log.error("Failed to generate presigned upload URL for {}: {}", objectKey, e.getMessage());
            throw new RuntimeException("Failed to generate upload URL", e);
        }
    }

    /**
     * Generate a presigned URL for downloading a file
     */
    public String generatePresignedDownloadUrl(String objectKey, String fileName) {
        try {
            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(io.minio.http.Method.GET)
                            .bucket(publicSongsBucket)
                            .object(objectKey)
                            .expiry(1, TimeUnit.HOURS)
                            .extraQueryParams(java.util.Map.of(
                                    "response-content-disposition",
                                    "attachment; filename=\"" + fileName + "\""
                            ))
                            .build()
            );
        } catch (Exception e) {
            log.error("Failed to generate presigned download URL for {}: {}", objectKey, e.getMessage());
            throw new RuntimeException("Failed to generate download URL", e);
        }
    }

    /**
     * Delete a single object from a bucket
     */
    public void deleteObject(String bucket, String objectKey) {
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectKey)
                            .build()
            );
            log.info("Deleted object: {}/{}", bucket, objectKey);
        } catch (Exception e) {
            log.error("Failed to delete object {}/{}: {}", bucket, objectKey, e.getMessage());
            throw new RuntimeException("Failed to delete object", e);
        }
    }

    /**
     * Delete all objects with a given prefix (folder-like deletion)
     */
    public void deleteObjectsWithPrefix(String bucket, String prefix) {
        try {
            // List all objects with the prefix
            Iterable<Result<Item>> results = minioClient.listObjects(
                    ListObjectsArgs.builder()
                            .bucket(bucket)
                            .prefix(prefix)
                            .recursive(true)
                            .build()
            );

            List<DeleteObject> objectsToDelete = new ArrayList<>();
            for (Result<Item> result : results) {
                objectsToDelete.add(new DeleteObject(result.get().objectName()));
            }

            if (objectsToDelete.isEmpty()) {
                log.info("No objects found with prefix {}/{}", bucket, prefix);
                return;
            }

            // Delete all objects
            Iterable<Result<DeleteError>> deleteResults = minioClient.removeObjects(
                    RemoveObjectsArgs.builder()
                            .bucket(bucket)
                            .objects(objectsToDelete)
                            .build()
            );

            // Check for errors
            for (Result<DeleteError> result : deleteResults) {
                DeleteError error = result.get();
                log.error("Failed to delete {}: {}", error.objectName(), error.message());
            }

            log.info("Deleted {} objects with prefix {}/{}", objectsToDelete.size(), bucket, prefix);
        } catch (Exception e) {
            log.error("Failed to delete objects with prefix {}/{}: {}", bucket, prefix, e.getMessage());
            throw new RuntimeException("Failed to delete objects with prefix", e);
        }
    }

    /**
     * Delete all song-related files from MinIO storage.
     * This includes the raw file, cover image, and HLS playlist folder.
     *
     * @param rawFileKey     The key of the raw audio file (e.g., "raw/{artistId}/{songId}.mp3")
     * @param thumbnailUrl   The thumbnail/cover image URL
     * @param hlsFolderKey   The HLS folder key (e.g., "hls/{songId}/")
     */
    public void deleteSongFiles(String rawFileKey, String thumbnailUrl, String hlsFolderKey) {
        // Delete raw audio file
        if (rawFileKey != null && !rawFileKey.isBlank()) {
            try {
                deleteObject(rawSongsBucket, rawFileKey);
            } catch (Exception e) {
                log.error("Failed to delete raw file {}: {}", rawFileKey, e.getMessage());
            }
        }

        // Delete thumbnail/cover image
        if (thumbnailUrl != null && !thumbnailUrl.isBlank()) {
            try {
                // Extract object key from URL
                String thumbnailKey = extractObjectKeyFromUrl(thumbnailUrl);
                if (thumbnailKey != null) {
                    deleteObject(publicSongsBucket, thumbnailKey);
                }
            } catch (Exception e) {
                log.error("Failed to delete thumbnail {}: {}", thumbnailUrl, e.getMessage());
            }
        }

        // Delete HLS folder and all its contents
        if (hlsFolderKey != null && !hlsFolderKey.isBlank()) {
            try {
                deleteObjectsWithPrefix(publicSongsBucket, hlsFolderKey);
            } catch (Exception e) {
                log.error("Failed to delete HLS folder {}: {}", hlsFolderKey, e.getMessage());
            }
        }
    }

    /**
     * Extract object key from a full MinIO URL
     */
    private String extractObjectKeyFromUrl(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }
        // URL format: http://minio-url/bucket/objectKey
        // Find the object key after the bucket name
        try {
            int bucketIndex = url.indexOf(publicSongsBucket);
            if (bucketIndex != -1) {
                return url.substring(bucketIndex + publicSongsBucket.length() + 1);
            }
        } catch (Exception e) {
            log.warn("Could not extract object key from URL: {}", url);
        }
        return null;
    }

    public String getRawSongsBucket() {
        return rawSongsBucket;
    }

    public String getPublicSongsBucket() {
        return publicSongsBucket;
    }
}
