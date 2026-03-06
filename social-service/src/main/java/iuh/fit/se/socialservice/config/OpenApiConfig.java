package iuh.fit.se.socialservice.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String SECURITY_SCHEME = "bearerAuth";

    @Bean
    public OpenAPI socialServiceOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Social Service API")
                        .version("v1.0.0")
                        .description("Social features: follow, heart, reaction, comment, share, listen history"))
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME))
                .schemaRequirement(SECURITY_SCHEME, new SecurityScheme()
                        .name(SECURITY_SCHEME)
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT"));
    }
}
