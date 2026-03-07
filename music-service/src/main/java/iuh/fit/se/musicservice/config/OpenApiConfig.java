package iuh.fit.se.musicservice.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
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

    private static final String SECURITY_SCHEME_NAME = "bearerAuth";

    @Bean
    public OpenAPI musicServiceOpenAPI(
            @Value("${open.api.server-url:http://localhost:8080/service-music}") String serverUrl,
            @Value("${open.api.server-description:API Gateway}") String serverDescription) {
        return new OpenAPI()
                .info(new Info()
                        .title("Music Service API")
                        .version("v1.0.0")
                        .description("OpenAPI configuration for Music Service")
                        .contact(new Contact()
                                .name("Monu Team")
                                .email("dominhhung04032003@gmail.com")))
                .servers(List.of(new Server().url(serverUrl).description(serverDescription)))
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME_NAME))
                .schemaRequirement(SECURITY_SCHEME_NAME, new SecurityScheme()
                        .name(SECURITY_SCHEME_NAME)
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT"));
    }
}
