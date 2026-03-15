import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../config/colors';
import { BackButton } from '../../components/BackButton';

const TERMS: { title: string; content: string }[] = [
    {
        title: '1. Quyền sở hữu nội dung',
        content:
            'Bạn xác nhận rằng mình sở hữu hoặc có quyền hợp pháp đối với toàn bộ nội dung âm nhạc tải lên. Monu không chịu trách nhiệm pháp lý về bất kỳ vi phạm bản quyền nào do người dùng gây ra.',
    },
    {
        title: '2. Nội dung bị cấm',
        content:
            'Nghiêm cấm nội dung có ngôn ngữ thù địch, kích động bạo lực, khiêu dâm, hoặc vi phạm quyền riêng tư. Monu có quyền gỡ bỏ nội dung vi phạm và đình chỉ tài khoản mà không cần báo trước.',
    },
    {
        title: '3. Tiêu chuẩn chất lượng',
        content:
            'Nội dung âm thanh phải đạt tối thiểu 128 kbps. Monu có quyền từ chối hoặc gỡ bỏ nội dung không đáp ứng yêu cầu kỹ thuật hoặc chất lượng nghệ thuật tối thiểu.',
    },
    {
        title: '4. Quy trình xét duyệt',
        content:
            'Mỗi đơn đăng ký nghệ sĩ đều trải qua quy trình xét duyệt 1–3 ngày làm việc. Monu có quyền từ chối mà không cần giải thích lý do. Quyết định xét duyệt là quyết định cuối cùng.',
    },
    {
        title: '5. Phân phối doanh thu',
        content:
            'Nghệ sĩ được nhận một phần doanh thu từ lượt nghe theo chính sách hiện hành. Chính sách này có thể thay đổi và sẽ được thông báo trước ít nhất 30 ngày.',
    },
    {
        title: '6. Hành vi gian lận',
        content:
            'Mua lượt nghe giả, spam, hoặc bất kỳ hành vi gian lận nào sẽ dẫn đến đình chỉ vĩnh viễn và có thể bị xử lý theo pháp luật hiện hành.',
    },
    {
        title: '7. Thay đổi điều khoản',
        content:
            'Monu có thể cập nhật điều khoản bất kỳ lúc nào. Việc tiếp tục sử dụng dịch vụ sau khi thay đổi đồng nghĩa với việc chấp nhận điều khoản mới.',
    },
];

export const ArtistTermsScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.root}>
            <StatusBar style="light" />

            <LinearGradient
                colors={[COLORS.gradNavy, COLORS.bg]}
                style={[styles.header, { paddingTop: insets.top + 12 }]}
            >
                <BackButton onPress={() => navigation.goBack()} />
                <Text style={styles.headerTitle}>Điều khoản Nghệ sĩ</Text>
                <Text style={styles.headerSub}>Vui lòng đọc kỹ trước khi đăng ký</Text>
            </LinearGradient>

            <ScrollView
                contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.dateBadge}>
                    <Text style={styles.dateText}>Cập nhật lần cuối: 01/01/2025</Text>
                </View>

                {TERMS.map((term, i) => (
                    <View key={i} style={styles.section}>
                        <Text style={styles.sectionTitle}>{term.title}</Text>
                        <Text style={styles.sectionContent}>{term.content}</Text>
                    </View>
                ))}

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Bằng cách đăng ký làm nghệ sĩ, bạn xác nhận đã đọc, hiểu và đồng ý với toàn bộ các điều khoản trên.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },

    header: {
        paddingHorizontal: 24,
        paddingBottom: 22,
    },
    headerTitle: {
        color: COLORS.white,
        fontSize: 24,
        fontWeight: '800',
        marginTop: 16,
        marginBottom: 6,
    },
    headerSub: { color: COLORS.glass50, fontSize: 13 },

    body: { paddingHorizontal: 20, paddingTop: 16 },

    dateBadge: {
        alignSelf: 'flex-start',
        backgroundColor: COLORS.glass07,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginBottom: 18,
        borderWidth: 1,
        borderColor: COLORS.glass12,
    },
    dateText: { color: COLORS.glass45, fontSize: 11 },

    section: {
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: COLORS.glass08,
    },
    sectionTitle: {
        color: COLORS.white,
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 8,
    },
    sectionContent: {
        color: COLORS.glass60,
        fontSize: 13,
        lineHeight: 20,
    },

    footer: {
        backgroundColor: COLORS.accentFill20,
        borderRadius: 14,
        padding: 16,
        marginTop: 6,
        borderWidth: 1,
        borderColor: COLORS.accentBorder25,
    },
    footerText: {
        color: COLORS.glass80,
        fontSize: 13,
        lineHeight: 20,
        fontStyle: 'italic',
    },
});