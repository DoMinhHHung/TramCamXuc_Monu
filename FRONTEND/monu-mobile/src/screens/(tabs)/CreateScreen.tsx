import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import { getMySubscription, UserSubscription } from '../../services/payment';
import { apiClient } from '../../services/api';

type ArtistProfile = {
  id: string;
  stageName: string;
  status: 'ACTIVE' | 'PENDING' | 'BANNED' | 'REJECTED';
};

export const CreateScreen = () => {
  const insets = useSafeAreaInsets();
  const { authSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);

  React.useEffect(() => {
    void loadCreatorState();
  }, [authSession?.tokens.accessToken]);

  const loadCreatorState = async () => {
    if (!authSession) return;
    setLoading(true);
    try {
      const [artistRes, subRes] = await Promise.allSettled([
        apiClient.get<ArtistProfile>('/artists/me'),
        getMySubscription(),
      ]);

      if (artistRes.status === 'fulfilled') {
        setArtistProfile(artistRes.value.data);
      } else if (authSession.profile?.role === 'ARTIST') {
        setArtistProfile({
          id: authSession.profile.id,
          stageName: authSession.profile.fullName || authSession.profile.email,
          status: 'ACTIVE',
        });
      } else {
        setArtistProfile(null);
      }

      if (subRes.status === 'fulfilled') {
        setSubscription(subRes.value);
      } else {
        setSubscription(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const isBanned = authSession?.profile?.status === 'BANNED' || artistProfile?.status === 'BANNED';
  const isArtist = Boolean(artistProfile?.id) || authSession?.profile?.role === 'ARTIST';
  const hasActiveSubscription = subscription?.status === 'ACTIVE' && new Date(subscription.expiresAt).getTime() > Date.now();

  const creatorStatusText = useMemo(() => {
    if (!authSession) return 'Bạn cần đăng nhập để tạo nội dung.';
    if (isBanned) return 'Tài khoản đang bị khóa, không thể tạo nội dung.';
    if (!isArtist) return 'Bạn chưa đăng ký artist profile.';
    if (!hasActiveSubscription) return 'Gói cước đã hết hạn, hãy gia hạn để upload.';
    return `Sẵn sàng sáng tạo với nghệ danh ${artistProfile?.stageName || authSession.profile?.fullName}.`;
  }, [authSession, isBanned, isArtist, hasActiveSubscription, artistProfile?.stageName]);

  const canCreateSongAlbum = !!authSession && !isBanned && isArtist && hasActiveSubscription;

  const handleCreateSongAlbum = () => {
    if (!authSession) return Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập để dùng tính năng này.');
    if (isBanned) return Alert.alert('Tài khoản bị giới hạn', 'Bạn đang bị ban nên không thể thêm bài hát/album.');
    if (!isArtist) return Alert.alert('Chưa phải nghệ sĩ', 'Bạn cần đăng ký hồ sơ artist trước khi upload bài hát/album.');
    if (!hasActiveSubscription) return Alert.alert('Hết hạn gói cước', 'Gói cước không còn hiệu lực. Vui lòng nâng cấp/gia hạn để tiếp tục.');
    Alert.alert('Sẵn sàng', 'Bạn đã đủ điều kiện artist + gói cước để upload.');
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: 36 }}>
        <LinearGradient colors={[COLORS.gradNavy, COLORS.bg]} style={[styles.hero, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.emoji}>🎼</Text>
          <Text style={styles.title}>Creator Studio</Text>
          <Text style={styles.sub}>{creatorStatusText}</Text>
        </LinearGradient>

        <View style={styles.body}>
          {loading ? <ActivityIndicator color={COLORS.accent} /> : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Thêm bài hát / Album</Text>
              <Text style={styles.cardDesc}>Kiểm tra artist, gói cước và trạng thái ban trước khi tạo.</Text>
              <Pressable onPress={handleCreateSongAlbum} style={[styles.primaryBtn, !canCreateSongAlbum && styles.disabledBtn]}>
                <Text style={styles.primaryBtnText}>{canCreateSongAlbum ? 'Tiếp tục tạo nội dung' : 'Chưa đủ điều kiện'}</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  hero: { paddingHorizontal: 24, paddingBottom: 28, alignItems: 'center', justifyContent: 'center', minHeight: 230 },
  emoji: { fontSize: 56, marginBottom: 16 },
  title: { color: COLORS.white, fontSize: 32, fontWeight: '800', marginBottom: 10 },
  sub: { color: COLORS.glass50, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  body: { paddingHorizontal: 20, gap: 16 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.glass10, padding: 16 },
  cardTitle: { color: COLORS.white, fontWeight: '700', fontSize: 18, marginBottom: 6 },
  cardDesc: { color: COLORS.glass60, marginBottom: 12 },
  primaryBtn: { backgroundColor: COLORS.accentDim, borderRadius: 12, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  disabledBtn: { backgroundColor: COLORS.surfaceDim },
  primaryBtnText: { color: COLORS.white, fontWeight: '700' },
});
