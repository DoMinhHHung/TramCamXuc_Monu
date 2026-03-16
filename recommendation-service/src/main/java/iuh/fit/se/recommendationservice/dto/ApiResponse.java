package iuh.fit.se.recommendationservice.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    @Builder.Default
    private int code = 1000;
    private String message;
    private T result;

    public static <T> ApiResponse<T> ok(T result) {
        return ApiResponse.<T>builder().result(result).build();
    }

    public static <T> ApiResponse<T> ok(String message, T result) {
        return ApiResponse.<T>builder().message(message).result(result).build();
    }
}