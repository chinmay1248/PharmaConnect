import { ScrollView, Text, View, StyleProp, ViewStyle } from 'react-native';
import { SectionHeader } from '../../components/SectionHeader';
import { ThemeMode, ThemePalette } from '../../theme/theme';
import { formatCustomerAddress } from '../../services/customerAuth';
import { ActionButton } from './CustomerShared';
import { customerStyles } from './customerStyles';
import { CustomerSession, SignupState } from './customerTypes';

type AccountScreenProps = {
  mode: ThemeMode;
  theme: ThemePalette;
  contentContainerStyle: StyleProp<ViewStyle>;
  signup: SignupState;
  customerSession: CustomerSession | null;
  onLogout: () => void;
};

// Renders the saved customer profile details captured during signup.
export function AccountScreen({
  mode,
  theme,
  contentContainerStyle,
  signup,
  customerSession,
  onLogout,
}: AccountScreenProps) {
  const defaultAddress = customerSession?.user.addresses.find((address) => address.isDefault) ?? customerSession?.user.addresses[0];
  const syncedAddress = defaultAddress ? formatCustomerAddress(defaultAddress) : null;

  return (
    <ScrollView style={customerStyles.scroll} contentContainerStyle={contentContainerStyle}>
      <SectionHeader
        mode={mode}
        title="Account"
        description={
          customerSession
            ? 'Your customer profile is now linked to the backend auth service.'
            : 'Saved customer details from the first page stay visible here.'
        }
      />
      <View style={[customerStyles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[customerStyles.infoTitle, { color: theme.text }]}>
          {customerSession?.user.fullName || signup.fullName || 'Customer'}
        </Text>
        <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>
          Email: {customerSession?.user.email || signup.email || 'Not added'}
        </Text>
        <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>
          Phone: {customerSession?.user.phone || signup.phone || 'Not added'}
        </Text>
        <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>
          Address: {syncedAddress || signup.address || 'Not added'}
        </Text>
        <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>
          Mode: {customerSession ? 'Backend-linked customer session' : 'Local prototype profile'}
        </Text>
        {customerSession ? (
          <ActionButton mode={mode} label="Sign out" icon="log-out" variant="secondary" onPress={onLogout} fullWidth />
        ) : null}
      </View>
    </ScrollView>
  );
}
