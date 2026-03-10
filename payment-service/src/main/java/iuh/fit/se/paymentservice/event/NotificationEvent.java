package iuh.fit.se.paymentservice.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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