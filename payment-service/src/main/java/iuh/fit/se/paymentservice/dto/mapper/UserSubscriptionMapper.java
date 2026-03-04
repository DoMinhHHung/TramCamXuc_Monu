package iuh.fit.se.paymentservice.dto.mapper;

import iuh.fit.se.paymentservice.dto.response.UserSubscriptionResponse;
import iuh.fit.se.paymentservice.entity.UserSubscription;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring", uses = {SubscriptionPlanMapper.class})
public interface UserSubscriptionMapper {
    UserSubscriptionResponse toResponse(UserSubscription entity);
}
