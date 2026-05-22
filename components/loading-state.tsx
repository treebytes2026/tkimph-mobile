import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

import { TkimphPalette } from '@/constants/theme';

type LoadingStateProps = {
  label?: string;
  compact?: boolean;
};

export function LoadingState({ label = "Loading T'KIM...", compact = false }: LoadingStateProps) {
  return (
    <View style={[styles.wrap, compact && styles.compact]}>
      <View style={styles.mark}>
        <Text style={styles.markText}>TK</Text>
      </View>
      <ActivityIndicator color={TkimphPalette.green} size={compact ? 'small' : 'large'} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEEF4',
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    justifyContent: 'center',
    minHeight: 180,
    padding: 22,
    ...Platform.select({
      web: { boxShadow: '0 3px 8px rgba(16, 24, 40, 0.08)' },
      default: {
        elevation: 2,
        shadowColor: '#101828',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
    }),
  },
  compact: {
    minHeight: 132,
    padding: 18,
  },
  mark: {
    alignItems: 'center',
    backgroundColor: TkimphPalette.yellow,
    borderRadius: 18,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  markText: {
    color: TkimphPalette.green,
    fontSize: 19,
    fontWeight: '900',
  },
  label: {
    color: TkimphPalette.muted,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
});
