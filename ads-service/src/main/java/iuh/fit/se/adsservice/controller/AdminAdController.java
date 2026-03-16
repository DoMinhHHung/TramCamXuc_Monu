package iuh.fit.se.adsservice.controller;

import iuh.fit.se.adsservice.dto.request.CreateAdRequest;
import iuh.fit.se.adsservice.dto.request.UpdateAdRequest;
import iuh.fit.se.adsservice.dto.response.AdResponse;
import iuh.fit.se.adsservice.dto.response.AdStatsResponse;
import iuh.fit.se.adsservice.enums.AdStatus;
import iuh.fit.se.adsservice.service.AdService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/admin/ads")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin - Ads", description = "Admin APIs for managing audio advertisements")
public class AdminAdController {

    private final AdService adService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Create a new ad (upload MP3 + metadata)")
    public ResponseEntity<AdResponse> createAd(
            @RequestPart("metadata") @Valid CreateAdRequest request,
            @RequestPart("audio") MultipartFile audioFile) {
        AdResponse response = adService.createAd(request, audioFile);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "List all ads (paged, optional filter by status/advertiser)")
    public ResponseEntity<Page<AdResponse>> getAllAds(
            @RequestParam(required = false) AdStatus status,
            @RequestParam(required = false) String advertiserName,
            Pageable pageable) {
        return ResponseEntity.ok(adService.getAllAds(status, advertiserName, pageable));
    }

    @GetMapping("/{adId}")
    @Operation(summary = "Get ad by ID")
    public ResponseEntity<AdResponse> getAdById(@PathVariable UUID adId) {
        return ResponseEntity.ok(adService.getAdById(adId));
    }

    @PutMapping(value = "/{adId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Update ad metadata and/or replace audio file")
    public ResponseEntity<AdResponse> updateAd(
            @PathVariable UUID adId,
            @RequestPart("metadata") UpdateAdRequest request,
            @RequestPart(value = "audio", required = false) MultipartFile audioFile) {
        return ResponseEntity.ok(adService.updateAd(adId, request, audioFile));
    }

    @DeleteMapping("/{adId}")
    @Operation(summary = "Archive (soft-delete) an ad")
    public ResponseEntity<Void> deleteAd(@PathVariable UUID adId) {
        adService.deleteAd(adId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{adId}/stats")
    @Operation(summary = "Get detailed stats for a single ad (with optional date range)")
    public ResponseEntity<AdStatsResponse> getStats(
            @PathVariable UUID adId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(adService.getAdStats(adId, from, to));
    }
}
