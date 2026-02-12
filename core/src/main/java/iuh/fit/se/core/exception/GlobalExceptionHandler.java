package iuh.fit.se.core.exception;

import iuh.fit.se.core.dto.ApiResponse;
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

    @ExceptionHandler(value = RedisConnectionFailureException.class)
    ResponseEntity<ApiResponse> handlingRedisException(RedisConnectionFailureException exception) {
        log.error("Redis connection failed: ", exception);
        ApiResponse apiResponse = new ApiResponse();
        apiResponse.setCode(ErrorCode.REDIS_CONNECTION_FAILED.getCode());
        apiResponse.setMessage(ErrorCode.REDIS_CONNECTION_FAILED.getMessage());
        return ResponseEntity.status(ErrorCode.REDIS_CONNECTION_FAILED.getStatusCode()).body(apiResponse);
    }

    @ExceptionHandler(value = {SQLException.class, DataAccessException.class})
    ResponseEntity<ApiResponse> handlingDatabaseException(Exception exception) {
        log.error("Database connection failed: ", exception);
        ApiResponse apiResponse = new ApiResponse();
        apiResponse.setCode(ErrorCode.DB_CONNECTION_FAILED.getCode());
        apiResponse.setMessage(ErrorCode.DB_CONNECTION_FAILED.getMessage());
        return ResponseEntity.status(ErrorCode.DB_CONNECTION_FAILED.getStatusCode()).body(apiResponse);
    }

    @ExceptionHandler(value = MailException.class)
    ResponseEntity<ApiResponse> handlingMailException(MailException exception) {
        log.error("Email sending failed: ", exception);
        ApiResponse apiResponse = new ApiResponse();
        apiResponse.setCode(ErrorCode.EMAIL_SEND_FAILED.getCode());
        apiResponse.setMessage(ErrorCode.EMAIL_SEND_FAILED.getMessage());
        return ResponseEntity.status(ErrorCode.EMAIL_SEND_FAILED.getStatusCode()).body(apiResponse);
    }

    @ExceptionHandler(value = Exception.class)
    ResponseEntity<ApiResponse> handlingRuntimeException(Exception exception) {
        log.error("Uncategorized exception: ", exception);
        ApiResponse apiResponse = new ApiResponse();

        apiResponse.setCode(ErrorCode.UNCATEGORIZED_EXCEPTION.getCode());
        apiResponse.setMessage(ErrorCode.UNCATEGORIZED_EXCEPTION.getMessage());

        return ResponseEntity.badRequest().body(apiResponse);
    }

    @ExceptionHandler(value = AppException.class)
    ResponseEntity<ApiResponse> handlingAppException(AppException exception) {
        ErrorCode errorCode = exception.getErrorCode();

        ApiResponse apiResponse = new ApiResponse();
        apiResponse.setCode(errorCode.getCode());
        apiResponse.setMessage(errorCode.getMessage());

        return ResponseEntity
                .status(errorCode.getStatusCode())
                .body(apiResponse);
    }

    @ExceptionHandler(value = MethodArgumentNotValidException.class)
    ResponseEntity<ApiResponse> handlingValidation(MethodArgumentNotValidException exception) {
        String enumKey = exception.getFieldError().getDefaultMessage();

        ErrorCode errorCode = ErrorCode.INVALID_KEY;
        try {
            errorCode = ErrorCode.valueOf(enumKey);
        } catch (IllegalArgumentException e) {
        }

        ApiResponse apiResponse = new ApiResponse();
        apiResponse.setCode(errorCode.getCode());
        apiResponse.setMessage(errorCode.getMessage());

        return ResponseEntity.badRequest().body(apiResponse);
    }

    @ExceptionHandler(value = DataIntegrityViolationException.class)
    ResponseEntity<ApiResponse> handlingDBException(DataIntegrityViolationException exception) {
        ApiResponse apiResponse = new ApiResponse();
        apiResponse.setCode(ErrorCode.USER_EXISTED.getCode());
        apiResponse.setMessage("Database error: Key duplication or constraint violation");

        return ResponseEntity.status(ErrorCode.USER_EXISTED.getStatusCode()).body(apiResponse);
    }
}