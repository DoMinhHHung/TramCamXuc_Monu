package iuh.fit.se.adsservice.exception;

import iuh.fit.se.adsservice.dto.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.stream.Collectors;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<Void>> handleAppException(AppException ex) {
        ErrorCode code = ex.getErrorCode();
        return ResponseEntity.status(code.getStatusCode())
                .body(ApiResponse.<Void>builder()
                        .code(code.getCode())
                        .message(code.getMessage())
                        .build());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        String msg = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest()
                .body(ApiResponse.<Void>builder()
                        .code(ErrorCode.INVALID_REQUEST.getCode())
                        .message(msg)
                        .build());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex) {
        ErrorCode code = ErrorCode.ACCESS_DENIED;
        return ResponseEntity.status(code.getStatusCode())
                .body(ApiResponse.<Void>builder()
                        .code(code.getCode())
                        .message(code.getMessage())
                        .build());
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<Void>> handleAuthentication(AuthenticationException ex) {
        ErrorCode code = ErrorCode.UNAUTHENTICATED;
        return ResponseEntity.status(code.getStatusCode())
                .body(ApiResponse.<Void>builder()
                        .code(code.getCode())
                        .message(code.getMessage())
                        .build());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiResponse<Void>> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        return ResponseEntity.badRequest()
                .body(ApiResponse.<Void>builder()
                        .code(ErrorCode.INVALID_REQUEST.getCode())
                        .message("File size exceeds maximum allowed (50MB)")
                        .build());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneral(Exception ex) {
        log.error("Unexpected error", ex);
        ErrorCode code = ErrorCode.UNCATEGORIZED_EXCEPTION;
        return ResponseEntity.status(code.getStatusCode())
                .body(ApiResponse.<Void>builder()
                        .code(code.getCode())
                        .message(code.getMessage())
                        .build());
    }
}
