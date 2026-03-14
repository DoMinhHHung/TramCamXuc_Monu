package iuh.fit.se.musicservice.service.impl;

import iuh.fit.se.musicservice.entity.PlaylistSong;
import iuh.fit.se.musicservice.exception.AppException;
import iuh.fit.se.musicservice.exception.ErrorCode;
import iuh.fit.se.musicservice.repository.PlaylistRepository;
import iuh.fit.se.musicservice.repository.PlaylistSongRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LinkedListService {

    private final PlaylistSongRepository playlistSongRepository;
    private final PlaylistRepository     playlistRepository;

    // ─────────────────────────────────────────────────────────────────────────
    // APPEND — thêm node vào cuối list
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public void append(UUID playlistId, PlaylistSong newNode) {

        List<PlaylistSong> tailCandidates = playlistSongRepository.findTailCandidates(playlistId);

        if (tailCandidates.size() > 1) {
            log.warn("[LL-HEAL] playlist={} detected {} tail nodes. Healing...", playlistId, tailCandidates.size());

            PlaylistSong correctTail = tailCandidates.get(0);

            for (int i = 1; i < tailCandidates.size(); i++) {
                PlaylistSong broken = tailCandidates.get(i);

                broken.setNextId(null);
                playlistSongRepository.save(broken);

                log.warn("[LL-HEAL] fixed broken tail node={}", broken.getId());
            }

            tailCandidates = List.of(correctTail);
        }

        PlaylistSong tail = tailCandidates.isEmpty() ? null : tailCandidates.get(0);

        if (tail == null) {

            newNode.setPrevId(null);
            newNode.setNextId(null);

            playlistSongRepository.save(newNode);
            playlistRepository.updateHead(playlistId, newNode.getId());

            log.debug("[LL] playlist={} empty → new HEAD={}", playlistId, newNode.getId());

        } else {

            tail.setNextId(newNode.getId());

            newNode.setPrevId(tail.getId());
            newNode.setNextId(null);

            playlistSongRepository.save(tail);
            playlistSongRepository.save(newNode);

            log.debug("[LL] playlist={} appended={} after tail={}", playlistId, newNode.getId(), tail.getId());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UNLINK — tháo node ra khỏi list (không xóa row)
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public void unlink(UUID playlistId, PlaylistSong node) {
        UUID prevId = node.getPrevId();
        UUID nextId = node.getNextId();

        // Nối prev → next
        if (prevId != null) {
            playlistSongRepository.findById(prevId).ifPresent(prev -> {
                prev.setNextId(nextId);
                playlistSongRepository.save(prev);
            });
        }

        // Nối next → prev
        if (nextId != null) {
            playlistSongRepository.findById(nextId).ifPresent(next -> {
                next.setPrevId(prevId);
                playlistSongRepository.save(next);
            });
        }

        // Nếu node đang là HEAD → cập nhật HEAD sang node kế tiếp
        if (prevId == null) {
            playlistRepository.updateHead(playlistId, nextId);
            log.debug("[LL] playlist={} node={} was HEAD → new HEAD={}", playlistId, node.getId(), nextId);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MOVE — drag & drop: tháo node ra rồi cắm vào vị trí mới
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public void move(UUID playlistId, PlaylistSong target, UUID prevNodeId, UUID nextNodeId) {

        // Tự kéo vào chính mình → noop
        if (target.getId().equals(prevNodeId) || target.getId().equals(nextNodeId)) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        // Load toàn bộ nodes 1 query → tránh N+1
        Map<UUID, PlaylistSong> nodeMap = playlistSongRepository
                .findAllByPlaylistId(playlistId)
                .stream()
                .collect(Collectors.toMap(PlaylistSong::getId, Function.identity()));

        PlaylistSong prevNode = prevNodeId != null ? requireNode(nodeMap, prevNodeId) : null;
        PlaylistSong nextNode = nextNodeId != null ? requireNode(nodeMap, nextNodeId) : null;

        UUID oldPrev = target.getPrevId();
        UUID oldNext = target.getNextId();

        // Step 1: tháo target ra khỏi vị trí cũ
        if (oldPrev != null) {
            PlaylistSong op = requireNode(nodeMap, oldPrev);
            op.setNextId(oldNext);
            playlistSongRepository.save(op);
        }
        if (oldNext != null) {
            PlaylistSong on = requireNode(nodeMap, oldNext);
            on.setPrevId(oldPrev);
            playlistSongRepository.save(on);
        }
        // Nếu target là HEAD cũ → nâng node kế tiếp lên
        if (oldPrev == null) {
            playlistRepository.updateHead(playlistId, oldNext);
        }

        // Step 2: cắm target vào vị trí mới
        target.setPrevId(prevNodeId);
        target.setNextId(nextNodeId);
        playlistSongRepository.save(target);

        if (prevNode != null) {
            prevNode.setNextId(target.getId());
            playlistSongRepository.save(prevNode);
        }
        if (nextNode != null) {
            nextNode.setPrevId(target.getId());
            playlistSongRepository.save(nextNode);
        }

        // Kéo lên đầu → update HEAD
        if (prevNodeId == null) {
            playlistRepository.updateHead(playlistId, target.getId());
        }

        log.info("[LL] playlist={} moved node={} prev={} next={}",
                playlistId, target.getId(), prevNodeId, nextNodeId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TRAVERSE — walk từ HEAD, xây list đúng thứ tự
    // O(n) — chỉ gọi khi build response
    // ─────────────────────────────────────────────────────────────────────────

    public List<PlaylistSong> toOrderedList(UUID headId, Map<UUID, PlaylistSong> nodeMap) {
        List<PlaylistSong> result = new ArrayList<>();
        Set<UUID> visited = new HashSet<>();
        if (headId == null) {
            return nodeMap.values().stream()
                    .sorted(Comparator.comparing(PlaylistSong::getAddedAt))
                    .toList();
        }

        UUID cursor = headId;
        int limit = nodeMap.size() + 1; // safety: tránh cycle vô tận

        while (cursor != null) {
            PlaylistSong node = nodeMap.get(cursor);
            if (node == null) {
                log.warn("[LL] Broken linked list at node={}", cursor);
                break;
            }
            result.add(node);
            visited.add(node.getId());
            cursor = node.getNextId();
            if (result.size() > limit) {
                log.error("[LL] Cycle detected in playlist={} linked list!", headId);
                break;
            }
        }

        if (visited.size() < nodeMap.size()) {
            List<PlaylistSong> detachedNodes = nodeMap.values().stream()
                    .filter(node -> !visited.contains(node.getId()))
                    .sorted(Comparator.comparing(PlaylistSong::getAddedAt))
                    .toList();
            if (!detachedNodes.isEmpty()) {
                log.warn("[LL] Found {} detached nodes while reading playlist. Auto-append to response.", detachedNodes.size());
                result.addAll(detachedNodes);
            }
        }

        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    private PlaylistSong requireNode(Map<UUID, PlaylistSong> nodeMap, UUID id) {
        PlaylistSong node = nodeMap.get(id);
        if (node == null) throw new AppException(ErrorCode.INVALID_REQUEST);
        return node;
    }
}
