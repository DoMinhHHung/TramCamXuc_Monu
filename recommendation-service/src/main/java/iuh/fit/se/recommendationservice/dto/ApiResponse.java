package iuh.fit.se.recommendationservice.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    @Builder.Default
    private int code = 1000;
    private String message;
    private T result;

    public static <T> ApiResponse<T> success(T result) {
        return ApiResponse.<T>builder()
                .code(1000)
                .result(result)
                .build();
    }
}
