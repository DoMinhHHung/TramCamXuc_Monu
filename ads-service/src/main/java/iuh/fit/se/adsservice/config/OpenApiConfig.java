package iuh.fit.se.adsservice.config;

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
    public OpenAPI openAPI(
            @Value("${open.api.server-url:http://localhost:8080/service-ads}") String serverUrl,
            @Value("${open.api.server-description:API Gateway}") String serverDescription) {
        return new OpenAPI()
                .info(new Info()
                        .title("Ads Service API")
                        .version("1.0.0")
                        .description("Advertisement management & delivery for PhazelSound"))
                .servers(List.of(new Server().url(serverUrl).description(serverDescription)))
                .components(new Components().addSecuritySchemes("bearerAuth",
                        new SecurityScheme().type(SecurityScheme.Type.HTTP)
                                .scheme("bearer").bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
    }
}
