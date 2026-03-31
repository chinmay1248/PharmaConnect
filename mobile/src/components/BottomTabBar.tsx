import { Pressable, StyleSheet, Text, View } from 'react-native';

export type TabId = 'home' | 'search' | 'orders' | 'profile';

type BottomTabBarProps = {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
};

const tabs: { id: TabId; label: string; hint: string }[] = [
  { id: 'home', label: 'Home', hint: 'Nearby' },
  { id: 'search', label: 'Search', hint: 'Medicines' },
  { id: 'orders', label: 'Orders', hint: 'Tracking' },
  { id: 'profile', label: 'Profile', hint: 'Addresses' },
];

export function BottomTabBar({ activeTab, onChange }: BottomTabBarProps) {
  return (
    <View style={styles.wrapper}>
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={[styles.tab, active && styles.activeTab]}
          >
            <Text style={[styles.label, active && styles.activeLabel]}>{tab.label}</Text>
            <Text style={[styles.hint, active && styles.activeHint]}>{tab.hint}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderRadius: 28,
    backgroundColor: '#17384D',
  },
  tab: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#F7FAFD',
  },
  label: {
    color: '#D4E1EA',
    fontSize: 13,
    fontWeight: '700',
  },
  activeLabel: {
    color: '#17384D',
  },
  hint: {
    marginTop: 2,
    color: '#90A8B8',
    fontSize: 10,
    fontWeight: '600',
  },
  activeHint: {
    color: '#4E6B7D',
  },
});
