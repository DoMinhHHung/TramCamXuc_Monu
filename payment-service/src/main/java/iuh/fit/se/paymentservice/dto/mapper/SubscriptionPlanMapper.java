package iuh.fit.se.paymentservice.dto.mapper;

import iuh.fit.se.paymentservice.dto.request.SubscriptionPlanRequest;
import iuh.fit.se.paymentservice.dto.request.SubscriptionPlanUpdateRequest;
import iuh.fit.se.paymentservice.dto.response.SubscriptionPlanResponse;
import iuh.fit.se.paymentservice.entity.SubscriptionPlan;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface SubscriptionPlanMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    SubscriptionPlan toEntity(SubscriptionPlanRequest request);

    SubscriptionPlanResponse toResponse(SubscriptionPlan entity);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "features", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void partialUpdate(SubscriptionPlanUpdateRequest request, @MappingTarget SubscriptionPlan entity);
}
