import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';
import { ThemeMode, themes } from '../theme/theme';
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

// Renders the sticky bottom navigation for switching between main customer sections.
export function BottomTabBar({ mode, activeTab, onChange }: BottomTabBarProps) {
  const theme = themes[mode];

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
        },
      ]}
    >
      {tabs.map((tab) => {
        const active = activeTab === tab.id;

        return (
          // Each button changes the visible screen and highlights the active tab.
          <InteractivePressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={[
              styles.tab,
              {
                backgroundColor: active ? theme.primarySoft : 'transparent',
              },
            ]}
            hoveredStyle={{
              backgroundColor: active ? theme.primarySoft : theme.surfaceAlt,
            }}
            pressedStyle={{
              backgroundColor: active ? theme.elevated : theme.elevated,
            }}
            scaleHover={1.06}
            scalePress={0.96}
          >
            <Feather
              name={tab.icon}
              size={18}
              color={active ? theme.primaryStrong : theme.subtext}
            />
            <Text
              style={[
                styles.label,
                { color: active ? theme.primaryStrong : theme.subtext },
              ]}
            >
              {tab.label}
            </Text>
          </InteractivePressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: 1,
  },
  tab: {
    flex: 1,
    minHeight: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
});
