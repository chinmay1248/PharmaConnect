import Feather from '@expo/vector-icons/Feather';
import { ScrollView, Text, View, StyleProp, ViewStyle } from 'react-native';
import { InteractivePressable } from '../../components/InteractivePressable';
import { SectionHeader } from '../../components/SectionHeader';
import { ThemeMode, ThemePalette } from '../../theme/theme';
import { ActionButton } from './CustomerShared';
import { DeliveryMethod } from './customerTypes';
import { customerStyles } from './customerStyles';

type DeliveryScreenProps = {
  mode: ThemeMode;
  theme: ThemePalette;
  contentContainerStyle: StyleProp<ViewStyle>;
  deliveryMethod: DeliveryMethod;
  optionCardWidth: number;
  onSelectDeliveryMethod: (method: DeliveryMethod) => void;
  onPlaceOrder: () => void;
};

// Renders the home delivery versus pickup choice screen.
export function DeliveryScreen({
  mode,
  theme,
  contentContainerStyle,
  deliveryMethod,
  optionCardWidth,
  onSelectDeliveryMethod,
  onPlaceOrder,
}: DeliveryScreenProps) {
  return (
    <ScrollView style={customerStyles.scroll} contentContainerStyle={contentContainerStyle}>
      <SectionHeader
        mode={mode}
        title="Choose delivery option"
        description="Pick home delivery or pickup from pharmacy before placing the order."
      />
      <View style={customerStyles.optionGrid}>
        {[
          { id: 'home', label: 'Home delivery', icon: 'truck' },
          { id: 'pickup', label: 'Pickup from pharmacy', icon: 'map-pin' },
        ].map((option) => {
          const active = deliveryMethod === option.id;
          return (
            <InteractivePressable
              key={option.id}
              onPress={() => onSelectDeliveryMethod(option.id as DeliveryMethod)}
              style={[
                customerStyles.optionCard,
                { width: optionCardWidth },
                {
                  backgroundColor: active ? theme.primarySoft : theme.surface,
                  borderColor: active ? theme.primary : theme.border,
                },
              ]}
              hoveredStyle={{ backgroundColor: active ? theme.primarySoft : theme.surfaceAlt }}
              pressedStyle={{ backgroundColor: theme.elevated }}
            >
              <Feather name={option.icon as keyof typeof Feather.glyphMap} size={20} color={theme.primary} />
              <Text style={[customerStyles.optionTitle, { color: theme.text }]}>{option.label}</Text>
            </InteractivePressable>
          );
        })}
      </View>
      <ActionButton mode={mode} label="Place order" icon="check" onPress={onPlaceOrder} fullWidth />
    </ScrollView>
  );
}
