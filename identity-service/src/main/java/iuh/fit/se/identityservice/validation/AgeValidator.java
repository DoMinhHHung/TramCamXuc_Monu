package iuh.fit.se.identityservice.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.time.LocalDate;
import java.time.Period;

public class AgeValidator implements ConstraintValidator<Age, LocalDate> {
    private int min;

    @Override
    public void initialize(Age annotation) { this.min = annotation.min(); }

    @Override
    public boolean isValid(LocalDate dob, ConstraintValidatorContext ctx) {
        if (dob == null) return true;
        return Period.between(dob, LocalDate.now()).getYears() >= min;
    }
}