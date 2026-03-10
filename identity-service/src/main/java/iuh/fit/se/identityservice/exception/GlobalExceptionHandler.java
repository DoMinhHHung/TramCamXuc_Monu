package iuh.fit.se.identityservice.exception;

import iuh.fit.se.identityservice.dto.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.MailException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.sql.SQLException;

@Slf4j
@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RedisConnectionFailureException.class)
    ResponseEntity<ApiResponse<Void>> handleRedis(RedisConnectionFailureException ex) {
        log.error("Redis connection failed: ", ex);
        return error(ErrorCode.REDIS_CONNECTION_FAILED);
    }

    @ExceptionHandler({SQLException.class, DataAccessException.class})
    ResponseEntity<ApiResponse<Void>> handleDb(Exception ex) {
        log.error("Database error: ", ex);
        return error(ErrorCode.DB_CONNECTION_FAILED);
    }

    @ExceptionHandler(MailException.class)
    ResponseEntity<ApiResponse<Void>> handleMail(MailException ex) {
        log.error("Mail failed: ", ex);
        return error(ErrorCode.EMAIL_SEND_FAILED);
    }

    @ExceptionHandler(AppException.class)
    ResponseEntity<ApiResponse<Void>> handleApp(AppException ex) {
        ErrorCode code = ex.getErrorCode();
        return ResponseEntity.status(code.getStatusCode())
                .body(ApiResponse.<Void>builder()
                        .code(code.getCode())
                        .message(code.getMessage())
                        .build());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        String enumKey = ex.getFieldError() != null ? ex.getFieldError().getDefaultMessage() : "INVALID_KEY";
        ErrorCode errorCode;
        try {
            errorCode = ErrorCode.valueOf(enumKey);
        } catch (IllegalArgumentException e) {
            errorCode = ErrorCode.INVALID_KEY;
        }
        return ResponseEntity.badRequest()
                .body(ApiResponse.<Void>builder()
                        .code(errorCode.getCode())
                        .message(errorCode.getMessage())
                        .build());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiResponse<Void>> handleIntegrity(DataIntegrityViolationException ex) {
        return ResponseEntity.badRequest()
                .body(ApiResponse.<Void>builder()
                        .code(ErrorCode.USER_EXISTED.getCode())
                        .message("Database constraint violation")
                        .build());
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiResponse<Void>> handleGeneric(Exception ex) {
        log.error("Uncategorized exception: ", ex);
        return ResponseEntity.badRequest()
                .body(ApiResponse.<Void>builder()
                        .code(ErrorCode.UNCATEGORIZED_EXCEPTION.getCode())
                        .message(ErrorCode.UNCATEGORIZED_EXCEPTION.getMessage())
                        .build());
    }

    private ResponseEntity<ApiResponse<Void>> error(ErrorCode code) {
        return ResponseEntity.status(code.getStatusCode())
                .body(ApiResponse.<Void>builder()
                        .code(code.getCode())
                        .message(code.getMessage())
                        .build());
    }
}