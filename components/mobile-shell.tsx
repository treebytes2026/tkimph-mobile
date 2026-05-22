import { PropsWithChildren } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TkimphPalette } from '@/constants/theme';

export function MobileShell({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  content: {
    padding: 14,
    paddingBottom: 96,
  },
  card: {
    backgroundColor: TkimphPalette.surface,
    borderColor: TkimphPalette.line,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
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
});
