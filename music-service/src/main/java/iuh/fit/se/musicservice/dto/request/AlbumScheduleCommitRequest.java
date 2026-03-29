package iuh.fit.se.musicservice.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlbumScheduleCommitRequest {

    @NotNull
    private ZonedDateTime publishAt;

    /** Ghi công / collaborators — hiển thị trước khi phát hành */
    @Size(max = 500)
    private String credits;
}
