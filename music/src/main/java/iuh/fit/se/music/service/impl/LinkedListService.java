package iuh.fit.se.music.service.impl;

import iuh.fit.se.core.exception.AppException;
import iuh.fit.se.core.exception.ErrorCode;
import iuh.fit.se.music.entity.PlaylistSong;
import iuh.fit.se.music.repository.PlaylistRepository;
import iuh.fit.se.music.repository.PlaylistSongRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LinkedListService {

    private final PlaylistSongRepository playlistSongRepository;
    private final PlaylistRepository playlistRepository;

    @Transactional
    public void append(UUID playlistId, PlaylistSong newNode) {
        var tailOpt = playlistSongRepository.findTail(playlistId);

        if (tailOpt.isEmpty()) {
            newNode.setPrevId(null);
            newNode.setNextId(null);
            playlistSongRepository.save(newNode);
            playlistRepository.updateHead(playlistId, newNode.getId());
            log.debug("[LL] playlist={} empty, new HEAD={}", playlistId, newNode.getId());
        } else {
            PlaylistSong tail = tailOpt.get();
            tail.setNextId(newNode.getId());
            newNode.setPrevId(tail.getId());
            newNode.setNextId(null);
            playlistSongRepository.save(tail);
            playlistSongRepository.save(newNode);
            log.debug("[LL] playlist={} appended={} after tail={}", playlistId, newNode.getId(), tail.getId());
        }
    }

    @Transactional
    public void unlink(UUID playlistId, PlaylistSong node) {
        UUID prevId = node.getPrevId();
        UUID nextId = node.getNextId();

        if (prevId != null) {
            playlistSongRepository.findById(prevId).ifPresent(prev -> {
                prev.setNextId(nextId);
                playlistSongRepository.save(prev);
            });
        }

        if (nextId != null) {
            playlistSongRepository.findById(nextId).ifPresent(next -> {
                next.setPrevId(prevId);
                playlistSongRepository.save(next);
            });
        }

        if (prevId == null) {
            playlistRepository.updateHead(playlistId, nextId);
            log.debug("[LL] playlist={} node={} was HEAD, new HEAD={}", playlistId, node.getId(), nextId);
        }

        log.debug("[LL] playlist={} unlinked node={}", playlistId, node.getId());
    }

    @Transactional
    public void move(UUID playlistId, PlaylistSong target,
                     UUID prevNodeId, UUID nextNodeId) {

        if (target.getId().equals(prevNodeId) || target.getId().equals(nextNodeId)) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        Map<UUID, PlaylistSong> nodeMap = playlistSongRepository
                .findAllByPlaylistId(playlistId)
                .stream()
                .collect(Collectors.toMap(PlaylistSong::getId, Function.identity()));

        PlaylistSong prevNode = prevNodeId != null
                ? requireNode(nodeMap, prevNodeId)
                : null;
        PlaylistSong nextNode = nextNodeId != null
                ? requireNode(nodeMap, nextNodeId)
                : null;

        UUID oldPrev = target.getPrevId();
        UUID oldNext = target.getNextId();

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
        if (oldPrev == null) {
            playlistRepository.updateHead(playlistId, oldNext);
        }

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

    /**
     * Reconstruct thứ tự đúng bằng cách walk từ HEAD.
     * O(n) — chỉ gọi khi build response.
     *
     * Có safety limit để tránh vòng lặp vô tận nếu list bị corrupt.
     */
    public List<PlaylistSong> toOrderedList(UUID headId, Map<UUID, PlaylistSong> nodeMap) {
        List<PlaylistSong> result = new ArrayList<>();
        if (headId == null) return result;

        UUID cursor = headId;
        int limit = nodeMap.size() + 1; // safety

        while (cursor != null) {
            PlaylistSong node = nodeMap.get(cursor);
            if (node == null) {
                log.warn("[LL] Broken linked list at node={}", cursor);
                break;
            }
            result.add(node);
            cursor = node.getNextId();
            if (result.size() > limit) {
                log.error("[LL] Cycle detected in playlist linked list!");
                break;
            }
        }

        return result;
    }

    private PlaylistSong requireNode(Map<UUID, PlaylistSong> nodeMap, UUID id) {
        PlaylistSong node = nodeMap.get(id);
        if (node == null) throw new AppException(ErrorCode.INVALID_REQUEST);
        return node;
    }
}