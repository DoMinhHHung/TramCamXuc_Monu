package iuh.fit.se.adsservice.dto.request;

import iuh.fit.se.adsservice.enums.AdStatus;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class UpdateAdRequest {

    @Size(max = 200)
    private String advertiserName;

    @Size(max = 200)
    private String title;

    @Size(max = 1000)
    private String description;

    @Size(max = 2000)
    private String targetUrl;

    private AdStatus status;

    @DecimalMin(value = "0.0")
    private BigDecimal cpmVnd;

    @DecimalMin(value = "0.0")
    private BigDecimal budgetVnd;

    private LocalDate startDate;
    private LocalDate endDate;

    /** Thời lượng mới nếu admin đổi file audio */
    @Min(value = 1, message = "Duration must be at least 1 second")
    private Integer durationSeconds;
}
