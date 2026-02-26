package iuh.fit.se.identityservice.dto.mapper;

import iuh.fit.se.identityservice.dto.request.UserRegistrationRequest;
import iuh.fit.se.identityservice.dto.response.UserResponse;
import iuh.fit.se.identityservice.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "role", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "provider", ignore = true)
    @Mapping(target = "providerId", ignore = true)
    @Mapping(target = "avatarUrl", ignore = true)
    @Mapping(target = "refreshTokens", ignore = true)
    @Mapping(target = "subscriptionFeatures", ignore = true)
    @Mapping(target = "subscriptionPlan", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    User toEntity(UserRegistrationRequest request);

    UserResponse toResponse(User user);
}