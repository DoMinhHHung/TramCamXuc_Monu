import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View, type ViewStyle } from 'react-native';

import { moderateScale } from '../utils/responsive';

type Layout = 'shrink' | 'hero';

export type MonuBrandHeaderTitleProps = {
  children: string;
  accentColor: string;
  /**
   * shrink — flex:1 trong hàng (sticky Home, thanh Profile).
   * hero — full width, căn giữa (Create, Premium, Discover/Library).
   */
  layout?: Layout;
  textAlign?: 'left' | 'center';
  style?: ViewStyle;
};

/**
 * Tiêu đề dạng "MONU · …" co chữ theo bề ngang máy, tránh cắt chữ trên màn hẹp.
 */
export function MonuBrandHeaderTitle({
  children,
  accentColor,
  layout = 'shrink',
  textAlign,
  style,
}: MonuBrandHeaderTitleProps) {
  const { width } = useWindowDimensions();
  const fontSize =
    width < 330 ? moderateScale(14) : width < 360 ? moderateScale(16) : moderateScale(20);
  const letterSpacing = width < 335 ? 0.5 : width < 380 ? 1.5 : 2.5;
  const align = textAlign ?? (layout === 'hero' ? 'center' : 'left');

  return (
    <View style={[layout === 'hero' ? styles.hero : styles.shrink, style]}>
      <Text
        style={[styles.text, { color: accentColor, fontSize, letterSpacing, textAlign: align }]}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.65}
        maxFontSizeMultiplier={1.25}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shrink: { flex: 1, minWidth: 0, justifyContent: 'center' },
  hero: {
    width: '100%',
    maxWidth: '100%',
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  text: { fontWeight: '900', fontStyle: 'italic', textTransform: 'uppercase' },
});
