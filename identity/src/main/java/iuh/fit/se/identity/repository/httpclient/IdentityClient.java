package iuh.fit.se.identity.repository.httpclient;

import iuh.fit.se.core.exception.AppException;
import iuh.fit.se.core.exception.ErrorCode;
import iuh.fit.se.identity.dto.response.OutboundUserResponse;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;

@Component
public class IdentityClient {

    private final RestClient restClient;

    public IdentityClient(RestClient.Builder builder) {
        MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
        converter.setSupportedMediaTypes(List.of(
                MediaType.APPLICATION_JSON,
                new MediaType("text", "javascript")
        ));

        // 2. Build RestClient với converter mới
        this.restClient = builder
                .messageConverters(converters -> converters.add(0, converter))
                .build();
    }

    public OutboundUserResponse getUserInfoFromGoogle(String token) {
        try {
            return restClient.get()
                    .uri("https://oauth2.googleapis.com/tokeninfo?id_token={token}", token)
                    .retrieve()
                    .body(OutboundUserResponse.class);
        } catch (Exception e) {
            e.printStackTrace();
            throw new AppException(ErrorCode.INVALID_KEY);
        }
    }

    public OutboundUserResponse getUserInfoFromFacebook(String token) {
        try {
            return restClient.get()
                    .uri("https://graph.facebook.com/me?access_token={token}&fields=id,email,name,picture.width(640).height(640)", token)
                    .retrieve()
                    .body(OutboundUserResponse.class);
        } catch (Exception e) {
            e.printStackTrace();
            throw new AppException(ErrorCode.INVALID_KEY);
        }
    }
}