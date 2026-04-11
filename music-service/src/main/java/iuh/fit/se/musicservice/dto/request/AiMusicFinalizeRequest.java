package iuh.fit.se.musicservice.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AiMusicFinalizeRequest {
    @NotNull
    private Boolean publish;
}
