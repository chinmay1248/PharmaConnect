import { ReactNode, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';

type InteractivePressableProps = PressableProps & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  hoveredStyle?: StyleProp<ViewStyle>;
  pressedStyle?: StyleProp<ViewStyle>;
  scaleHover?: number;
  scalePress?: number;
};

// Shared clickable wrapper used by buttons, cards, tabs, and pills.
// It adds hover zoom and pressed feedback in one place.
export function InteractivePressable({
  children,
  style,
  hoveredStyle,
  pressedStyle,
  scaleHover = 1.025,
  scalePress = 0.975,
  onHoverIn,
  onHoverOut,
  onPressIn,
  onPressOut,
  ...props
}: InteractivePressableProps) {
  const [hovered, setHovered] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  // Animates the pressable scale for hover and press interactions.
  function animateTo(toValue: number) {
    Animated.spring(scale, {
      toValue,
      damping: 16,
      stiffness: 180,
      mass: 0.7,
      useNativeDriver: true,
    }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        {...props}
        onHoverIn={(event) => {
          setHovered(true);
          animateTo(scaleHover);
          onHoverIn?.(event);
        }}
        onHoverOut={(event) => {
          setHovered(false);
          animateTo(1);
          onHoverOut?.(event);
        }}
        onPressIn={(event) => {
          animateTo(scalePress);
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          animateTo(hovered ? scaleHover : 1);
          onPressOut?.(event);
        }}
        style={({ pressed }) => [
          style,
          hovered ? hoveredStyle : null,
          pressed ? styles.defaultPressed : null,
          pressed ? pressedStyle : null,
        ]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  defaultPressed: {
    opacity: 0.88,
  },
});
