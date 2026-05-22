import { Platform } from 'react-native';

export function blurActiveElement() {
  if (Platform.OS !== 'web') return;
  const active = globalThis.document?.activeElement as { blur?: () => void } | null;
  active?.blur?.();
}
