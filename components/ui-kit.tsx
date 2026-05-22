import { ComponentProps, PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { TkimphPalette } from '@/constants/theme';

export function Kicker({ children }: PropsWithChildren) {
  return <Text style={styles.kicker}>{children}</Text>;
}

export function ScreenTitle({ children }: PropsWithChildren) {
  return <Text style={styles.title}>{children}</Text>;
}

export function BodyText({ children }: PropsWithChildren) {
  return <Text style={styles.body}>{children}</Text>;
}

export function SectionHeader({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

export function Pill({ children, tone = 'neutral' }: PropsWithChildren<{ tone?: 'neutral' | 'green' | 'yellow' | 'blue' }>) {
  const color =
    tone === 'green'
      ? TkimphPalette.green
      : tone === 'yellow'
        ? '#8A5A00'
        : tone === 'blue'
          ? TkimphPalette.blue
          : TkimphPalette.muted;
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <Text style={[styles.pillText, { color }]}>{children}</Text>
    </View>
  );
}

export function PrimaryButton({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon?: ComponentProps<typeof MaterialIcons>['name'];
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}>
      {icon ? <MaterialIcons color="#FFFFFF" name={icon} size={20} /> : null}
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  secureTextEntry,
  autoCapitalize = 'none',
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        autoCapitalize={autoCapitalize}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: {
    color: TkimphPalette.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: TkimphPalette.ink,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 36,
    marginTop: 6,
  },
  body: {
    color: TkimphPalette.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 24,
  },
  sectionTitle: {
    color: TkimphPalette.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  sectionAction: {
    color: TkimphPalette.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  button: {
    alignItems: 'center',
    backgroundColor: TkimphPalette.primary,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  buttonDisabled: {
    opacity: 0.62,
  },
  buttonPressed: {
    backgroundColor: TkimphPalette.primaryDark,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    color: TkimphPalette.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  input: {
    backgroundColor: '#FFFDF9',
    borderColor: TkimphPalette.line,
    borderRadius: 8,
    borderWidth: 1,
    color: TkimphPalette.ink,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 14,
  },
});
