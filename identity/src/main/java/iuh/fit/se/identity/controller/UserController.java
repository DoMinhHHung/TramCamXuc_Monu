package iuh.fit.se.identity.controller;

import iuh.fit.se.core.dto.ApiResponse;
import iuh.fit.se.identity.dto.request.UserCreationRequest;
import iuh.fit.se.identity.dto.response.UserResponse;
import iuh.fit.se.identity.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.AccessLevel;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserController {

    UserService userService;

    @PostMapping("/registration")
    public ApiResponse<UserResponse> register(@RequestBody @Valid UserCreationRequest request) {
        return ApiResponse.<UserResponse>builder()
                .result(userService.createUser(request))
                .build();
    }
}