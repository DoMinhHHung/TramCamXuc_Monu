import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../config/colors';
import { STATS_EMOJIS } from '../config/emojis';
import { apiClient } from '../services/api';
import { getMySongs, Song } from '../services/music';
import {
    getListeningInsights,
    ListeningInsights,
    ArtistStat,
    SongStat,
    GenreStat,
    HourlyListenCount,
    DailyListenCount,
} from '../services/recommendation';
import { getSongHeartCount, getSongListenCount, getSongShareCount } from '../services/social';

// ─── Period selector ──────────────────────────────────────────────────────────

type Period = 7 | 30 | 90;

const PERIODS: { label: string; value: Period }[] = [
    { label: '7 ngày', value: 7 },
    { label: '30 ngày', value: 30 },
    { label: '90 ngày', value: 90 },
];

// ─── Bar chart helper (inline, không cần lib ngoài) ──────────────────────────

const MiniBarChart = ({
                          data,
                          labels,
                          maxHeight = 60,
                          barWidth = 10,
                          gap = 4,
                          highlightIndex,
                      }: {
    data: number[];
    labels?: string[];
    maxHeight?: number;
    barWidth?: number;
    gap?: number;
    highlightIndex?: number;
}) => {
    const max = Math.max(...data, 1);
    return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap }}>
            {data.map((val, i) => {
                const h = Math.max(2, Math.round((val / max) * maxHeight));
                const isHighlight = i === highlightIndex;
                return (
                    <View key={i} style={{ alignItems: 'center', gap: 2 }}>
                        <View
                            style={{
                                width: barWidth,
                                height: h,
                                borderRadius: 3,
                                backgroundColor: isHighlight ? COLORS.accent : COLORS.glass20,
                            }}
                        />
                        {labels?.[i] !== undefined && (
                            <Text style={{ color: COLORS.glass40, fontSize: 8 }}>{labels[i]}</Text>
                        )}
                    </View>
                );
            })}
        </View>
    );
};

// ─── Stat card ────────────────────────────────────────────────────────────────

const StatCard = ({
                      emoji,
                      value,
                      label,
                  }: {
    emoji: string;
    value: string;
    label: string;
}) => (
    <View style={styles.statCard}>
        <Text style={styles.statEmoji}>{emoji}</Text>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

// ─── Section wrapper ──────────────────────────────────────────────────────────

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {children}
    </View>
);

// ─── Main screen ──────────────────────────────────────────────────────────────

