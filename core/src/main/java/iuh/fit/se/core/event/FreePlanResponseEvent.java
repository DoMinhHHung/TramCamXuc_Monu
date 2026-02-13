package iuh.fit.se.core.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FreePlanResponseEvent {
    private String planName;
    private Map<String, Object> features;
}