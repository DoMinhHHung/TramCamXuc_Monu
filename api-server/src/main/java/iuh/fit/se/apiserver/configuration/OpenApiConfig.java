package iuh.fit.se.apiserver.configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
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
    public OpenAPI openAPI(@Value("${open.api.title:Music Social Network API}") String title,
                           @Value("${open.api.version:1.0.0}") String version) {
        return new OpenAPI()
                .info(new Info().title(title)
                        .version(version)
                        .description("API Documentation for Graduation Thesis")
                        .license(new License().name("Apache 2.0").url("https://www.apache.org/licenses/LICENSE-2.0")))
                .servers(List.of(new Server().url("http://localhost:8080").description("Local Server")))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth",
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")))
                .security(List.of(new SecurityRequirement().addList("bearerAuth")));
    }
}