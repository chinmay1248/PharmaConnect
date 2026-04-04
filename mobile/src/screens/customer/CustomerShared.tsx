import Feather from '@expo/vector-icons/Feather';
import { Alert, Text, TextInput, View } from 'react-native';
import { ThemeMode, themes } from '../../theme/theme';
import { InteractivePressable } from '../../components/InteractivePressable';
import { customerStyles } from './customerStyles';

type HeaderIconProps = {
  mode: ThemeMode;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
};

type ActionButtonProps = {
  mode: ThemeMode;
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'soft';
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

// Renders one compact action icon in the app header.
export function HeaderIcon({ mode, icon, onPress }: HeaderIconProps) {
  const theme = themes[mode];

  return (
    <InteractivePressable
      onPress={onPress}
      style={[customerStyles.iconButton, { backgroundColor: theme.surface }]}
      hoveredStyle={{ backgroundColor: theme.surfaceAlt }}
      pressedStyle={{ backgroundColor: theme.elevated }}
      scaleHover={1.08}
      scalePress={0.94}
    >
      <Feather name={icon} size={18} color={theme.primary} />
    </InteractivePressable>
  );
}

// Renders the reusable CTA button used across the customer flow.
export function ActionButton({
  mode,
  label,
  icon,
  onPress,
  variant = 'primary',
  fullWidth = false,
}: ActionButtonProps) {
  const theme = themes[mode];
  const palette =
    variant === 'primary'
      ? {
          backgroundColor: theme.primary,
          hoveredColor: theme.primaryStrong,
          pressedColor: theme.primaryStrong,
          borderColor: theme.primary,
          color: theme.buttonText,
        }
      : variant === 'soft'
        ? {
            backgroundColor: theme.surfaceAlt,
            hoveredColor: theme.elevated,
            pressedColor: theme.elevated,
            borderColor: theme.border,
            color: theme.text,
          }
        : {
            backgroundColor: theme.surface,
            hoveredColor: theme.surfaceAlt,
            pressedColor: theme.elevated,
            borderColor: theme.border,
            color: theme.text,
          };

  return (
    <InteractivePressable
      onPress={onPress}
      style={[
        customerStyles.actionButton,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
        fullWidth && customerStyles.fullWidth,
      ]}
      hoveredStyle={{ backgroundColor: palette.hoveredColor }}
      pressedStyle={{ backgroundColor: palette.pressedColor }}
      scaleHover={1.035}
      scalePress={0.975}
    >
      {icon ? <Feather name={icon} size={16} color={palette.color} /> : null}
      <Text style={[customerStyles.actionButtonLabel, { color: palette.color }]}>{label}</Text>
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
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      <Feather name="search" size={18} color={theme.subtext} />
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
        style={customerStyles.searchIconWrap}
        hoveredStyle={{ backgroundColor: theme.surfaceAlt }}
        pressedStyle={{ backgroundColor: theme.elevated }}
      >
        <Feather name="camera" size={16} color={theme.primary} />
      </InteractivePressable>
      <InteractivePressable
        onPress={() => Alert.alert('Voice search', 'Voice search can be connected in the next integration step.')}
        style={customerStyles.searchIconWrap}
        hoveredStyle={{ backgroundColor: theme.surfaceAlt }}
        pressedStyle={{ backgroundColor: theme.elevated }}
      >
        <Feather name="mic" size={16} color={theme.primary} />
      </InteractivePressable>
    </View>
  );
}
