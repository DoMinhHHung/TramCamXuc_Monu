package iuh.fit.se.musicservice.service.support;

import iuh.fit.se.musicservice.dto.messaging.AiMusicGenerateMessage;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.stream.Collectors;

public final class AiMusicMessagePrompts {

    private AiMusicMessagePrompts() {}

    public static String buildElevenLabsPrompt(AiMusicGenerateMessage m) {
        String style = StringUtils.hasText(m.getStylePrompt())
                ? m.getStylePrompt()
                : "Modern pop song with clear vocals matching the lyrics language.";
        List<String> names = m.getGenreNames();
        String genres = (names == null || names.isEmpty())
                ? ""
                : names.stream().map(String::trim).collect(Collectors.joining(", "));

        return """
                Musical direction: %s
                Genres / mood tags: %s

                The following text is the lyrics. Sing them naturally in the same language as written.
                Keep structure (verses / chorus) if line breaks suggest it.

                --- LYRICS ---
                %s
                """.formatted(style, genres.isEmpty() ? "(not specified)" : genres,
                m.getLyrics() != null ? m.getLyrics() : "");
    }

    public static String buildSonautoStylePrompt(AiMusicGenerateMessage m) {
        String style = StringUtils.hasText(m.getStylePrompt())
                ? m.getStylePrompt()
                : "Modern pop with clear vocals matching the lyrics language.";
        List<String> names = m.getGenreNames();
        String genres = (names == null || names.isEmpty())
                ? ""
                : names.stream().map(String::trim).collect(Collectors.joining(", "));
        int sec = Math.max(15, m.getDurationSeconds());
        String genrePart = genres.isEmpty() ? "" : " Genres / mood: " + genres + ".";
        return (style + genrePart + " Target feel ~" + sec + "s; v2 output is typically ~1m35s.").trim();
    }
}
