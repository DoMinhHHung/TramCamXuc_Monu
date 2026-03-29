package iuh.fit.se.musicservice.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "album_favorites",
        uniqueConstraints = @UniqueConstraint(name = "uq_album_fav_user_album", columnNames = {"user_id", "album_id"}),
        indexes = {
                @Index(name = "idx_album_fav_album", columnList = "album_id"),
                @Index(name = "idx_album_fav_user", columnList = "user_id")
        })
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlbumFavorite extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "album_id", nullable = false)
    private UUID albumId;
}
