package iuh.fit.se.musicservice.service.impl;

import com.rabbitmq.client.Channel;
import iuh.fit.se.musicservice.config.RabbitMQConfig;
import iuh.fit.se.musicservice.dto.jamendo.JamendoDownloadMessage;
import iuh.fit.se.musicservice.entity.Artist;
import iuh.fit.se.musicservice.entity.Genre;
import iuh.fit.se.musicservice.entity.Song;
import iuh.fit.se.musicservice.enums.SongStatus;
import iuh.fit.se.musicservice.enums.TranscodeStatus;
import iuh.fit.se.musicservice.repository.ArtistRepository;
import iuh.fit.se.musicservice.repository.GenreRepository;
import iuh.fit.se.musicservice.repository.SongRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JamendoDownloadWorkerTest {

    @Mock
    private RestTemplate restTemplate;
    @Mock
    private MinioStorageService storageService;
    @Mock
    private SongRepository songRepository;
    @Mock
    private GenreRepository genreRepository;
    @Mock
    private ArtistRepository artistRepository;
    @Mock
    private RabbitTemplate rabbitTemplate;
    @Mock
    private Channel channel;

    @InjectMocks
    private JamendoDownloadWorker worker;

    private JamendoDownloadMessage message;

    @BeforeEach
    void setUp() {
        message = JamendoDownloadMessage.builder()
                .jamendoId("12345")
                .title("Đêm Trăng Dịu Êm")
                .audioUrl("https://cdn.jamendo.com/audio.mp3")
                .thumbnailUrl("https://cdn.jamendo.com/thumb.jpg")
                .artistStageName("Midnight Artist")
                .artistJamendoId("artist-1")
                .durationSeconds(188)
                .genreTags(List.of("indie pop", "rock", "unknown-tag"))
                .build();
    }

    @Test
    void processDownload_happyPath_shouldUploadSavePublishAndAck() throws Exception {
        byte[] audioBytes = "mp3-bytes".getBytes();
        Genre pop = Genre.builder().id(UUID.randomUUID()).name("Pop").build();
        Genre rock = Genre.builder().id(UUID.randomUUID()).name("Rock").build();
        Artist artist = Artist.builder()
                .id(UUID.randomUUID())
                .stageName("Midnight Artist")
                .avatarUrl("https://cdn.jamendo.com/thumb.jpg")
                .isJamendo(true)
                .build();

        when(songRepository.existsByJamendoId("12345")).thenReturn(false);
        when(restTemplate.getForObject(message.getAudioUrl(), byte[].class)).thenReturn(audioBytes);
        when(genreRepository.findByNameIgnoreCase("Pop")).thenReturn(Optional.of(pop));
        when(genreRepository.findByNameIgnoreCase("Rock")).thenReturn(Optional.of(rock));
        when(artistRepository.findByStageNameIgnoreCase("Midnight Artist")).thenReturn(Optional.of(artist));
        when(songRepository.save(any(Song.class))).thenAnswer(invocation -> invocation.getArgument(0));

        worker.processDownload(message, channel, 99L);

        ArgumentCaptor<Song> songCaptor = ArgumentCaptor.forClass(Song.class);
        verify(songRepository).save(songCaptor.capture());
        Song savedSong = songCaptor.getValue();

        assertThat(savedSong.getId()).isNotNull();
        assertThat(savedSong.getSlug()).startsWith("dem-trang-diu-em-");
        assertThat(savedSong.getSlug()).hasSizeGreaterThan("dem-trang-diu-em-".length());
        assertThat(savedSong.getJamendoId()).isEqualTo("12345");
        assertThat(savedSong.getRawFileKey()).isEqualTo("raw/jamendo/12345.mp3");
        assertThat(savedSong.getStatus()).isEqualTo(SongStatus.DRAFT);
        assertThat(savedSong.getTranscodeStatus()).isEqualTo(TranscodeStatus.PENDING);
        assertThat(savedSong.getGenres()).extracting(Genre::getName).containsExactlyInAnyOrder("Pop", "Rock");

        verify(storageService).uploadRawBytes("raw/jamendo/12345.mp3", audioBytes, "audio/mpeg");

        ArgumentCaptor<Map<String, Object>> transcodeCaptor = ArgumentCaptor.forClass(Map.class);
        verify(rabbitTemplate).convertAndSend(
                eq(RabbitMQConfig.MUSIC_EXCHANGE),
                eq(RabbitMQConfig.TRANSCODE_ROUTING_KEY),
                transcodeCaptor.capture());

        Map<String, Object> transcodeMessage = transcodeCaptor.getValue();
        assertThat(transcodeMessage).containsEntry("rawFileKey", "raw/jamendo/12345.mp3");
        assertThat(transcodeMessage).containsEntry("fileExtension", "mp3");
        assertThat(transcodeMessage).containsKey("songId");

        verify(channel).basicAck(99L, false);
        verify(channel, never()).basicNack(anyLong(), anyBoolean(), anyBoolean());
    }

    @Test
    void processDownload_duplicateSong_shouldAckAndSkipIoAndSave() throws Exception {
        when(songRepository.existsByJamendoId("12345")).thenReturn(true);

        worker.processDownload(message, channel, 100L);

        verify(channel).basicAck(100L, false);
        verify(channel, never()).basicNack(anyLong(), anyBoolean(), anyBoolean());
        verifyNoInteractions(restTemplate, storageService, genreRepository, artistRepository, rabbitTemplate);
        verify(songRepository, never()).save(any(Song.class));
    }

    @Test
    void processDownload_downloadFailure_shouldNackToDlq() throws Exception {
        when(songRepository.existsByJamendoId("12345")).thenReturn(false);
        when(restTemplate.getForObject(message.getAudioUrl(), byte[].class))
                .thenThrow(new RestClientException("Jamendo unavailable"));

        worker.processDownload(message, channel, 101L);

        verify(channel).basicNack(101L, false, false);
        verify(channel, never()).basicAck(anyLong(), anyBoolean());
        verify(storageService, never()).uploadRawBytes(anyString(), any(), anyString());
        verify(songRepository, never()).save(any(Song.class));
        verify(rabbitTemplate, never()).convertAndSend(anyString(), anyString(), Optional.ofNullable(any()));
    }

    @Test
    void processDownload_whenAckThrowsIOException_shouldNotNack() throws Exception {
        when(songRepository.existsByJamendoId("12345")).thenReturn(true);
        doThrow(new IOException("channel closed")).when(channel).basicAck(102L, false);

        worker.processDownload(message, channel, 102L);

        verify(channel).basicAck(102L, false);
        verify(channel, never()).basicNack(anyLong(), anyBoolean(), anyBoolean());
    }

    @Test
    void processDownload_genreWhitelist_shouldDiscardUnknownTags() throws Exception {
        message.setGenreTags(List.of("unknown1", "UNKNOWN2", "  ", "techno"));
        byte[] audioBytes = "content".getBytes();
        Genre electronic = Genre.builder().id(UUID.randomUUID()).name("Electronic").build();
        Artist artist = Artist.builder().id(UUID.randomUUID()).stageName("Midnight Artist").isJamendo(true).build();

        when(songRepository.existsByJamendoId("12345")).thenReturn(false);
        when(restTemplate.getForObject(message.getAudioUrl(), byte[].class)).thenReturn(audioBytes);
        when(genreRepository.findByNameIgnoreCase("Electronic")).thenReturn(Optional.of(electronic));
        when(artistRepository.findByStageNameIgnoreCase("Midnight Artist")).thenReturn(Optional.of(artist));
        when(songRepository.save(any(Song.class))).thenAnswer(invocation -> invocation.getArgument(0));

        worker.processDownload(message, channel, 103L);

        ArgumentCaptor<Song> songCaptor = ArgumentCaptor.forClass(Song.class);
        verify(songRepository).save(songCaptor.capture());
        Set<Genre> genres = songCaptor.getValue().getGenres();

        assertThat(genres).hasSize(1);
        assertThat(genres).extracting(Genre::getName).containsExactly("Electronic");
        verify(genreRepository, times(1)).findByNameIgnoreCase("Electronic");
        verify(channel).basicAck(103L, false);
    }
}
