package iuh.fit.se.identityservice.repository;

import iuh.fit.se.identityservice.entity.RefreshToken;
import iuh.fit.se.identityservice.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByToken(String token);

    @Modifying
    void deleteByUser(User user);
}