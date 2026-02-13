package iuh.fit.se.core.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

@Target({ ElementType.FIELD })
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = AgeValidator.class)
@Documented
public @interface Age {

    int min();

    String message() default "AGE_TOO_YOUNG";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}