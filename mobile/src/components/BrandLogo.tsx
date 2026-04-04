import { StyleSheet, Text, View } from 'react-native';
import { ThemeMode } from '../theme/theme';

type BrandLogoProps = {
  mode: ThemeMode;
  size?: 'hero' | 'compact' | 'nav';
  align?: 'center' | 'start';
};

// Recreates the PharmaConnect pill logo in code for splash, signup, and header use.
export function BrandLogo({
  mode,
  size = 'hero',
  align = 'center',
}: BrandLogoProps) {
  const compact = size !== 'hero';
  const nav = size === 'nav';
  const dark = mode === 'dark';
  const teal = '#1dd4c0';
  const navy = dark ? '#edf6ff' : '#0a2134';
  const mark = dark ? '#112844' : '#0a2134';
  const beat = dark ? '#7dc6ff' : '#17314a';

  return (
    <View style={[styles.wrapper, align === 'start' && styles.wrapperStart]}>
      {/* Logo symbol: chain-link half on the left, medical plus half on the right */}
      <View
        style={[
          styles.pill,
          size === 'hero'
            ? styles.pillHero
            : nav
              ? styles.pillNav
              : styles.pillCompact,
        ]}
      >
        <View style={[styles.half, { backgroundColor: mark }]}>
          <View
            style={[
              styles.chainLoop,
              size === 'hero'
                ? styles.chainLoopHero
                : nav
                  ? styles.chainLoopNav
                  : styles.chainLoopCompact,
              { borderColor: teal },
            ]}
          />
          <View
            style={[
              styles.chainLoop,
              size === 'hero'
                ? styles.chainLoopHero
                : nav
                  ? styles.chainLoopNav
                  : styles.chainLoopCompact,
              styles.chainLoopOffset,
              { borderColor: teal },
            ]}
          />
          <View
            style={[
              styles.chainBridge,
              size === 'hero'
                ? styles.chainBridgeHero
                : nav
                  ? styles.chainBridgeNav
                  : styles.chainBridgeCompact,
              { backgroundColor: teal },
            ]}
          />
        </View>
        <View style={[styles.half, { backgroundColor: teal }]}>
          <View
            style={[
              styles.plusBar,
              size === 'hero'
                ? styles.plusBarHero
                : nav
                  ? styles.plusBarNav
                  : styles.plusBarCompact,
              { backgroundColor: mark },
            ]}
          />
          <View
            style={[
              styles.plusBar,
              size === 'hero'
                ? styles.plusBarHero
                : nav
                  ? styles.plusBarNav
                  : styles.plusBarCompact,
              styles.plusBarVertical,
              { backgroundColor: mark },
            ]}
          />
        </View>
      </View>
      {/* Wordmark and heartbeat line below the logo symbol */}
      <View style={[styles.wordmarkWrap, align === 'start' && styles.wordmarkStart]}>
        <Text
          style={[
            styles.wordmark,
            size === 'hero'
              ? styles.wordmarkHero
              : nav
                ? styles.wordmarkNav
                : styles.wordmarkCompact,
          ]}
        >
          <Text style={{ color: navy }}>Pharma</Text>
          <Text style={{ color: teal }}>Connect</Text>
        </Text>
        <View style={styles.heartbeat}>
          <View
            style={[
              styles.heartbeatLine,
              size === 'hero'
                ? styles.heartbeatLineHero
                : nav
                  ? styles.heartbeatLineNav
                  : styles.heartbeatLineCompact,
              { backgroundColor: beat },
            ]}
          />
          <View
            style={[
              styles.heartbeatPeak,
              size === 'hero'
                ? styles.heartbeatPeakHero
                : nav
                  ? styles.heartbeatPeakNav
                  : styles.heartbeatPeakCompact,
              { borderColor: beat },
            ]}
          />
          <View
            style={[
              styles.heartbeatPeakTall,
              size === 'hero'
                ? styles.heartbeatPeakTallHero
                : nav
                  ? styles.heartbeatPeakTallNav
                  : styles.heartbeatPeakTallCompact,
              { borderColor: beat },
            ]}
          />
          <View
            style={[
              styles.heartbeatPeak,
              size === 'hero'
                ? styles.heartbeatPeakHero
                : nav
                  ? styles.heartbeatPeakNav
                  : styles.heartbeatPeakCompact,
              styles.heartbeatPeakDown,
              { borderColor: beat },
            ]}
          />
          <View
            style={[
              styles.heartbeatLine,
              size === 'hero'
                ? styles.heartbeatLineHero
                : nav
                  ? styles.heartbeatLineNav
                  : styles.heartbeatLineCompact,
              { backgroundColor: beat },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  wrapperStart: {
    alignItems: 'flex-start',
  },
  pill: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  pillHero: {
    width: 224,
    height: 92,
    borderRadius: 46,
  },
  pillCompact: {
    width: 106,
    height: 44,
    borderRadius: 22,
  },
  pillNav: {
    width: 76,
    height: 32,
    borderRadius: 16,
  },
  half: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chainLoop: {
    position: 'absolute',
    borderWidth: 4,
  },
  chainLoopHero: {
    width: 38,
    height: 20,
    borderRadius: 11,
  },
  chainLoopCompact: {
    width: 18,
    height: 10,
    borderRadius: 6,
  },
  chainLoopNav: {
    width: 13,
    height: 8,
    borderRadius: 5,
  },
  chainLoopOffset: {
    transform: [{ rotate: '-41deg' }, { translateX: 10 }],
  },
  chainBridge: {
    borderRadius: 999,
    transform: [{ rotate: '-41deg' }],
  },
  chainBridgeHero: {
    width: 24,
    height: 7,
  },
  chainBridgeCompact: {
    width: 12,
    height: 4,
  },
  chainBridgeNav: {
    width: 9,
    height: 3,
  },
  plusBar: {
    borderRadius: 999,
  },
  plusBarHero: {
    width: 42,
    height: 9,
  },
  plusBarCompact: {
    width: 20,
    height: 5,
  },
  plusBarNav: {
    width: 14,
    height: 4,
  },
  plusBarVertical: {
    position: 'absolute',
    transform: [{ rotate: '90deg' }],
  },
  wordmarkWrap: {
    marginTop: 12,
    alignItems: 'center',
  },
  wordmarkStart: {
    alignItems: 'flex-start',
  },
  wordmark: {
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  wordmarkHero: {
    fontSize: 40,
  },
  wordmarkCompact: {
    fontSize: 22,
  },
  wordmarkNav: {
    fontSize: 15,
  },
  heartbeat: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heartbeatLine: {
    height: 2,
    borderRadius: 999,
  },
  heartbeatLineHero: {
    width: 30,
  },
  heartbeatLineCompact: {
    width: 16,
  },
  heartbeatLineNav: {
    width: 10,
  },
  heartbeatPeak: {
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    transform: [{ rotate: '-45deg' }],
    marginHorizontal: -1,
  },
  heartbeatPeakHero: {
    width: 14,
    height: 14,
  },
  heartbeatPeakCompact: {
    width: 8,
    height: 8,
  },
  heartbeatPeakNav: {
    width: 6,
    height: 6,
  },
  heartbeatPeakTall: {
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    transform: [{ rotate: '-45deg' }],
    marginHorizontal: -1,
  },
  heartbeatPeakTallHero: {
    width: 20,
    height: 20,
  },
  heartbeatPeakTallCompact: {
    width: 11,
    height: 11,
  },
  heartbeatPeakTallNav: {
    width: 8,
    height: 8,
  },
  heartbeatPeakDown: {
    transform: [{ rotate: '135deg' }],
  },
});
