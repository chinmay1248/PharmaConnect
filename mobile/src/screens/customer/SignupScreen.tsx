import { SafeAreaView, ScrollView, Text, TextInput, View, StyleProp, ViewStyle } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BrandLogo } from '../../components/BrandLogo';
import { ThemeMode, ThemePalette, statusBarStyle } from '../../theme/theme';
import { customerStyles } from './customerStyles';
import { ActionButton, HeaderIcon } from './CustomerShared';
import { SignupState } from './customerTypes';

type SignupScreenProps = {
  mode: ThemeMode;
  theme: ThemePalette;
  signup: SignupState;
  contentContainerStyle: StyleProp<ViewStyle>;
  onChangeField: (field: keyof SignupState, value: string) => void;
  onToggleTheme: () => void;
  onContinue: () => void;
  helperText: string;
  isSubmitting: boolean;
};

// Renders the entry form that collects the customer's basic details before app access.
export function SignupScreen({
  mode,
  theme,
  signup,
  contentContainerStyle,
  onChangeField,
  onToggleTheme,
  onContinue,
  helperText,
  isSubmitting,
}: SignupScreenProps) {
  return (
    <SafeAreaView style={[customerStyles.page, { backgroundColor: theme.bg }]}>
      <StatusBar style={statusBarStyle(mode)} />
      <ScrollView contentContainerStyle={contentContainerStyle}>
        <View style={customerStyles.signupHeader}>
          <BrandLogo mode={mode} size="hero" />
          <HeaderIcon mode={mode} icon={mode === 'dark' ? 'sun' : 'moon'} onPress={onToggleTheme} />
        </View>
        <View
          style={[
            customerStyles.authCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={[customerStyles.authTitle, { color: theme.text }]}>Create your customer account</Text>
          <Text style={[customerStyles.authSub, { color: theme.subtext }]}>
            Enter your address and details first, then search medicines, compare pharmacies, upload prescription when needed, choose payment, and get your invoice.
          </Text>

          {[
            { key: 'fullName', placeholder: 'Full name', secure: false, multiline: false },
            { key: 'email', placeholder: 'Email address', secure: false, multiline: false },
            { key: 'password', placeholder: 'Password', secure: true, multiline: false },
            { key: 'phone', placeholder: 'Phone number', secure: false, multiline: false },
            { key: 'address', placeholder: 'Full delivery address', secure: false, multiline: true },
          ].map((field) => (
            <TextInput
              key={field.key}
              value={signup[field.key as keyof SignupState]}
              onChangeText={(value) => onChangeField(field.key as keyof SignupState, value)}
              placeholder={field.placeholder}
              placeholderTextColor={theme.subtext}
              secureTextEntry={field.secure}
              multiline={field.multiline}
              keyboardType={field.key === 'phone' ? 'phone-pad' : 'default'}
              style={[
                customerStyles.input,
                field.multiline && customerStyles.inputMultiline,
                {
                  backgroundColor: theme.surfaceAlt,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
            />
          ))}

          <ActionButton
            mode={mode}
            label={isSubmitting ? 'Creating account...' : 'Continue to customer app'}
            icon="arrow-right"
            onPress={onContinue}
            fullWidth
          />
          <Text style={[customerStyles.helperText, { color: theme.subtext }]}>{helperText}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
