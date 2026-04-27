import { StyleSheet, Text, View } from 'react-native';
import { ThemeMode, themes } from '../theme/theme';
import { InteractivePressable } from './InteractivePressable';

type SectionHeaderProps = {
  mode: ThemeMode;
  title: string;
  description?: string;
  action?: string;
  onAction?: () => void;
};

// Renders a reusable section title row with optional helper text and action link.
export function SectionHeader({
  mode,
  title,
  description,
  action,
  onAction,
}: SectionHeaderProps) {
  const theme = themes[mode];

  return (
    <View style={styles.wrapper}>
      {/* Left side: section title and optional helper text */}
      <View style={styles.copy}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        {description ? (
          <Text style={[styles.description, { color: theme.subtext }]}>{description}</Text>
        ) : null}
      </View>
      {/* Right side: optional CTA such as "See all" */}
      {action ? (
        <InteractivePressable
          onPress={onAction}
          style={styles.action}
          hoveredStyle={{ backgroundColor: theme.surfaceAlt }}
          pressedStyle={{ backgroundColor: theme.elevated }}
        >
          <Text style={[styles.actionLabel, { color: theme.primary }]}>{action}</Text>
        </InteractivePressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 18,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 12,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
  },
  action: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
});
