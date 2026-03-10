package iuh.fit.se.musicservice.dto.jamendo;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;

import java.util.List;

/**
 * Top-level wrapper for the Jamendo /v3.0/tracks/ API response.
 *
 * {
 *   "headers": { "code": 0, "status": "success", "next": "..." },
 *   "results": [ { ...JamendoTrackDto... } ]
 * }
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class JamendoApiResponse {

    private Headers headers;
    private List<JamendoTrackDto> results;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Headers {
        /** 0 = success; non-zero = API error. */
        private int    code;
        private String status;
        /** URL for the next page (pagination). Null on last page. */
        private String next;
    }

    /** @return true when the API returned a successful response with results. */
    public boolean isSuccess() {
        return headers != null && headers.getCode() == 0
                && results != null && !results.isEmpty();
    }
}