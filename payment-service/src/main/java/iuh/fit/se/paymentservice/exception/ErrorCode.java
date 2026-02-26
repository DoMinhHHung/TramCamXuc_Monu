package iuh.fit.se.paymentservice.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

@Getter
public enum ErrorCode {
    UNCATEGORIZED_EXCEPTION(9999, "Uncategorized error", HttpStatus.INTERNAL_SERVER_ERROR),
    UNAUTHENTICATED(1000, "Unauthenticated", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED(9900, "Unauthorized access", HttpStatus.FORBIDDEN),
    INVALID_REQUEST(9906, "Invalid request", HttpStatus.BAD_REQUEST),

    SUBSCRIPTION_PLAN_NOT_FOUND(2001, "Subscription plan not found", HttpStatus.NOT_FOUND),
    SUBSCRIPTION_PLAN_ALREADY_EXISTS(2002, "Subscription plan with this name already exists", HttpStatus.BAD_REQUEST),
    SUBSCRIPTION_PLAN_NOT_ACTIVE(2003, "Subscription plan is not active", HttpStatus.BAD_REQUEST),
    USER_SUBSCRIPTION_NOT_FOUND(2004, "User subscription not found", HttpStatus.NOT_FOUND),
    USER_ALREADY_HAS_ACTIVE_SUBSCRIPTION(2005, "User already has an active subscription", HttpStatus.BAD_REQUEST),
    PAYMENT_TRANSACTION_NOT_FOUND(2006, "Payment transaction not found", HttpStatus.NOT_FOUND),
    PAYMENT_PROCESSING_ERROR(2007, "Error processing payment", HttpStatus.INTERNAL_SERVER_ERROR),
    CANNOT_DELETE_PLAN_WITH_ACTIVE_SUBSCRIPTIONS(2008, "Cannot delete plan with active subscriptions", HttpStatus.BAD_REQUEST),
    SUBSCRIPTION_NOT_SUPPORTED(2009, "Subscription plan not supported", HttpStatus.BAD_REQUEST),
    FREE_SUBSCRIPTION_NOT_ALLOWED(2010, "Free subscription plan not allowed for this operation", HttpStatus.BAD_REQUEST);

    private final int code;
    private final String message;
    private final HttpStatusCode statusCode;

    ErrorCode(int code, String message, HttpStatusCode statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }
}