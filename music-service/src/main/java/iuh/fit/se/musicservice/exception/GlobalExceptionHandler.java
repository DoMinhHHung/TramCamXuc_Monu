package iuh.fit.se.musicservice.exception;

import iuh.fit.se.musicservice.dto.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@Slf4j
@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AppException.class)
    ResponseEntity<ApiResponse<Void>> handleApp(AppException ex) {
        ErrorCode code = ex.getErrorCode();
        return ResponseEntity.status(code.getStatusCode())
                .body(ApiResponse.<Void>builder()
                        .code(code.getCode())
                        .message(code.getMessage())
                        .build());
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(403)
                .body(ApiResponse.<Void>builder()
                        .code(ErrorCode.UNAUTHORIZED.getCode())
                        .message(ErrorCode.UNAUTHORIZED.getMessage())
                        .build());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        String enumKey = ex.getFieldError() != null
                ? ex.getFieldError().getDefaultMessage()
                : "INVALID_REQUEST";
        ErrorCode errorCode;
        try {
            errorCode = ErrorCode.valueOf(enumKey);
        } catch (IllegalArgumentException e) {
            errorCode = ErrorCode.INVALID_REQUEST;
        }
        return ResponseEntity.badRequest()
                .body(ApiResponse.<Void>builder()
                        .code(errorCode.getCode())
                        .message(errorCode.getMessage())
                        .build());
    }

    @ExceptionHandler(DataAccessException.class)
    ResponseEntity<ApiResponse<Void>> handleDb(DataAccessException ex) {
        log.error("Database error: ", ex);
        return ResponseEntity.status(503)
                .body(ApiResponse.<Void>builder()
                        .code(9901)
                        .message("Database error")
                        .build());
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiResponse<Void>> handleGeneric(Exception ex) {
        log.error("Uncategorized exception: ", ex);
        ErrorCode code = ErrorCode.UNCATEGORIZED_EXCEPTION;
        return ResponseEntity.status(code.getStatusCode())
                .body(ApiResponse.<Void>builder()
                        .code(code.getCode())
                        .message(code.getMessage())
                        .build());
    }
}
