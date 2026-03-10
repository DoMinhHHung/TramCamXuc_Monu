package iuh.fit.se.recommendationservice.exception;

import iuh.fit.se.recommendationservice.dto.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<Void>> handleAppException(AppException e) {
        ErrorCode code = e.getErrorCode();
        return ResponseEntity.status(code.getHttpStatus())
                .body(ApiResponse.<Void>builder()
                        .code(code.getCode())
                        .message(code.getMessage())
                        .build());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied() {
        ErrorCode code = ErrorCode.UNAUTHORIZED;
        return ResponseEntity.status(code.getHttpStatus())
                .body(ApiResponse.<Void>builder()
                        .code(code.getCode())
                        .message(code.getMessage())
                        .build());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneral(Exception e) {
        log.error("Unhandled exception: ", e);
        ErrorCode code = ErrorCode.UNCATEGORIZED_EXCEPTION;
        return ResponseEntity.status(code.getHttpStatus())
                .body(ApiResponse.<Void>builder()
                        .code(code.getCode())
                        .message(code.getMessage())
                        .build());
    }
}