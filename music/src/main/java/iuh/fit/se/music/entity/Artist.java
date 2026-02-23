package iuh.fit.se.music.entity;

import iuh.fit.se.core.entity.BaseEntity;
import iuh.fit.se.music.enums.ArtistStatus;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "artists", indexes = {
        @Index(name = "idx_artists_user_id", columnList = "user_id"),
        @Index(name = "idx_artists_stage_name", columnList = "stage_name")
})
public class Artist extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @Column(name = "stage_name", nullable = false, unique = true)
    private String stageName;

    @Column(name = "bio", length = 1000)
    private String bio;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private ArtistStatus status = ArtistStatus.ACTIVE;
}
