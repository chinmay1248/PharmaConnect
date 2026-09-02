import { Animated, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { BrandLogo } from '../../components/BrandLogo';
import { themes } from '../../theme/theme';
import { customerStyles } from './customerStyles';

type SplashScreenProps = {
  splashOpacity: Animated.Value;
  splashScale: Animated.Value;
};

// Renders the intro splash animation before the first screen appears. A soft
// mint wash with a faint teal ring sets the calm, clinical tone up front.
export function SplashScreen({ splashOpacity, splashScale }: SplashScreenProps) {
  const theme = themes.light;

  return (
    <LinearGradient
      colors={theme.gradientAurora as unknown as readonly [string, string, ...string[]]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[customerStyles.page, customerStyles.splashPage, styles.gradient]}
    >
      <StatusBar style="dark" />
      <View style={[styles.glowRing, { borderColor: theme.primary, shadowColor: theme.glow }]} />
      <Animated.View
        style={[
          customerStyles.splashWrap,
          {
            opacity: splashOpacity,
            transform: [{ scale: splashScale }],
          },
        ]}
      >
        <BrandLogo mode="light" size="hero" />
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    backgroundColor: '#eaf6f3',
  },
  glowRing: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 1,
    opacity: 0.35,
    shadowOpacity: 0.5,
    shadowRadius: 60,
    shadowOffset: { width: 0, height: 0 },
  },
});
