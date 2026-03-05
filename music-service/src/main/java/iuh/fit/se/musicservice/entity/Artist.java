package iuh.fit.se.musicservice.entity;

import iuh.fit.se.musicservice.enums.ArtistStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.util.UUID;

@Getter @Setter @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@Entity
@Table(name = "artists", indexes = {
        @Index(name = "idx_artists_user_id", columnList = "user_id", unique = true),
        @Index(name = "idx_artists_stage_name", columnList = "stage_name", unique = true)
})
public class Artist extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;
    @Column(name = "stage_name", nullable = false, unique = true, length = 100)
    private String stageName;
    @Column(name = "bio", length = 1000)
    private String bio;
    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private ArtistStatus status = ArtistStatus.ACTIVE;
}
