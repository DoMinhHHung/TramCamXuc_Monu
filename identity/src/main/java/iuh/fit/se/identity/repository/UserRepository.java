package iuh.fit.se.identity.repository;

import iuh.fit.se.identity.entity.User;
import iuh.fit.se.identity.enums.Role;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    boolean existsByEmail(String email);
    Optional<User> findByEmail(String email);

    Page<User> findAllByRoleNot(Role role, Pageable pageable);
}