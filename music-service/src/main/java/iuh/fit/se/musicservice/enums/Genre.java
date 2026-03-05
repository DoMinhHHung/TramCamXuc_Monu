package iuh.fit.se.musicservice.enums;

import com.fasterxml.jackson.annotation.JsonValue;

public enum Genre {
    POP("Pop"),
    ROCK("Rock"),
    JAZZ("Jazz"),
    CLASSICAL("Classical"),
    HIP_HOP("Hip Hop"),
    R_AND_B("R&B"),
    ELECTRONIC("Electronic"),
    FOLK("Folk"),
    COUNTRY("Country"),
    INDIE("Indie"),
    METAL("Metal"),
    BLUES("Blues"),
    REGGAE("Reggae"),
    LATIN("Latin"),
    K_POP("K-Pop"),
    V_POP("V-Pop"),
    BALLAD("Ballad"),
    EDM("EDM"),
    TRAP("Trap"),
    LO_FI("Lo-Fi"),
    ALTERNATIVE("Alternative"),
    PUNK("Punk"),
    SOUL("Soul"),
    FUNK("Funk"),
    GOSPEL("Gospel");

    private final String displayName;

    Genre(String displayName) {
        this.displayName = displayName;
    }

    @JsonValue
    public String getDisplayName() {
        return displayName;
    }
}