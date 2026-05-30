import { useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { MobileShell } from '@/components/mobile-shell';
import { TkimphPalette } from '@/constants/theme';
import { blurActiveElement } from '@/lib/focus';
import { LEGAL_SLUGS, getLegalDocument } from '@/lib/legal-content';

export default function LegalScreen() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const router = useRouter();
  const doc = useMemo(() => getLegalDocument(slug) ?? getLegalDocument('terms')!, [slug]);
  const otherDocs = LEGAL_SLUGS.filter((s) => s !== doc.slug).map((s) => getLegalDocument(s)!);

  return (
    <MobileShell>
      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => {
          blurActiveElement();
          router.back();
        }}
        style={styles.backButton}
      >
        <MaterialIcons color={TkimphPalette.ink} name="arrow-back" size={22} />
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.iconWrap}>
          <MaterialIcons color={TkimphPalette.green} name="gavel" size={30} />
        </View>
        <Text style={styles.eyebrow}>Legal</Text>
        <Text style={styles.title}>{doc.title}</Text>
        <Text style={styles.summary}>{doc.summary}</Text>
        <Text style={styles.updated}>Last updated: {doc.lastUpdated}</Text>

        {doc.sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.heading}>{section.heading}</Text>
            {section.paragraphs.map((paragraph, index) => (
              <Text key={index} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}
          </View>
        ))}

        <View style={styles.related}>
          {otherDocs.map((other) => (
            <Pressable
              key={other.slug}
              onPress={() => {
                blurActiveElement();
                router.push(`/legal/${other.slug}` as never);
              }}
              style={styles.relatedButton}
            >
              <Text style={styles.relatedButtonText}>{other.title}</Text>
              <MaterialIcons color={TkimphPalette.green} name="chevron-right" size={20} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEEF4',
    borderRadius: 18,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    marginBottom: 20,
    width: 38,
  },
  scrollContent: {
    paddingBottom: 48,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#E8F3ED',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  eyebrow: {
    color: TkimphPalette.green,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 16,
    textTransform: 'uppercase',
  },
  title: {
    color: TkimphPalette.ink,
    fontSize: 26,
    fontWeight: '900',
    marginTop: 6,
  },
  summary: {
    color: TkimphPalette.muted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 8,
  },
  updated: {
    color: TkimphPalette.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  section: {
    marginTop: 22,
  },
  heading: {
    color: TkimphPalette.ink,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 8,
  },
  paragraph: {
    color: TkimphPalette.muted,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 8,
  },
  related: {
    borderTopColor: '#EAEEF4',
    borderTopWidth: 1,
    gap: 10,
    marginTop: 28,
    paddingTop: 20,
  },
  relatedButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEEF4',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  relatedButtonText: {
    color: TkimphPalette.ink,
    fontSize: 14,
    fontWeight: '900',
  },
});
