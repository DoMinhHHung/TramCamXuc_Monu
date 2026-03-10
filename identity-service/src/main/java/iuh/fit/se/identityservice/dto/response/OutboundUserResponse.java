package iuh.fit.se.identityservice.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class OutboundUserResponse {
    private String email;
    private String name;

    private String id;

    private String picture;

    @JsonProperty("sub")
    private void unpackNestedGoogleId(String sub) {
        this.id = sub;
    }

    @JsonProperty("picture")
    private void unpackPicture(Object pictureObj) {
        if (pictureObj instanceof String) {
            this.picture = (String) pictureObj;
        } else if (pictureObj instanceof Map) {
            Map<?, ?> data = (Map<?, ?>) ((Map<?, ?>) pictureObj).get("data");
            if (data != null && data.containsKey("url")) {
                this.picture = (String) data.get("url");
            }
        }
    }
}