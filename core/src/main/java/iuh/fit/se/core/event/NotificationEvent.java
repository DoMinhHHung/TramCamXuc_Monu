package iuh.fit.se.core.event;

import lombok.*;

import java.util.Map;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class NotificationEvent {
    private String channel;
    private String recipient;
    private String subject;
    private String templateCode;
    private Map<String, Object> paramMap;
}
