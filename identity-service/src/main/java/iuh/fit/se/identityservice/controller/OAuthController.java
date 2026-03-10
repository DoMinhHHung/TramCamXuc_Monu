package iuh.fit.se.identityservice.controller;

import iuh.fit.se.identityservice.dto.request.ExchangeTokenRequest;
import iuh.fit.se.identityservice.dto.response.AuthenticationResponse;
import iuh.fit.se.identityservice.enums.AuthProvider;
import iuh.fit.se.identityservice.service.AuthService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/auth/oauth")
@RequiredArgsConstructor
@Slf4j
public class OAuthController {

    private final AuthService authService;

    @Value("${oauth.google.client-id}")
    private String googleClientId;

    @Value("${oauth.facebook.client-id}")
    private String facebookClientId;

    @Value("${oauth.callback-base-url}")
    private String callbackBaseUrl;

    @GetMapping("/google")
    public void redirectToGoogle(HttpServletResponse response) throws IOException {
        String callbackUri = callbackBaseUrl + "/auth/oauth/google/callback";
        String url = "https://accounts.google.com/o/oauth2/v2/auth"
                + "?client_id=" + googleClientId
                + "&redirect_uri=" + URLEncoder.encode(callbackUri, StandardCharsets.UTF_8)
                + "&response_type=token"
                + "&scope=" + URLEncoder.encode("openid email profile", StandardCharsets.UTF_8)
                + "&prompt=consent";
        response.sendRedirect(url);
    }

    @GetMapping("/google/callback")
    public void googleCallback(HttpServletResponse response) throws IOException {
        response.setContentType("text/html;charset=UTF-8");
        response.getWriter().write(buildCallbackHtml("GOOGLE"));
    }

    @GetMapping("/facebook")
    public void redirectToFacebook(HttpServletResponse response) throws IOException {
        String callbackUri = callbackBaseUrl + "/auth/oauth/facebook/callback";
        String url = "https://www.facebook.com/v20.0/dialog/oauth"
                + "?client_id=" + facebookClientId
                + "&redirect_uri=" + URLEncoder.encode(callbackUri, StandardCharsets.UTF_8)
                + "&response_type=token"
                + "&scope=" + URLEncoder.encode("email,public_profile", StandardCharsets.UTF_8);
        response.sendRedirect(url);
    }

    @GetMapping("/facebook/callback")
    public void facebookCallback(HttpServletResponse response) throws IOException {
        response.setContentType("text/html;charset=UTF-8");
        response.getWriter().write(buildCallbackHtml("FACEBOOK"));
    }

    @GetMapping("/complete")
    public void complete(
            @RequestParam String provider,
            @RequestParam String token,
            HttpServletResponse response) throws IOException {
        try {
            ExchangeTokenRequest request = ExchangeTokenRequest.builder()
                    .token(token)
                    .provider(AuthProvider.valueOf(provider))
                    .build();

            AuthenticationResponse auth = authService.outboundAuthentication(request);

            String deepLink = "monumobile://oauth"
                    + "?accessToken=" + URLEncoder.encode(auth.getAccessToken(), StandardCharsets.UTF_8)
                    + "&refreshToken=" + URLEncoder.encode(auth.getRefreshToken(), StandardCharsets.UTF_8);

            log.info("OAuth complete for provider={}, redirecting to app", provider);
            response.sendRedirect(deepLink);

        } catch (Exception e) {
            log.error("OAuth complete failed for provider={}: {}", provider, e.getMessage());
            response.sendRedirect("monumobile://oauth?error=authentication_failed");
        }
    }

    private String buildCallbackHtml(String provider) {
        String completeUrl = callbackBaseUrl + "/auth/oauth/complete?provider=" + provider + "&token=";

        return "<!DOCTYPE html>\n"
                + "<html>\n"
                + "<head>\n"
                + "  <meta charset=\"UTF-8\">\n"
                + "  <title>Đang xử lý đăng nhập...</title>\n"
                + "  <style>\n"
                + "    body { font-family: Arial, sans-serif; display: flex; align-items: center;\n"
                + "           justify-content: center; height: 100vh; margin: 0; background: #0f172a; }\n"
                + "    .msg { color: #e2e8f0; text-align: center; }\n"
                + "    .spinner { width: 40px; height: 40px; border: 4px solid #334155;\n"
                + "               border-top-color: #C9A84C; border-radius: 50%;\n"
                + "               animation: spin 0.8s linear infinite; margin: 0 auto 16px; }\n"
                + "    @keyframes spin { to { transform: rotate(360deg); } }\n"
                + "  </style>\n"
                + "</head>\n"
                + "<body>\n"
                + "  <div class=\"msg\">\n"
                + "    <div class=\"spinner\"></div>\n"
                + "    <p>Đang xử lý đăng nhập, vui lòng chờ...</p>\n"
                + "  </div>\n"
                + "  <script>\n"
                + "    (function() {\n"
                + "      var hash = window.location.hash.substring(1);\n"
                + "      var params = new URLSearchParams(hash);\n"
                + "      var token = params.get('access_token');\n"
                + "      if (token) {\n"
                + "        window.location.href = '" + completeUrl + "' + encodeURIComponent(token);\n"
                + "      } else {\n"
                + "        document.querySelector('.msg p').textContent = 'Lỗi: không lấy được token. Vui lòng đóng và thử lại.';\n"
                + "      }\n"
                + "    })();\n"
                + "  </script>\n"
                + "</body>\n"
                + "</html>";
    }
}