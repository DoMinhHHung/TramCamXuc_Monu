import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

const BASE_W = 390;
const BASE_H = 844;

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

export function useResponsiveLayout() {
    const { width, height, fontScale } = useWindowDimensions();

    return useMemo(() => {
        const ws = clamp(width / BASE_W, 0.85, 1.2);
        const hs = clamp(height / BASE_H, 0.85, 1.2);

        const moderate = (size: number, factor = 0.4) => {
            const scaled = Math.round(size * ws);
            return Math.round(size + (scaled - size) * factor);
        };

        const padH = Math.max(12, Math.min(moderate(20), Math.round(width * 0.055)));
        const padHV = Math.max(14, Math.min(moderate(24), Math.round(width * 0.065)));

        return {
            width,
            height,
            fontScale,
            /** Padding ngang nội dung chính (list, form) */
            padH,
            /** Padding ngang rộng hơn (hero, gallery) */
            padHV,
            moderate,
            isSmallPhone: width < 360,
            isShortPhone: height < 700,
            isTablet: width >= 768,
            /** Giới hạn chiều rộng nội dung căn giữa (tablet) */
            contentMaxWidth: width >= 768 ? Math.min(560, width - padHV * 2) : width,
        };
    }, [width, height, fontScale]);
}
