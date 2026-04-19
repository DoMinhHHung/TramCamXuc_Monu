package iuh.fit.se.socialservice.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class PublicProfileEnvelope {
    private int code;
    private String message;
    private PublicProfilePayload result;
}
