import { Animated, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BrandLogo } from '../../components/BrandLogo';
import { customerStyles } from './customerStyles';

type SplashScreenProps = {
  splashOpacity: Animated.Value;
  splashScale: Animated.Value;
};

// Renders the intro splash animation before the signup screen appears.
export function SplashScreen({ splashOpacity, splashScale }: SplashScreenProps) {
  return (
    <SafeAreaView style={[customerStyles.page, customerStyles.splashPage]}>
      <StatusBar style="dark" />
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
    </SafeAreaView>
  );
}
