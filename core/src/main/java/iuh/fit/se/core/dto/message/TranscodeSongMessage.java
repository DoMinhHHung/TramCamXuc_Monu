package iuh.fit.se.core.dto.message;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TranscodeSongMessage implements Serializable {
    private UUID songId;
    private String rawFileKey;
    private String fileExtension;
}