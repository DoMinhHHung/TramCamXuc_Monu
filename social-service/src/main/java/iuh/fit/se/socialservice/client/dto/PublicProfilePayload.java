package iuh.fit.se.socialservice.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.UUID;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class PublicProfilePayload {
    private UUID id;
    private String fullName;
    private String avatarUrl;
}
