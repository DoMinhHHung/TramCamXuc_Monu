package iuh.fit.se.integrationservice.event;

import lombok.*;
import java.io.Serializable;
import java.util.Map;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class NotificationEvent implements Serializable {
    private String channel;
    private String recipient;
    private String subject;
    private String templateCode;
    private Map<String, Object> paramMap;
}