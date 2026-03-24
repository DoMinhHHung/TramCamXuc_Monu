import React, { useEffect, useRef } from 'react';
import { Animated, Easing, ViewStyle } from 'react-native';

type AnimatedDecorIconProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  active?: boolean;
  intensity?: 'soft' | 'medium';
};

export const AnimatedDecorIcon = ({
  children,
  style,
  active = true,
  intensity = 'soft',
}: AnimatedDecorIconProps) => {
  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) {
      scale.setValue(1);
      translateY.setValue(0);
      opacity.setValue(1);
      return;
    }

    const upScale = intensity === 'medium' ? 1.08 : 1.04;
    const upY = intensity === 'medium' ? -2 : -1;
    const duration = intensity === 'medium' ? 700 : 1000;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, {
            toValue: upScale,
            duration,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: upY,
            duration,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.88,
            duration,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [active, intensity, opacity, scale, translateY]);

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ scale }, { translateY }],
          opacity,
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

