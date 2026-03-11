package iuh.fit.se.adsservice.dto.request;

import lombok.Data;

import java.util.UUID;

@Data
public class RecordPlayedRequest {
    private UUID songId;
    private boolean completed;
}
