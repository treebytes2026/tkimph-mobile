import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TkimphPalette } from '@/constants/theme';
import { blurActiveElement } from '@/lib/focus';

export function AccountPageShell({ title, subtitle, icon, children }: PropsWithChildren<{ title: string; subtitle: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] }>) {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            blurActiveElement();
            router.back();
          }}
          style={styles.roundButton}
        >
          <MaterialIcons color={TkimphPalette.ink} name="arrow-back" size={22} />
        </Pressable>
        <View style={styles.topText}>
          <Text style={styles.topTitle}>{title}</Text>
          <Text style={styles.topSubtitle}>{subtitle}</Text>
        </View>
        <View style={styles.roundButton}>
          <MaterialIcons color={TkimphPalette.green} name={icon} size={21} />
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function FormCard({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

export function FormInput({
  label,
  value,
  onChangeText,
  secureTextEntry,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        value={value}
        onChangeText={onChangeText}
        style={[styles.input, multiline && styles.textarea]}
      />
    </View>
  );
}

export function ActionButton({ label, icon, disabled, onPress }: { label: string; icon: React.ComponentProps<typeof MaterialIcons>['name']; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.actionButton, disabled && styles.actionButtonDisabled]}>
      <MaterialIcons color="#FFFFFF" name={icon} size={19} />
      <Text style={styles.actionButtonText}>{label}</Text>
    </Pressable>
  );
}

export function FormMessage({ children }: PropsWithChildren) {
  if (!children) return null;
  return <Text style={styles.message}>{children}</Text>;
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: '#F7F8FA',
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  roundButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEEF4',
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  topText: {
    flex: 1,
  },
  topTitle: {
    color: TkimphPalette.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  topSubtitle: {
    color: TkimphPalette.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  content: {
    padding: 14,
    paddingBottom: 96,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEEF4',
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  field: {
    gap: 7,
  },
  label: {
    color: TkimphPalette.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E4E7EC',
    borderRadius: 12,
    borderWidth: 1,
    color: TkimphPalette.ink,
    fontSize: 14,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  textarea: {
    minHeight: 112,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: TkimphPalette.green,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 50,
  },
  actionButtonDisabled: {
    opacity: 0.58,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  message: {
    color: TkimphPalette.primary,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    textAlign: 'center',
  },
});
