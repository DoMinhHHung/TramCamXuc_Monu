import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

const widthScale = width / BASE_WIDTH;
const heightScale = height / BASE_HEIGHT;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const scale = (size: number) => Math.round(size * clamp(widthScale, 0.85, 1.2));
export const verticalScale = (size: number) => Math.round(size * clamp(heightScale, 0.85, 1.2));
export const moderateScale = (size: number, factor = 0.4) => {
  const scaled = scale(size);
  return Math.round(size + (scaled - size) * factor);
};

export const SCREEN = {
  width,
  height,
  isSmallDevice: width < 360 || height < 700,
  isTablet: width >= 768,
};
