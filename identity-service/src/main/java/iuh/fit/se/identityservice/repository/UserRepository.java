package iuh.fit.se.identityservice.repository;

import iuh.fit.se.identityservice.entity.User;
import iuh.fit.se.identityservice.enums.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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