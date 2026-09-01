import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert, Text, TextInput, View } from 'react-native';
import { ThemeMode, glowShadow, themes } from '../../theme/theme';
import { InteractivePressable } from '../../components/InteractivePressable';
import { customerStyles } from './customerStyles';

type HeaderIconProps = {
  mode: ThemeMode;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  badgeCount?: number;
};

type ActionButtonProps = {
  mode: ThemeMode;
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'soft' | 'accentPrimary' | 'accentSecondary';
  fullWidth?: boolean;
};

type SearchBarProps = {
  mode: ThemeMode;
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
};

// Maps quick service labels to the icons shown on the home screen chips.
export const serviceIcons: Record<string, keyof typeof Feather.glyphMap> = {
  'Rx Upload': 'file-plus',
  Refill: 'rotate-cw',
  Deals: 'tag',
  Doctor: 'activity',
  'Care+': 'heart',
};

// Maps home category labels to the icons shown inside category tiles.
export const categoryIcons: Record<string, keyof typeof Feather.glyphMap> = {
  Fever: 'thermometer',
  Diabetes: 'droplet',
  Vitamins: 'sun',
  Heart: 'heart',
  Skin: 'smile',
  'Baby Care': 'shield',
  'Pain Relief': 'zap',
  Digestive: 'coffee',
};

// Renders one compact action icon in the app header as a soft glass chip.
export function HeaderIcon({ mode, icon, onPress, badgeCount = 0 }: HeaderIconProps) {
  const theme = themes[mode];
  const visibleBadgeCount = Math.min(Math.max(badgeCount, 0), 99);

  return (
    <InteractivePressable
      onPress={onPress}
      style={[
        customerStyles.iconButton,
        { backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.hairline },
      ]}
      hoveredStyle={{ backgroundColor: theme.surfaceAlt, borderColor: theme.primary }}
      pressedStyle={{ backgroundColor: theme.elevated }}
      scaleHover={1.08}
      scalePress={0.94}
    >
      <Feather name={icon} size={18} color={theme.primary} />
      {visibleBadgeCount > 0 ? (
        <View style={[customerStyles.iconBadge, { backgroundColor: theme.danger }]}>
          <Text style={[customerStyles.iconBadgeText, { color: '#ffffff' }]}>
            {visibleBadgeCount > 9 ? '9+' : visibleBadgeCount}
          </Text>
        </View>
      ) : null}
    </InteractivePressable>
  );
}

// Resolves the fill treatment for one button variant.
// - primary        the bold near-black pill used for the main action on a screen
// - accentPrimary  a teal gradient, for a lively secondary action
// - accentSecondary a flat teal fill
// - soft / secondary quiet, low-contrast chips that sit inside content
function resolveButtonFill(mode: ThemeMode, variant: NonNullable<ActionButtonProps['variant']>) {
  const theme = themes[mode];

  if (variant === 'primary') {
    return {
      solid: theme.cta,
      color: theme.ctaText,
      glow: theme.shadow,
      border: 'transparent',
    } as const;
  }

  if (variant === 'accentPrimary') {
    return {
      gradient: theme.gradientAccent,
      color: '#ffffff',
      glow: theme.glow,
      border: 'transparent',
    } as const;
  }

  if (variant === 'accentSecondary') {
    return {
      solid: theme.primary,
      color: '#ffffff',
      glow: theme.glow,
      border: 'transparent',
    } as const;
  }

  if (variant === 'soft') {
    return {
      solid: theme.surfaceAlt,
      color: theme.text,
      glow: 'transparent',
      border: theme.border,
    } as const;
  }

  return {
    solid: theme.glass,
    color: theme.text,
    glow: 'transparent',
    border: theme.border,
  } as const;
}

// Renders the reusable CTA button used across the customer flow. The primary
// variant is the bold pill; teal variants add a soft glow; quiet variants stay flat.
export function ActionButton({
  mode,
  label,
  icon,
  onPress,
  variant = 'primary',
  fullWidth = false,
}: ActionButtonProps) {
  const fill = resolveButtonFill(mode, variant);
  const hasGradient = 'gradient' in fill;
  const lifts = fill.glow !== 'transparent';

  const content = (
    <>
      {icon ? <Feather name={icon} size={16} color={fill.color} /> : null}
      <Text style={[customerStyles.actionButtonLabel, { color: fill.color }]}>{label}</Text>
    </>
  );

  return (
    <InteractivePressable
      onPress={onPress}
      style={[
        customerStyles.actionButtonShell,
        fullWidth && customerStyles.fullWidth,
        lifts ? glowShadow(fill.glow, 0.8, 18, 8) : null,
      ]}
      hoveredStyle={{ opacity: 0.92 }}
      pressedStyle={{ opacity: 0.85 }}
      scaleHover={1.03}
      scalePress={0.975}
    >
      {hasGradient ? (
        <LinearGradient
          colors={fill.gradient as unknown as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[customerStyles.actionButton, { borderColor: fill.border }]}
        >
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            customerStyles.actionButton,
            { backgroundColor: fill.solid, borderColor: fill.border },
          ]}
        >
          {content}
        </View>
      )}
    </InteractivePressable>
  );
}

// Renders the shared medicine search bar with camera and voice shortcuts.
export function SearchBar({ mode, value, onChangeText, onSubmit }: SearchBarProps) {
  const theme = themes[mode];

  return (
    <View
      style={[
        customerStyles.searchWrap,
        {
          backgroundColor: theme.glass,
          borderColor: theme.hairline,
        },
        glowShadow(theme.shadow, 0.5, 16, 8),
      ]}
    >
      <Feather name="search" size={18} color={theme.primary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder="Search medicines, salts or ask a question"
        placeholderTextColor={theme.subtext}
        style={[customerStyles.searchInput, { color: theme.text }]}
      />
      <InteractivePressable
        onPress={() => Alert.alert('Camera', 'Image search can be connected in the next integration step.')}
        style={[customerStyles.searchIconWrap, { backgroundColor: theme.surfaceAlt }]}
        hoveredStyle={{ backgroundColor: theme.elevated }}
        pressedStyle={{ backgroundColor: theme.elevated }}
      >
        <Feather name="camera" size={16} color={theme.primary} />
      </InteractivePressable>
      <InteractivePressable
        onPress={() => Alert.alert('Voice search', 'Voice search can be connected in the next integration step.')}
        style={[customerStyles.searchIconWrap, { backgroundColor: theme.surfaceAlt }]}
        hoveredStyle={{ backgroundColor: theme.elevated }}
        pressedStyle={{ backgroundColor: theme.elevated }}
      >
        <Feather name="mic" size={16} color={theme.primary} />
      </InteractivePressable>
    </View>
  );
}
