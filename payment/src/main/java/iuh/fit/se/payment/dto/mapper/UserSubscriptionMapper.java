package iuh.fit.se.payment.dto.mapper;

import iuh.fit.se.payment.dto.response.UserSubscriptionResponse;
import iuh.fit.se.payment.entity.UserSubscription;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring", uses = {SubscriptionPlanMapper.class})
public interface UserSubscriptionMapper {

    UserSubscriptionResponse toResponse(UserSubscription entity);
}