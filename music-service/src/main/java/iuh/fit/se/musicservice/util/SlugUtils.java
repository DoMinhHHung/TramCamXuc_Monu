package iuh.fit.se.musicservice.util;

import java.text.Normalizer;
import java.util.UUID;
import java.util.regex.Pattern;


public final class SlugUtils {

    private static final Pattern DIACRITICS             = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
    private static final Pattern WHITESPACE              = Pattern.compile("\\s+");
    private static final Pattern MULTI_DASH              = Pattern.compile("-+");
    private static final Pattern LEADING_TRAILING_DASH   = Pattern.compile("^-|-+$");
    private static final int     MAX_SLUG_LENGTH = 100;

    private SlugUtils() {}

    public static String generate(String title, UUID id) {
        try {
            String normalized = Normalizer.normalize(title, Normalizer.Form.NFD);
            String slug = DIACRITICS.matcher(normalized).replaceAll("")
                    .toLowerCase()
                    .replaceAll("[^a-z0-9\\s-]", "")
                    .trim();
            slug = WHITESPACE.matcher(slug).replaceAll("-");
            slug = MULTI_DASH.matcher(slug).replaceAll("-");
            slug = LEADING_TRAILING_DASH.matcher(slug).replaceAll("");
            if (slug.length() > MAX_SLUG_LENGTH) slug = slug.substring(0, MAX_SLUG_LENGTH);
            return slug + "-" + id.toString().substring(0, 8);
        } catch (Exception e) {
            return "item-" + id.toString().substring(0, 8);
        }
    }
}


