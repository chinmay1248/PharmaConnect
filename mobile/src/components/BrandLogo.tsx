import { StyleSheet, Text, View } from 'react-native';
import { ThemeMode } from '../theme/theme';

type BrandLogoProps = {
  mode: ThemeMode;
  size?: 'hero' | 'compact';
  align?: 'center' | 'start';
};

// Recreates the PharmaConnect pill logo in code for splash, signup, and header use.
export function BrandLogo({
  mode,
  size = 'hero',
  align = 'center',
}: BrandLogoProps) {
  const compact = size === 'compact';
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
          compact ? styles.pillCompact : styles.pillHero,
        ]}
      >
        <View style={[styles.half, { backgroundColor: mark }]}>
          <View
            style={[
              styles.chainLoop,
              compact ? styles.chainLoopCompact : styles.chainLoopHero,
              { borderColor: teal },
            ]}
          />
          <View
            style={[
              styles.chainLoop,
              compact ? styles.chainLoopCompact : styles.chainLoopHero,
              styles.chainLoopOffset,
              { borderColor: teal },
            ]}
          />
          <View
            style={[
              styles.chainBridge,
              compact ? styles.chainBridgeCompact : styles.chainBridgeHero,
              { backgroundColor: teal },
            ]}
          />
        </View>
        <View style={[styles.half, { backgroundColor: teal }]}>
          <View
            style={[
              styles.plusBar,
              compact ? styles.plusBarCompact : styles.plusBarHero,
              { backgroundColor: mark },
            ]}
          />
          <View
            style={[
              styles.plusBar,
              compact ? styles.plusBarCompact : styles.plusBarHero,
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
            compact ? styles.wordmarkCompact : styles.wordmarkHero,
          ]}
        >
          <Text style={{ color: navy }}>Pharma</Text>
          <Text style={{ color: teal }}>Connect</Text>
        </Text>
        <View style={styles.heartbeat}>
          <View
            style={[
              styles.heartbeatLine,
              compact ? styles.heartbeatLineCompact : styles.heartbeatLineHero,
              { backgroundColor: beat },
            ]}
          />
          <View
            style={[
              styles.heartbeatPeak,
              compact ? styles.heartbeatPeakCompact : styles.heartbeatPeakHero,
              { borderColor: beat },
            ]}
          />
          <View
            style={[
              styles.heartbeatPeakTall,
              compact ? styles.heartbeatPeakTallCompact : styles.heartbeatPeakTallHero,
              { borderColor: beat },
            ]}
          />
          <View
            style={[
              styles.heartbeatPeak,
              compact ? styles.heartbeatPeakCompact : styles.heartbeatPeakHero,
              styles.heartbeatPeakDown,
              { borderColor: beat },
            ]}
          />
          <View
            style={[
              styles.heartbeatLine,
              compact ? styles.heartbeatLineCompact : styles.heartbeatLineHero,
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
  heartbeatPeakDown: {
    transform: [{ rotate: '135deg' }],
  },
});
