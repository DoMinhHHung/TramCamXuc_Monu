package iuh.fit.se.paymentservice.controller;

import iuh.fit.se.paymentservice.dto.request.InternalAiMusicConsumeRequest;
import iuh.fit.se.paymentservice.dto.response.InternalAiMusicQuotaResponse;
import iuh.fit.se.paymentservice.service.AiMusicQuotaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/internal/ai-music")
@RequiredArgsConstructor
public class InternalAiMusicController {

    private final AiMusicQuotaService aiMusicQuotaService;

    @GetMapping("/quota/{userId}")
    public InternalAiMusicQuotaResponse quota(
            @PathVariable UUID userId,
            @RequestParam String periodYm) {
        return aiMusicQuotaService.getQuota(userId, periodYm);
    }

    @PostMapping("/consume")
    public void consume(@Valid @RequestBody InternalAiMusicConsumeRequest request) {
        aiMusicQuotaService.consume(request);
    }
}
