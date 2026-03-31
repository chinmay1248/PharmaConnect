import { PropsWithChildren } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type ScreenContainerProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  scroll?: boolean;
}>;

export function ScreenContainer({
  children,
  title,
  subtitle,
  scroll = true,
}: ScreenContainerProps) {
  const body = (
    <View style={styles.inner}>
      <View style={styles.hero}>
        <View style={styles.heroOrbA} />
        <View style={styles.heroOrbB} />
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {body}
        </ScrollView>
      ) : (
        <View style={styles.content}>{body}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4EFE8',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  inner: {
    gap: 18,
  },
  hero: {
    overflow: 'hidden',
    marginTop: 8,
    borderRadius: 28,
    backgroundColor: '#15384B',
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  heroOrbA: {
    position: 'absolute',
    top: -40,
    right: -30,
    height: 130,
    width: 130,
    borderRadius: 999,
    backgroundColor: '#2A8E8A',
  },
  heroOrbB: {
    position: 'absolute',
    bottom: -25,
    left: -35,
    height: 100,
    width: 100,
    borderRadius: 999,
    backgroundColor: '#EF8F6A',
  },
  title: {
    color: '#FAF7F1',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 8,
    color: '#D8E5ED',
    fontSize: 14,
    lineHeight: 21,
    maxWidth: '88%',
  },
});
