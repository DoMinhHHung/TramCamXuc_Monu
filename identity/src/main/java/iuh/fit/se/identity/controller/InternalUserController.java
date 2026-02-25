package iuh.fit.se.identity.controller;

import iuh.fit.se.core.dto.ApiResponse;
import iuh.fit.se.identity.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/users")
@RequiredArgsConstructor
public class InternalUserController {

    private final UserService userService;

    @GetMapping("/{userId}/exists")
    public ApiResponse<Boolean> userExists(@PathVariable String userId) {
        return ApiResponse.<Boolean>builder()
                .result(userService.existsById(userId))
                .build();
    }
}
