package iuh.fit.se.integrationservice.controller;

import iuh.fit.se.integrationservice.service.TranscriptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@Slf4j
public class TranscriptionController {

    private final TranscriptionService transcriptionService;

    /**
     * POST /transcribe
     * Nhận audio file (multipart), trả về text đã transcribe.
     * Yêu cầu người dùng đã đăng nhập (Gateway inject X-Authenticated: true).
     */
    @PostMapping(value = "/transcribe", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    ResponseEntity<Map<String, String>> transcribe(
            @RequestHeader(value = "X-Authenticated", required = false) String authenticated,
            @RequestPart("file") MultipartFile audioFile
    ) {
        if (!"true".equals(authenticated)) {
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Authentication required"));
        }

        if (audioFile == null || audioFile.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Audio file is required"));
        }

        try {
            String text = transcriptionService.transcribe(audioFile);
            return ResponseEntity.ok(Map.of("text", text));
        } catch (IllegalStateException e) {
            log.error("Transcription provider not configured: {}", e.getMessage());
            return ResponseEntity.status(503)
                    .body(Map.of("error", "Transcription service not available"));
        } catch (Exception e) {
            log.error("Transcription failed: {}", e.getMessage());
            return ResponseEntity.status(502)
                    .body(Map.of("error", "Transcription failed: " + e.getMessage()));
        }
    }
}
