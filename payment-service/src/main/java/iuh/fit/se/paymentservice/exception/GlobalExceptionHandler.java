package iuh.fit.se.paymentservice.exception;

import iuh.fit.se.paymentservice.dto.ApiResponse;
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
        return ResponseEntity.status(ErrorCode.UNAUTHORIZED.getStatusCode())
                .body(ApiResponse.<Void>builder()
                        .code(ErrorCode.UNAUTHORIZED.getCode())
                        .message(ErrorCode.UNAUTHORIZED.getMessage())
                        .build());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        String msg = ex.getFieldError() != null
                ? ex.getFieldError().getDefaultMessage()
                : "Invalid request";
        return ResponseEntity.badRequest()
                .body(ApiResponse.<Void>builder()
                        .code(ErrorCode.INVALID_REQUEST.getCode())
                        .message(msg)
                        .build());
    }

    @ExceptionHandler(DataAccessException.class)
    ResponseEntity<ApiResponse<Void>> handleDb(DataAccessException ex) {
        log.error("Database error: ", ex);
        return ResponseEntity.internalServerError()
                .body(ApiResponse.<Void>builder()
                        .code(ErrorCode.UNCATEGORIZED_EXCEPTION.getCode())
                        .message("Database error")
                        .build());
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiResponse<Void>> handleGeneric(Exception ex) {
        log.error("Uncategorized exception: ", ex);
        return ResponseEntity.internalServerError()
                .body(ApiResponse.<Void>builder()
                        .code(ErrorCode.UNCATEGORIZED_EXCEPTION.getCode())
                        .message(ErrorCode.UNCATEGORIZED_EXCEPTION.getMessage())
                        .build());
    }
}
