package iuh.fit.se.music.dto.response.internal;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class InternalApiResponse<T> {
    private T result;
}
