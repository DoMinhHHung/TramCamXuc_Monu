package iuh.fit.se.integration.email;

import lombok.*;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class EmailRequest {
    private String to;
    private String subject;
    private String content;
}