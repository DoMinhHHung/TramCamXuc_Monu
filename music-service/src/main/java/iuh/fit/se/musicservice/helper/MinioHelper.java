package iuh.fit.se.musicservice.helper;

import io.minio.MinioClient;
import io.minio.RemoveObjectArgs;
import io.minio.RemoveObjectsArgs;
import io.minio.Result;
import io.minio.messages.DeleteError;
import io.minio.messages.DeleteObject;
import io.minio.messages.Item;
import io.minio.ListObjectsArgs;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class MinioHelper {

    private final MinioClient minioClient;

    @Value("${minio.bucket.raw-songs}")
    private String rawSongsBucket;

    @Value("${minio.bucket.public-songs}")
    private String publicSongsBucket;

    public void deleteRawSongObject(String objectKey) throws Exception {
        if (objectKey == null || objectKey.isBlank()) {
            return;
        }
        minioClient.removeObject(
                RemoveObjectArgs.builder().bucket(rawSongsBucket).object(objectKey).build()
        );
    }

    public void deletePublicObjectByUrl(String objectUrl) throws Exception {
        String objectKey = extractObjectKey(objectUrl, publicSongsBucket);
        if (objectKey == null || objectKey.isBlank()) {
            return;
        }
        minioClient.removeObject(
                RemoveObjectArgs.builder().bucket(publicSongsBucket).object(objectKey).build()
        );
    }

    public void deletePublicFolderByPrefix(String folderPrefix) throws Exception {
        if (folderPrefix == null || folderPrefix.isBlank()) {
            return;
        }

        List<DeleteObject> objectsToDelete = new ArrayList<>();
        Iterable<Result<Item>> results = minioClient.listObjects(
                ListObjectsArgs.builder().bucket(publicSongsBucket).prefix(folderPrefix).recursive(true).build()
        );

        for (Result<Item> result : results) {
            Item item = result.get();
            objectsToDelete.add(new DeleteObject(item.objectName()));
        }

        if (objectsToDelete.isEmpty()) {
            return;
        }

        Iterable<Result<DeleteError>> errors = minioClient.removeObjects(
                RemoveObjectsArgs.builder().bucket(publicSongsBucket).objects(objectsToDelete).build()
        );

        for (Result<DeleteError> errorResult : errors) {
            DeleteError error = errorResult.get();
            throw new IllegalStateException("Delete MinIO object failed: " + error.objectName());
        }
    }

    public String extractHlsFolderPrefix(String hlsMasterUrl) {
        String objectKey = extractObjectKey(hlsMasterUrl, publicSongsBucket);
        if (objectKey == null || objectKey.isBlank()) {
            return null;
        }

        int lastSlash = objectKey.lastIndexOf('/');
        if (lastSlash < 0) {
            return null;
        }
        return objectKey.substring(0, lastSlash + 1);
    }

    private String extractObjectKey(String objectUrl, String bucketName) {
        if (objectUrl == null || objectUrl.isBlank()) {
            return null;
        }

        URI uri = URI.create(objectUrl);
        String path = uri.getPath();
        if (path == null || path.isBlank()) {
            return null;
        }

        String bucketPrefix = "/" + bucketName + "/";
        int bucketIndex = path.indexOf(bucketPrefix);
        if (bucketIndex >= 0) {
            return path.substring(bucketIndex + bucketPrefix.length());
        }

        return path.startsWith("/") ? path.substring(1) : path;
    }
}
