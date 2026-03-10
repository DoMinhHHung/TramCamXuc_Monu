package iuh.fit.se.identityservice.service.impl;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import iuh.fit.se.identityservice.exception.AppException;
import iuh.fit.se.identityservice.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class StorageService {

    private final Cloudinary cloudinary;

    public String uploadImage(MultipartFile file, String folder) {
        if (file == null || file.isEmpty())
            throw new AppException(ErrorCode.FILE_NOT_NULL);
        if (!Objects.requireNonNull(file.getContentType()).startsWith("image/"))
            throw new AppException(ErrorCode.TYPE_FILE_NOT_SUPPORTED);

        try {
            Map params = ObjectUtils.asMap("folder", folder, "resource_type", "image");
            Map result = cloudinary.uploader().upload(file.getBytes(), params);
            return (String) result.get("secure_url");
        } catch (IOException e) {
            log.error("Cloudinary upload failed", e);
            throw new AppException(ErrorCode.STORAGE_SERVICE_ERROR);
        }
    }

    public void deleteImage(String imageUrl) {
        if (imageUrl == null) return;
        try {
            String publicId = extractPublicId(imageUrl);
            if (publicId != null) cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
        } catch (IOException e) {
            log.warn("Failed to delete image: {}", imageUrl);
        }
    }

    private String extractPublicId(String url) {
        try {
            int idx = url.indexOf("/upload/");
            if (idx == -1) return null;
            String path = url.substring(idx + 8);
            int slash = path.indexOf("/");
            if (slash != -1) path = path.substring(slash + 1);
            int dot = path.lastIndexOf(".");
            return dot != -1 ? path.substring(0, dot) : path;
        } catch (Exception e) { return null; }
    }
}