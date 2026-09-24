import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import type { AppStage } from './customerTypes';

// Splash animation: the logo fades and scales in while the first screen's data loads.
export function useSplashAnimation(stage: AppStage, setStage: (stage: AppStage) => void) {
  const [splashAnimationComplete, setSplashAnimationComplete] = useState(false);
  const splashOpacity = useRef(new Animated.Value(0)).current;
  const splashScale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (stage !== 'splash') {
      return;
    }

    const animation = Animated.sequence([
      Animated.delay(180),
      Animated.parallel([
        Animated.timing(splashOpacity, {
          toValue: 1,
          duration: 720,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(splashScale, {
          toValue: 1,
          duration: 720,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(620),
      Animated.parallel([
        Animated.timing(splashOpacity, {
          toValue: 0,
          duration: 420,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(splashScale, {
          toValue: 1.05,
          duration: 420,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]);

    animation.start(({ finished }) => {
      if (finished) {
        setSplashAnimationComplete(true);
      }
    });

    return () => animation.stop();
  }, [stage, splashOpacity, splashScale]);

  useEffect(() => {
    if (stage !== 'splash' || !splashAnimationComplete) {
      return;
    }

    setStage('app');
  }, [splashAnimationComplete, stage]);

  return { splashOpacity, splashScale };
}
