package iuh.fit.se.payment.dto.mapper;

import iuh.fit.se.payment.dto.request.SubscriptionPlanRequest;
import iuh.fit.se.payment.dto.response.SubscriptionPlanResponse;
import iuh.fit.se.payment.entity.SubscriptionPlan;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface SubscriptionPlanMapper {

    @Mapping(target = "id", ignore = true)
    SubscriptionPlan toEntity(SubscriptionPlanRequest request);

    SubscriptionPlanResponse toResponse(SubscriptionPlan entity);

    @Mapping(target = "id", ignore = true)
    void updateEntity(SubscriptionPlanRequest request, @MappingTarget SubscriptionPlan entity);
}