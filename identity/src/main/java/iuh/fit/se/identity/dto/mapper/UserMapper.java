package iuh.fit.se.identity.dto.mapper;

import iuh.fit.se.identity.dto.request.UserRegistrationRequest;
import iuh.fit.se.identity.dto.response.UserResponse;
import iuh.fit.se.identity.entity.User;
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
    @Mapping(target = "fullName", ignore = true)
    User toEntity(UserRegistrationRequest request);

    UserResponse toResponse(User user);
}