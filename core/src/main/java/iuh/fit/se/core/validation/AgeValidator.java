package iuh.fit.se.core.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.time.LocalDate;
import java.time.Period;

public class AgeValidator implements ConstraintValidator<Age, LocalDate> {

    private int min;

    @Override
    public void initialize(Age constraintAnnotation) {
        this.min = constraintAnnotation.min();
    }

    @Override
    public boolean isValid(LocalDate dob, ConstraintValidatorContext context) {
        if (dob == null) return true;

        return Period.between(dob, LocalDate.now()).getYears() >= min;
    }
}