package iuh.fit.se.identity.service;

import iuh.fit.se.identity.dto.request.UserCreationRequest;
import iuh.fit.se.identity.dto.response.UserResponse;

public interface UserService {
    UserResponse createUser(UserCreationRequest request);
}