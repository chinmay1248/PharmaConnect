import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';
import { ThemeMode, glowShadow, themes } from '../theme/theme';
import { InteractivePressable } from './InteractivePressable';

export type TabId = 'home' | 'search' | 'orders' | 'cart' | 'account';

type BottomTabBarProps = {
  mode: ThemeMode;
  activeTab: TabId;
  onChange: (tab: TabId) => void;
};

// Tab configuration: each item maps to one main customer screen group.
const tabs: { id: TabId; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'search', label: 'Search', icon: 'search' },
  { id: 'orders', label: 'Orders', icon: 'package' },
  { id: 'cart', label: 'Cart', icon: 'shopping-cart' },
  { id: 'account', label: 'You', icon: 'user' },
];

// Renders the sticky bottom navigation as a floating white pill holding circular
// icon slots. The active tab is a filled teal circle with a white icon, matching
// the reference healthcare-app navigation.
export function BottomTabBar({ mode, activeTab, onChange }: BottomTabBarProps) {
  const theme = themes[mode];

  return (
    <View style={styles.dock} pointerEvents="box-none">
      <View
        style={[
          styles.wrapper,
          { backgroundColor: theme.surface, borderColor: theme.hairline },
          glowShadow(theme.shadow, 0.7, 30, 16),
        ]}
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id;

          return (
            <InteractivePressable
              key={tab.id}
              onPress={() => onChange(tab.id)}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: active }}
              style={styles.slot}
              hoveredStyle={active ? null : { backgroundColor: theme.surfaceAlt }}
              pressedStyle={{ opacity: 0.8 }}
              scaleHover={1.08}
              scalePress={0.92}
            >
              <View
                style={[
                  styles.dot,
                  active
                    ? [{ backgroundColor: theme.primary }, glowShadow(theme.glow, 0.9, 14, 6)]
                    : null,
                ]}
              >
                <Feather
                  name={tab.icon}
                  size={20}
                  color={active ? '#ffffff' : theme.subtext}
                />
              </View>
            </InteractivePressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 16,
  },
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 460,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingVertical: 4,
  },
  dot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
