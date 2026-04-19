import React, { type PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

type Props = PropsWithChildren<{
    style?: ViewStyle;
    /** `default` = padH, `wide` = padHV */
    variant?: 'default' | 'wide';
}>;

/**
 * Bọc nội dung với padding ngang responsive — dùng trong screen/section thay magic number.
 */
export function ScreenEdgeGutter({ children, style, variant = 'default' }: Props) {
    const { padH, padHV } = useResponsiveLayout();
    const h = variant === 'wide' ? padHV : padH;
    return <View style={[styles.root, { paddingHorizontal: h }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
    root: { alignSelf: 'stretch' },
});
