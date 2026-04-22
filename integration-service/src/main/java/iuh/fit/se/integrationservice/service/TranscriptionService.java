package iuh.fit.se.integrationservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class TranscriptionService {

    private static final String GROQ_URL     = "https://api.groq.com/openai/v1/audio/transcriptions";
    private static final String ASSEMBLY_URL = "https://api.assemblyai.com/v2";

    private final RestTemplate restTemplate;

    @Value("${groq.api-key:}")
    private String groqApiKey;

    @Value("${assembly.api-key:}")
    private String assemblyApiKey;

    /**
     * Transcribe audio file sang text.
     * Thử GROQ trước (nhanh, streaming). Nếu thất bại, fallback sang AssemblyAI.
     */
    public String transcribe(MultipartFile audioFile) throws IOException {
        byte[] audioBytes = audioFile.getBytes();
        String originalFilename = audioFile.getOriginalFilename() != null
                ? audioFile.getOriginalFilename() : "recording.m4a";

        if (groqApiKey != null && !groqApiKey.isBlank()) {
            try {
                return transcribeWithGroq(audioBytes, originalFilename);
            } catch (Exception e) {
                log.warn("Groq transcription failed, falling back to AssemblyAI: {}", e.getMessage());
            }
        }

        if (assemblyApiKey != null && !assemblyApiKey.isBlank()) {
            return transcribeWithAssembly(audioBytes);
        }

        throw new IllegalStateException("No transcription provider configured");
    }

    private String transcribeWithGroq(byte[] audioBytes, String filename) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.setBearerAuth(groqApiKey);

        ByteArrayResource fileResource = new ByteArrayResource(audioBytes) {
            @Override
            public String getFilename() { return filename; }
        };

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", fileResource);
        body.add("model", "whisper-large-v3");
        body.add("language", "vi");

        ResponseEntity<Map> response = restTemplate.exchange(
                GROQ_URL,
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                Map.class
        );

        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new RuntimeException("Groq returned " + response.getStatusCode());
        }

        Object text = response.getBody().get("text");
        if (text == null) throw new RuntimeException("Groq response missing 'text' field");
        return text.toString().trim();
    }

    private String transcribeWithAssembly(byte[] audioBytes) {
        HttpHeaders uploadHeaders = new HttpHeaders();
        uploadHeaders.set("Authorization", assemblyApiKey);
        uploadHeaders.setContentType(MediaType.APPLICATION_OCTET_STREAM);

        ResponseEntity<Map> uploadRes = restTemplate.exchange(
                ASSEMBLY_URL + "/upload",
                HttpMethod.POST,
                new HttpEntity<>(audioBytes, uploadHeaders),
                Map.class
        );

        if (uploadRes.getBody() == null) throw new RuntimeException("AssemblyAI upload failed");
        String uploadUrl = (String) uploadRes.getBody().get("upload_url");

        HttpHeaders transcriptHeaders = new HttpHeaders();
        transcriptHeaders.set("Authorization", assemblyApiKey);
        transcriptHeaders.setContentType(MediaType.APPLICATION_JSON);

        Map<String, String> transcriptBody = Map.of(
                "audio_url", uploadUrl,
                "language_code", "vi"
        );

        ResponseEntity<Map> transcriptRes = restTemplate.exchange(
                ASSEMBLY_URL + "/transcript",
                HttpMethod.POST,
                new HttpEntity<>(transcriptBody, transcriptHeaders),
                Map.class
        );

        if (transcriptRes.getBody() == null) throw new RuntimeException("AssemblyAI transcript request failed");
        String transcriptId = (String) transcriptRes.getBody().get("id");

        HttpHeaders pollHeaders = new HttpHeaders();
        pollHeaders.set("Authorization", assemblyApiKey);

        // Poll tối đa 60 lần × 1 giây = 60 giây
        for (int i = 0; i < 60; i++) {
            try {
                Thread.sleep(1_000);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("Transcription polling interrupted", ie);
            }

            ResponseEntity<Map> pollRes = restTemplate.exchange(
                    ASSEMBLY_URL + "/transcript/" + transcriptId,
                    HttpMethod.GET,
                    new HttpEntity<>(pollHeaders),
                    Map.class
            );

            if (pollRes.getBody() == null) continue;
            String status = (String) pollRes.getBody().get("status");

            if ("completed".equals(status)) {
                Object text = pollRes.getBody().get("text");
                return text != null ? text.toString().trim() : "";
            }
            if ("error".equals(status)) {
                throw new RuntimeException("AssemblyAI processing error");
            }
        }

        throw new RuntimeException("AssemblyAI transcription timed out after 60 seconds");
    }
}
