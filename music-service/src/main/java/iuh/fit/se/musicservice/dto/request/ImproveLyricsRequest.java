package iuh.fit.se.musicservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ImproveLyricsRequest {

    @NotBlank
    @Size(max = 12000)
    private String lyrics;

    /**
     * Gợi ý của user (ví dụ: thêm ẩn dụ, giữ nguyên điệp khúc, vần điệu rap...).
     */
    @Size(max = 2000)
    private String hint;
}
