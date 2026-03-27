package iuh.fit.se.musicservice.util;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.se.musicservice.enums.LyricFormat;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.UtilityClass;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@UtilityClass
public class LyricParser {

    private static final Pattern LRC_TIME_TAG =
            Pattern.compile("\\[(\\d{2}):(\\d{2})\\.(\\d{2,3})\\]");

    private static final Pattern SRT_TIME =
            Pattern.compile("(\\d{2}):(\\d{2}):(\\d{2}),(\\d{3})");

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Data @Builder
    public static class LyricLine {
        private Long timeMs;
        private String text;
    }

    public static class ParseResult {
        public final List<LyricLine> lines;
        public final String searchContent;
        public final String parsedLinesJson;

        public ParseResult(List<LyricLine> lines) {
            this.lines = lines;
            this.searchContent = buildSearchContent(lines);
            try {
                this.parsedLinesJson = MAPPER.writeValueAsString(lines);
            } catch (JsonProcessingException e) {
                throw new RuntimeException("Cannot serialize lyric lines", e);
            }
        }

        private static String buildSearchContent(List<LyricLine> lines) {
            StringBuilder sb = new StringBuilder();
            for (LyricLine line : lines) {
                if (line.getText() != null && !line.getText().isBlank()) {
                    sb.append(line.getText().trim()).append(" ");
                }
            }
            return sb.toString().trim();
        }
    }

    public static ParseResult parse(String content, LyricFormat format) {
        return switch (format) {
            case LRC -> parseLrc(content);
            case SRT -> parseSrt(content);
            case TXT -> parseTxt(content);
        };
    }

    public static LyricFormat detectFormat(String originalFilename, String content) {
        if (originalFilename != null) {
            String lower = originalFilename.toLowerCase();
            if (lower.endsWith(".lrc")) return LyricFormat.LRC;
            if (lower.endsWith(".srt")) return LyricFormat.SRT;
            if (lower.endsWith(".txt")) return LyricFormat.TXT;
        }
        if (content.contains("[") && LRC_TIME_TAG.matcher(content).find()) {
            return LyricFormat.LRC;
        }
        if (content.matches("(?s).*\\d+\\s*\\n\\d{2}:\\d{2}:\\d{2},\\d{3}.*")) {
            return LyricFormat.SRT;
        }
        return LyricFormat.TXT;
    }

    private static ParseResult parseLrc(String content) {
        List<LyricLine> lines = new ArrayList<>();
        String[] rawLines = content.split("\\r?\\n");

        for (String rawLine : rawLines) {
            if (rawLine.matches("\\[(ar|ti|al|by|offset|re|ve):.*\\]")) continue;

            List<Long> timestamps = new ArrayList<>();
            String text = rawLine;

            Matcher m = LRC_TIME_TAG.matcher(rawLine);
            while (m.find()) {
                int min  = Integer.parseInt(m.group(1));
                int sec  = Integer.parseInt(m.group(2));
                int ms   = Integer.parseInt(m.group(3));
                if (m.group(3).length() == 2) ms *= 10;
                timestamps.add((long)(min * 60_000 + sec * 1_000 + ms));
                text = text.replace(m.group(0), "");
            }

            text = text.trim();
            if (text.isBlank() && timestamps.isEmpty()) continue;

            for (Long ts : timestamps) {
                lines.add(LyricLine.builder()
                        .timeMs(ts)
                        .text(text)
                        .build());
            }
        }

        lines.sort(Comparator.comparingLong(l -> l.getTimeMs() != null ? l.getTimeMs() : 0L));
        return new ParseResult(lines);
    }

    private static ParseResult parseSrt(String content) {
        List<LyricLine> lines = new ArrayList<>();
        String[] blocks = content.split("\\r?\\n\\r?\\n");

        for (String block : blocks) {
            String[] blockLines = block.trim().split("\\r?\\n");
            if (blockLines.length < 3) continue;

            Matcher m = SRT_TIME.matcher(blockLines[1]);
            if (!m.find()) continue;

            long startMs = toMs(
                    Integer.parseInt(m.group(1)),
                    Integer.parseInt(m.group(2)),
                    Integer.parseInt(m.group(3)),
                    Integer.parseInt(m.group(4))
            );

            StringBuilder textBuilder = new StringBuilder();
            for (int i = 2; i < blockLines.length; i++) {
                String stripped = blockLines[i]
                        .replaceAll("<[^>]+>", "").trim();
                if (!stripped.isEmpty()) {
                    if (textBuilder.length() > 0) textBuilder.append(" ");
                    textBuilder.append(stripped);
                }
            }

            if (!textBuilder.toString().isBlank()) {
                lines.add(LyricLine.builder()
                        .timeMs(startMs)
                        .text(textBuilder.toString())
                        .build());
            }
        }

        return new ParseResult(lines);
    }

    private static long toMs(int h, int m, int s, int ms) {
        return (long)h * 3_600_000 + m * 60_000 + s * 1_000 + ms;
    }

    private static ParseResult parseTxt(String content) {
        List<LyricLine> lines = new ArrayList<>();
        for (String line : content.split("\\r?\\n")) {
            String trimmed = line.trim();
            if (!trimmed.isEmpty()) {
                lines.add(LyricLine.builder()
                        .timeMs(null)
                        .text(trimmed)
                        .build());
            }
        }
        return new ParseResult(lines);
    }
}