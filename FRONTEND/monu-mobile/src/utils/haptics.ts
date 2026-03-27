// Optional load: web / missing native module won't crash the bundle.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Haptics: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Haptics = require('expo-haptics');
} catch {
  /* no-op */
}

const run = (fn: () => void | Promise<void>) => {
  try {
    const r = fn();
    if (r && typeof (r as Promise<void>).catch === 'function') {
      (r as Promise<void>).catch(() => {});
    }
  } catch {
    /* no-op */
  }
};

export const haptic = {
  light: () =>
    run(() => Haptics?.impactAsync(Haptics?.ImpactFeedbackStyle?.Light)),
  medium: () =>
    run(() => Haptics?.impactAsync(Haptics?.ImpactFeedbackStyle?.Medium)),
  success: () =>
    run(() =>
      Haptics?.notificationAsync(Haptics?.NotificationFeedbackType?.Success)),
  error: () =>
    run(() =>
      Haptics?.notificationAsync(Haptics?.NotificationFeedbackType?.Error)),
};
