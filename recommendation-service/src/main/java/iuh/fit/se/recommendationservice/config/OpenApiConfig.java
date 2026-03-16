package iuh.fit.se.recommendationservice.config;

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

    @Bean
    public OpenAPI openAPI(
            @Value("${open.api.server-url}") String serverUrl,
            @Value("${open.api.server-description}") String serverDesc) {
        return new OpenAPI()
                .info(new Info()
                        .title("Recommendation Service API")
                        .version("v1.0.0")
                        .description("Personalized music recommendations: " +
                                "CF, Content-Based, Trending, Social signals"))
                .servers(List.of(new Server().url(serverUrl).description(serverDesc)))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
                .schemaRequirement("bearerAuth", new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT"));
    }
}