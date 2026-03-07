package iuh.fit.se.identityservice.config;

import io.swagger.v3.oas.models.Components;
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
    public OpenAPI openAPI(@Value("${open.api.title:Identity Service API}") String title,
                           @Value("${open.api.version:1.0.0}") String version,
                           @Value("${open.api.server-url:http://localhost:8080/service-identity}") String serverUrl,
                           @Value("${open.api.server-description:API Gateway}") String serverDescription) {
        return new OpenAPI()
                .info(new Info().title(title).version(version)
                        .description("Authentication & User Management"))
                .servers(List.of(new Server().url(serverUrl).description(serverDescription)))
                .components(new Components().addSecuritySchemes("bearerAuth",
                        new SecurityScheme().type(SecurityScheme.Type.HTTP)
                                .scheme("bearer").bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
    }
}