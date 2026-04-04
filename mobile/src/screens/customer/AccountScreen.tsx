import { ScrollView, Text, View, StyleProp, ViewStyle } from 'react-native';
import { SectionHeader } from '../../components/SectionHeader';
import { ThemeMode, ThemePalette } from '../../theme/theme';
import { customerStyles } from './customerStyles';
import { SignupState } from './customerTypes';

type AccountScreenProps = {
  mode: ThemeMode;
  theme: ThemePalette;
  contentContainerStyle: StyleProp<ViewStyle>;
  signup: SignupState;
};

// Renders the saved customer profile details captured during signup.
export function AccountScreen({ mode, theme, contentContainerStyle, signup }: AccountScreenProps) {
  return (
    <ScrollView style={customerStyles.scroll} contentContainerStyle={contentContainerStyle}>
      <SectionHeader
        mode={mode}
        title="Account"
        description="Saved customer details from the first page stay visible here."
      />
      <View style={[customerStyles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[customerStyles.infoTitle, { color: theme.text }]}>{signup.fullName || 'Customer'}</Text>
        <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>Email: {signup.email || 'Not added'}</Text>
        <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>Phone: {signup.phone || 'Not added'}</Text>
        <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>Address: {signup.address || 'Not added'}</Text>
      </View>
    </ScrollView>
  );
}
