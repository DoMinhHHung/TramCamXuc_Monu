package iuh.fit.se.identityservice.entity;

import iuh.fit.se.identityservice.enums.AccountStatus;
import iuh.fit.se.identityservice.enums.AuthProvider;
import iuh.fit.se.identityservice.enums.Gender;
import iuh.fit.se.identityservice.enums.Role;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "users",
        indexes = { 
            @Index(name = "idx_users_email", columnList = "email"),
            @Index(name = "idx_users_role_status", columnList = "role, status"),
            @Index(name = "idx_users_created_at",  columnList = "created_at DESC"),
         }
)
public class User extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "email", unique = true, nullable = false)
    private String email;

    @Column(name = "password")
    private String password;

    @Column(name = "dob")
    private LocalDate dob;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender")
    private Gender gender;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RefreshToken> refreshTokens;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    @Builder.Default
    private Role role = Role.USER;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private AccountStatus status = AccountStatus.PENDING_VERIFICATION;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false)
    @Builder.Default
    private AuthProvider provider = AuthProvider.LOCAL;

    @Column(name = "provider_id")
    private String providerId;

    // ── Favorites for onboarding & cold-start recommendations ──────────────────

    /**
     * Flag để check xem user đã pick favorites chưa.
     * - false/null: chưa pick → cần show onboarding screen
     * - true: đã pick → skip onboarding
     */
    @Column(name = "pick_favorite", nullable = false)
    @Builder.Default
    private Boolean pickFavorite = false;

    /**
     * Danh sách genre IDs yêu thích (1-5 genres).
     * Lưu dưới dạng JSON array trong DB: ["uuid1", "uuid2", ...]
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_favorite_genres", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "genre_id")
    @Builder.Default
    private Set<UUID> favoriteGenreIds = new HashSet<>();

    /**
     * Danh sách artist IDs yêu thích (1-3 artists).
     * Lưu dưới dạng JSON array trong DB: ["uuid1", "uuid2", ...]
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_favorite_artists", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "artist_id")
    @Builder.Default
    private Set<UUID> favoriteArtistIds = new HashSet<>();

}