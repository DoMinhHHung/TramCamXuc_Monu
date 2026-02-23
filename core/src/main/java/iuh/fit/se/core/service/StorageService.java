package iuh.fit.se.core.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MinioClient;
import io.minio.http.Method;
import iuh.fit.se.core.exception.AppException;
import iuh.fit.se.core.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class StorageService {
    private final Cloudinary cloudinary;
    private final MinioClient minioClient;

    @Value("${minio.bucket.raw-songs}")
    private String rawSongsBucket;

    public String uploadImage(MultipartFile file, String folderName) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.FILE_NOT_NULL);
        }
        if (!Objects.requireNonNull(file.getContentType()).startsWith("image/")) {
            throw new AppException(ErrorCode.TYPE_FILE_NOT_SUPPORTED);
        }

        try {
            Map params = ObjectUtils.asMap(
                    "folder", folderName,
                    "resource_type", "image"
            );
            Map uploadResult = cloudinary.uploader().upload(file.getBytes(), params);
            return (String) uploadResult.get("secure_url");
        } catch (IOException e) {
            throw new AppException(ErrorCode.STORAGE_SERVICE_ERROR);
        }
    }

    public void deleteImage(String imageUrl) {
        if (imageUrl == null) return;
        try {
            String publicId = extractPublicId(imageUrl);
            if (publicId != null) {
                cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            }
        } catch (IOException e) {
            log.error("Delete image failed");
        }
    }

    private String extractPublicId(String url) {
        try {
            int uploadIndex = url.indexOf("/upload/");
            if (uploadIndex == -1) return null;
            String path = url.substring(uploadIndex + 8);
            int slashIndex = path.indexOf("/");
            if (slashIndex != -1) path = path.substring(slashIndex + 1);
            int dotIndex = path.lastIndexOf(".");
            if (dotIndex != -1) path = path.substring(0, dotIndex);
            return path;
        } catch (Exception e) { return null; }
    }

    public String generatePresignedUploadUrl(String objectName) {
        try {
            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.PUT)
                            .bucket(rawSongsBucket)
                            .object(objectName)
                            .expiry(15, TimeUnit.MINUTES)
                            .build()
            );
        } catch (Exception e) {
            log.error("Lỗi khi đẻ Presigned URL từ MinIO", e);
            throw new AppException(ErrorCode.STORAGE_SERVICE_ERROR);
        }
    }

    public String generatePresignedDownloadUrl(String objectName, String displayFileName) {
        try {
            Map<String, String> reqParams = new java.util.HashMap<>();
            reqParams.put("response-content-disposition", "attachment; filename=\"" + displayFileName + "\"");

            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(rawSongsBucket)
                            .object(objectName)
                            .expiry(5, TimeUnit.MINUTES)
                            .extraQueryParams(reqParams)
                            .build()
            );
        } catch (Exception e) {
            log.error("Lỗi khi tạo Presigned URL Download từ MinIO", e);
            throw new AppException(ErrorCode.STORAGE_SERVICE_ERROR);
        }
    }
}