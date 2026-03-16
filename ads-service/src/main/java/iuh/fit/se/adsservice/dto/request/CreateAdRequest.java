package iuh.fit.se.adsservice.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Dùng khi admin tạo quảng cáo mới (multipart/form-data — file đính kèm riêng) */
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class CreateAdRequest {

    @NotBlank(message = "Advertiser name must not be blank")
    @Size(max = 200)
    private String advertiserName;

    @NotBlank(message = "Title must not be blank")
    @Size(max = 200)
    private String title;

    @Size(max = 1000)
    private String description;

    @NotBlank(message = "Target URL must not be blank")
    @Size(max = 2000)
    private String targetUrl;

    @DecimalMin(value = "0.0")
    private BigDecimal cpmVnd;

    @DecimalMin(value = "0.0")
    private BigDecimal budgetVnd;

    private LocalDate startDate;
    private LocalDate endDate;

    /** Thời lượng (giây) của file audio — admin nhập thủ công hoặc để null (mặc định 30s) */
    @Min(value = 1, message = "Duration must be at least 1 second")
    private Integer durationSeconds;
}
