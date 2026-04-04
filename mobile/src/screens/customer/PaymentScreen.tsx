import Feather from '@expo/vector-icons/Feather';
import { ScrollView, Text, View, StyleProp, ViewStyle } from 'react-native';
import { InteractivePressable } from '../../components/InteractivePressable';
import { SectionHeader } from '../../components/SectionHeader';
import { ThemeMode, ThemePalette } from '../../theme/theme';
import { ActionButton } from './CustomerShared';
import { PaymentMethod } from './customerTypes';
import { customerStyles } from './customerStyles';

type PaymentScreenProps = {
  mode: ThemeMode;
  theme: ThemePalette;
  contentContainerStyle: StyleProp<ViewStyle>;
  paymentMethod: PaymentMethod;
  optionCardWidth: number;
  onSelectPaymentMethod: (method: PaymentMethod) => void;
  onContinue: () => void;
};

// Renders the payment method selection step.
export function PaymentScreen({
  mode,
  theme,
  contentContainerStyle,
  paymentMethod,
  optionCardWidth,
  onSelectPaymentMethod,
  onContinue,
}: PaymentScreenProps) {
  return (
    <ScrollView style={customerStyles.scroll} contentContainerStyle={contentContainerStyle}>
      <SectionHeader
        mode={mode}
        title="Select payment option"
        description="Choose the exact payment step before delivery choice."
      />
      <View style={customerStyles.optionGrid}>
        {[
          { id: 'upi', label: 'UPI', icon: 'smartphone' },
          { id: 'card', label: 'Card', icon: 'credit-card' },
          { id: 'bank', label: 'Bank details', icon: 'briefcase' },
          { id: 'cod', label: 'Cash on delivery', icon: 'dollar-sign' },
        ].map((option) => {
          const active = paymentMethod === option.id;
          return (
            <InteractivePressable
              key={option.id}
              onPress={() => onSelectPaymentMethod(option.id as PaymentMethod)}
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
      <ActionButton mode={mode} label="Continue to delivery" icon="arrow-right" onPress={onContinue} fullWidth />
    </ScrollView>
  );
}
