import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface Props {
    visible: boolean;
    /** Khi true: đang dùng dữ liệu cache cũ (không nhất thiết offline hoàn toàn) */
    isStale?: boolean;
}

export const OfflineBanner: React.FC<Props> = ({ visible, isStale }) => {
    const { colors } = useTheme();
    const translateY = useRef(new Animated.Value(-48)).current;

    useEffect(() => {
        Animated.timing(translateY, {
            toValue: visible ? 0 : -48,
            duration: 260,
            useNativeDriver: true,
        }).start();
    }, [visible, translateY]);

    const styles = StyleSheet.create({
        banner: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 999,
            backgroundColor: isStale ? colors.warning ?? '#FBBF24' : '#374151',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 6,
            paddingHorizontal: 16,
            gap: 8,
        },
        text: {
            color: '#fff',
            fontSize: 12,
            fontWeight: '600',
        },
    });

    return (
        <Animated.View style={[styles.banner, { transform: [{ translateY }] }]}>
            <MaterialCommunityIcons
                name={isStale ? 'database-clock' : 'wifi-off'}
                size={14}
                color="#fff"
            />
            <Text style={styles.text}>
                {isStale
                    ? 'Đang hiển thị dữ liệu đã lưu — kéo để tải lại'
                    : 'Không có kết nối mạng'}
            </Text>
        </Animated.View>
    );
};