export const InsightsScreen = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    const [period, setPeriod] = useState<Period>(30);
    const [insights, setInsights] = useState<ListeningInsights | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── Artist stats (for artists only) ───────────────────────────────────────
    const [isArtist, setIsArtist] = useState<boolean>(false);
    const [artistSongs, setArtistSongs] = useState<Array<{
        song: Song;
        listens: number;
        likes: number;
        shares: number;
    }>>([]);

    const load = useCallback(async (p: Period, silent = false) => {
        try {
            if (!silent) setLoading(true);
            setError(null);
            const data = await getListeningInsights(p);
            setInsights(data);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Không thể tải thống kê');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const loadArtistStats = useCallback(async () => {
        try {
            await apiClient.get('/artists/me');
            setIsArtist(true);

            const mySongsPage = await getMySongs({ page: 1, size: 20, noCache: true });
            const songs = mySongsPage.content ?? [];
            const rows = await Promise.all(
                songs.map(async (song) => {
                    const [listens, likes, shares] = await Promise.all([
                        getSongListenCount(song.id).catch(() => 0),
                        getSongHeartCount(song.id).catch(() => 0),
                        getSongShareCount(song.id).catch(() => 0),
                    ]);
                    return { song, listens, likes, shares };
                }),
            );
            setArtistSongs(rows);
        } catch {
            setIsArtist(false);
            setArtistSongs([]);
        }
    }, []);

    useEffect(() => {
        void load(period);
        void loadArtistStats();
    }, [period, load]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        void load(period, true);
    }, [period, load]);

    // ── Peak hour ──────────────────────────────────────────────────────────────
    const peakHour = insights?.listeningByHour
        ? insights.listeningByHour.reduce(
            (best, h) => (h.count > best.count ? h : best),
            { hour: 0, count: 0 },
        )
        : null;

    const formatHour = (h: number) => {
        if (h === 0) return '12 AM';
        if (h < 12) return `${h} AM`;
        if (h === 12) return '12 PM';
        return `${h - 12} PM`;
    };

    // ── Peak day ───────────────────────────────────────────────────────────────
    const peakDay = insights?.listeningByDayOfWeek
        ? insights.listeningByDayOfWeek.reduce(
            (best, d) => (d.count > best.count ? d : best),
            { dayOfWeek: 0, dayLabel: '', count: 0 },
        )
        : null;

    // ── Empty state ────────────────────────────────────────────────────────────
    const isEmpty =
        insights &&
        insights.totalListeningMinutesLast30Days === 0 &&
        insights.uniqueSongsLast30Days === 0;

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.white} />
                </Pressable>
                <Text style={styles.headerTitle}>Thống kê nghe nhạc</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Period selector */}
            <View style={styles.periodRow}>
                {PERIODS.map((p) => (
                    <Pressable
                        key={p.value}
                        style={[styles.periodBtn, period === p.value && styles.periodBtnActive]}
                        onPress={() => setPeriod(p.value)}
                    >
                        <Text
                            style={[styles.periodLabel, period === p.value && styles.periodLabelActive]}
                        >
                            {p.label}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {/* Content */}
            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={COLORS.accent} />
                    <Text style={styles.loadingText}>Đang phân tích lịch sử nghe nhạc...</Text>
                </View>
            ) : error ? (
                <View style={styles.centered}>
                    <Text style={styles.errorEmoji}>😕</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <Pressable style={styles.retryBtn} onPress={() => void load(period)}>
                        <Text style={styles.retryLabel}>Thử lại</Text>
                    </Pressable>
                </View>
            ) : isEmpty ? (
                <View style={styles.centered}>
                    <Text style={styles.errorEmoji}>🎵</Text>
                    <Text style={styles.emptyTitle}>Hãy nghe thêm nhạc!</Text>
                    <Text style={styles.emptyDesc}>
                        Thống kê của bạn sẽ xuất hiện tại đây sau khi bạn nghe nhạc nhiều hơn.
                    </Text>
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={COLORS.accent}
                        />
                    }
                >
                    {/* Mood label */}
                    {insights?.dominantMoodLabel && (
                        <LinearGradient
                            colors={[COLORS.gradPurple, COLORS.gradIndigo]}
                            style={styles.moodBanner}
                        >
                            <Text style={styles.moodLabel}>Tâm trạng âm nhạc của bạn</Text>
                            <Text style={styles.moodValue}>{insights.dominantMoodLabel}</Text>
                        </LinearGradient>
                    )}

                    {/* Summary stats */}
                    <Section title={`${STATS_EMOJIS.overview} Tổng quan`}>
                        <View style={styles.statsGrid}>
                            <StatCard
                                emoji={STATS_EMOJIS.duration}
                                value={`${insights?.totalListeningMinutesLast30Days ?? 0}`}
                                label="phút nghe nhạc"
                            />
                            <StatCard
                                emoji={STATS_EMOJIS.overview}
                                value={`${insights?.uniqueSongsLast30Days ?? 0}`}
                                label="bài khác nhau"
                            />
                            <StatCard
                                emoji={STATS_EMOJIS.streak}
                                value={`${insights?.currentStreakDays ?? 0}`}
                                label="ngày liên tiếp"
                            />
                            <StatCard
                                emoji={STATS_EMOJIS.achievement}
                                value={`${insights?.longestStreakDays ?? 0}`}
                                label="streak dài nhất"
                            />
                        </View>
                    </Section>

                    {/* Hourly distribution */}
                    {!!insights?.listeningByHour?.length && (
                        <Section title={`🕐 Giờ nghe nhạc${peakHour?.count ? ` · Peak ${formatHour(peakHour.hour)}` : ''}`}>
                            <View style={styles.chartWrap}>
                                <MiniBarChart
                                    data={insights.listeningByHour.map((h) => h.count)}
                                    labels={insights.listeningByHour.map((h) =>
                                        h.hour % 6 === 0 ? String(h.hour) : '',
                                    )}
                                    maxHeight={80}
                                    barWidth={9}
                                    gap={3}
                                    highlightIndex={peakHour?.hour}
                                />
                            </View>
                            <Text style={styles.chartHint}>
                                Bạn nghe nhạc nhiều nhất lúc{' '}
                                <Text style={{ color: COLORS.accent }}>
                                    {peakHour ? formatHour(peakHour.hour) : '—'}
                                </Text>
                            </Text>
                        </Section>
                    )}

                    {/* Day-of-week distribution */}
                    {!!insights?.listeningByDayOfWeek?.length && (
                        <Section title={`📅 Ngày trong tuần${peakDay?.count ? ` · Peak ${peakDay.dayLabel}` : ''}`}>
                            <View style={styles.chartWrap}>
                                <MiniBarChart
                                    data={insights.listeningByDayOfWeek.map((d) => d.count)}
                                    labels={insights.listeningByDayOfWeek.map((d) => d.dayLabel)}
                                    maxHeight={80}
                                    barWidth={28}
                                    gap={6}
                                    highlightIndex={peakDay?.dayOfWeek}
                                />
                            </View>
                        </Section>
                    )}

                    {/* Top genres */}
                    {!!insights?.topGenres?.length && (
                        <Section title="🎼 Thể loại yêu thích">
                            {insights.topGenres.map((g, i) => (
                                <GenreRow key={g.genreId} genre={g} rank={i + 1} />
                            ))}
                        </Section>
                    )}

                    {/* Top artists */}
                    {!!insights?.topArtists?.length && (
                        <Section title="🎤 Nghệ sĩ nghe nhiều nhất">
                            {insights.topArtists.map((a, i) => (
                                <ArtistRow key={a.artistId} artist={a} rank={i + 1} />
                            ))}
                        </Section>
                    )}

                    {/* Most played songs */}
                    {!!insights?.mostPlayedSongs?.length && (
                        <Section title="🔁 Bài nghe nhiều nhất">
                            {insights.mostPlayedSongs.map((s, i) => (
                                <SongRow key={s.songId} song={s} rank={i + 1} />
                            ))}
                        </Section>
                    )}

                    {/* Newly discovered */}
                    {!!insights?.newlyDiscoveredArtistIds?.length && (
                        <Section title="🌟 Khám phá mới (7 ngày)">
                            <Text style={styles.discoveryText}>
                                Bạn đã khám phá{' '}
                                <Text style={{ color: COLORS.accent, fontWeight: '700' }}>
                                    {insights.newlyDiscoveredArtistIds.length} nghệ sĩ mới
                                </Text>{' '}
                                trong 7 ngày qua.
                            </Text>
                        </Section>
                    )}

                    {/* Artist stats */}
                    <Section title="🎛 Thống kê bài hát của bạn">
                        {!isArtist ? (
                            <View style={{ backgroundColor: COLORS.glass06, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.glass10 }}>
                                <Text style={{ color: COLORS.white, fontWeight: '700', marginBottom: 6 }}>
                                    Bạn cần đăng ký Artist để xem thống kê này
                                </Text>
                                <Text style={{ color: COLORS.glass50, fontSize: 13, lineHeight: 18 }}>
                                    Thống kê cho bài hát bạn đăng lên: lượt nghe, lượt thích, lượt chia sẻ.
                                </Text>
                                <Pressable
                                    style={[styles.retryBtn, { alignSelf: 'flex-start', marginTop: 12 }]}
                                    onPress={() => (navigation as any).navigate?.('RegisterArtist')}
                                >
                                    <Text style={styles.retryLabel}>Đăng ký Artist</Text>
                                </Pressable>
                            </View>
                        ) : artistSongs.length === 0 ? (
                            <Text style={{ color: COLORS.glass50, fontSize: 13 }}>
                                Chưa có bài hát nào hoặc chưa có dữ liệu thống kê.
                            </Text>
                        ) : (
                            <View style={{ gap: 10 }}>
                                {artistSongs.map((row) => (
                                    <View
                                        key={row.song.id}
                                        style={{
                                            backgroundColor: COLORS.glass06,
                                            borderRadius: 14,
                                            padding: 12,
                                            borderWidth: 1,
                                            borderColor: COLORS.glass10,
                                        }}
                                    >
                                        <Text style={{ color: COLORS.white, fontWeight: '700' }} numberOfLines={1}>
                                            {row.song.title}
                                        </Text>
                                        <Text style={{ color: COLORS.glass45, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                                            {row.song.primaryArtist?.stageName}
                                        </Text>
                                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                                            <Text style={{ color: COLORS.glass60, fontSize: 12 }}>👂 {row.listens}</Text>
                                            <Text style={{ color: COLORS.glass60, fontSize: 12 }}>❤️ {row.likes}</Text>
                                            <Text style={{ color: COLORS.glass60, fontSize: 12 }}>🔗 {row.shares}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </Section>
                </ScrollView>
            )}
        </View>
    );
};

// ─── Row components ───────────────────────────────────────────────────────────

const GenreRow = ({ genre, rank }: { genre: GenreStat; rank: number }) => (
    <View style={styles.rowWrap}>
        <Text style={styles.rowRank}>#{rank}</Text>
        <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>{genre.genreName}</Text>
            <Text style={styles.rowSub}>{genre.totalMinutes} phút</Text>
        </View>
        {/* Progress bar */}
        <View style={styles.progressTrack}>
            <View
                style={[
                    styles.progressFill,
                    { width: `${Math.min(genre.percentageOfTotal, 100)}%` },
                ]}
            />
        </View>
        <Text style={styles.percentLabel}>{genre.percentageOfTotal}%</Text>
    </View>
);

const ArtistRow = ({ artist, rank }: { artist: ArtistStat; rank: number }) => (
    <View style={styles.rowWrap}>
        <Text style={styles.rowRank}>#{rank}</Text>
        <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>{artist.artistStageName}</Text>
            <Text style={styles.rowSub}>
                {artist.playCount} lượt · {artist.totalMinutes} phút
            </Text>
        </View>
    </View>
);

const SongRow = ({ song, rank }: { song: SongStat; rank: number }) => (
    <View style={styles.rowWrap}>
        <Text style={styles.rowRank}>#{rank}</Text>
        <View style={styles.rowInfo}>
            <Text style={styles.rowTitle} numberOfLines={1}>
                {song.title}
            </Text>
            <Text style={styles.rowSub}>{song.artistStageName} · {song.playCount} lượt</Text>
        </View>
    </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },

    periodRow: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 20,
        marginBottom: 8,
    },
    periodBtn: {
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: COLORS.glass08,
        borderWidth: 1,
        borderColor: COLORS.glass12,
    },
    periodBtnActive: {
        backgroundColor: COLORS.accent,
        borderColor: COLORS.accent,
    },
    periodLabel: { color: COLORS.glass60, fontSize: 13, fontWeight: '600' },
    periodLabelActive: { color: COLORS.white },

    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    loadingText: { color: COLORS.glass40, marginTop: 12, fontSize: 14 },
    errorEmoji: { fontSize: 40, marginBottom: 12 },
    errorText: { color: COLORS.error, textAlign: 'center', fontSize: 14 },
    emptyTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700', marginBottom: 8 },
    emptyDesc: { color: COLORS.glass40, textAlign: 'center', fontSize: 14, lineHeight: 20 },
    retryBtn: {
        marginTop: 16,
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: COLORS.accent,
    },
    retryLabel: { color: COLORS.white, fontWeight: '700' },

    moodBanner: {
        margin: 20,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
    },
    moodLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 4 },
    moodValue: { color: COLORS.white, fontSize: 20, fontWeight: '800' },

    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    statCard: {
        flex: 1,
        minWidth: '44%',
        backgroundColor: COLORS.glass08,
        borderRadius: 14,
        padding: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.glass10,
    },
    statEmoji: { fontSize: 22, marginBottom: 4 },
    statValue: { color: COLORS.white, fontSize: 22, fontWeight: '800' },
    statLabel: { color: COLORS.glass40, fontSize: 11, marginTop: 2, textAlign: 'center' },

    section: { paddingHorizontal: 20, marginTop: 24 },
    sectionTitle: { color: COLORS.white, fontSize: 17, fontWeight: '700', marginBottom: 12 },

    chartWrap: { alignItems: 'flex-start', overflow: 'hidden' },
    chartHint: { color: COLORS.glass40, fontSize: 12, marginTop: 8 },

    rowWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 10,
    },
    rowRank: { color: COLORS.glass30, fontSize: 13, fontWeight: '700', width: 24 },
    rowInfo: { flex: 1 },
    rowTitle: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
    rowSub: { color: COLORS.glass40, fontSize: 12, marginTop: 2 },
    progressTrack: {
        width: 70,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.glass10,
        overflow: 'hidden',
    },
    progressFill: {
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.accent,
    },
    percentLabel: { color: COLORS.glass50, fontSize: 11, width: 30, textAlign: 'right' },

    discoveryText: {
        color: COLORS.glass60,
        fontSize: 14,
        lineHeight: 20,
    },
});
