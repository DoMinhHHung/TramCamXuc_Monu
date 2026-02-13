package iuh.fit.se.payment.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.Map;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SubscriptionPlanRequest {

    @NotBlank(message = "Subscription name must not be blank")
    @Size(max = 100, message = "Subscription name must not exceed 100 characters")
    private String subsName;

    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    private String description;

    @NotNull(message = "Features must not be null")
    private Map<String, Object> features;

    @NotNull(message = "Price must not be null")
    @DecimalMin(value = "0.0", inclusive = false, message = "Price must be greater than 0")
    private BigDecimal price;

    @NotNull(message = "Duration days must not be null")
    @Min(value = 1, message = "Duration must be at least 1 day")
    private Integer durationDays;

    private Boolean isActive;

    private Integer displayOrder;
}