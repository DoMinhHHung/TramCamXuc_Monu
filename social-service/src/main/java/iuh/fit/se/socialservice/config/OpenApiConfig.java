package iuh.fit.se.socialservice.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    private static final String SECURITY_SCHEME = "bearerAuth";

    @Bean
    public OpenAPI socialServiceOpenAPI(
            @Value("${open.api.server-url:http://localhost:8080/service-social}") String serverUrl,
            @Value("${open.api.server-description:API Gateway}") String serverDescription) {
        return new OpenAPI()
                .info(new Info()
                        .title("Social Service API")
                        .version("v1.0.0")
                        .description("Social features: follow, heart, reaction, comment, share, listen history"))
                .servers(List.of(new Server().url(serverUrl).description(serverDescription)))
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME))
                .schemaRequirement(SECURITY_SCHEME, new SecurityScheme()
                        .name(SECURITY_SCHEME)
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT"));
    }
}
