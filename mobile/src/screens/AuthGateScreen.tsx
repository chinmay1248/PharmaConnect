import { useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { BrandLogo } from '../components/BrandLogo';
import { ActionButton, HeaderIcon } from './customer/CustomerShared';
import { customerStyles } from './customer/customerStyles';
import { ThemeMode, glowShadow, statusBarStyle, themes } from '../theme/theme';
import { AuthSession, login, signupCustomer } from '../services/session';

type AuthGateScreenProps = {
  mode: ThemeMode;
  onToggleTheme: () => void;
  onAuthenticated: (session: AuthSession) => void;
};

type AuthMode = 'signin' | 'signup';

type SignupDraft = {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  address: string;
};

const emptySignupDraft: SignupDraft = {
  fullName: '',
  email: '',
  password: '',
  phone: '',
  address: '',
};

// The seeded accounts every role can use while the platform is still in pilot.
const demoAccounts = [
  { label: 'Customer', email: 'customer@pharmaconnect.app' },
  { label: 'Pharmacy', email: 'retailer@pharmaconnect.app' },
  { label: 'Wholeseller', email: 'wholeseller@pharmaconnect.app' },
  { label: 'Manufacturer', email: 'company@pharmaconnect.app' },
];

const demoPassword = 'Pharma@123';

function normalizePhone(phone: string) {
  return phone.replace(/\D+/g, '');
}

// Splits the single free-text address field into the structured address the backend expects.
function buildAddressPayload(address: string) {
  const cleaned = address.trim();

  if (!cleaned) {
    return undefined;
  }

  const segments = cleaned
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean);
  const postalCodeMatch = cleaned.match(/\b\d{4,6}\b/);

  return {
    line1: segments[0] ?? cleaned,
    area: segments[1] ?? segments[0] ?? 'Local area',
    city: segments[2] ?? 'City',
    state: segments[3] ?? 'State',
    postalCode: postalCodeMatch?.[0] ?? '000000',
  };
}

function validateSignupDraft(draft: SignupDraft) {
  if (!draft.fullName.trim() || !draft.email.trim() || !draft.password || !draft.phone.trim()) {
    return 'Fill in your name, email, password, and phone number to continue.';
  }

  if (!draft.email.includes('@')) {
    return 'Enter a valid email address.';
  }

  if (draft.password.length < 6) {
    return 'Use at least 6 characters for the password.';
  }

  if (normalizePhone(draft.phone).length < 10) {
    return 'Enter a valid phone number with at least 10 digits.';
  }

  return null;
}

// One sign-in surface for every role. The backend decides which role the credentials belong to,
// and the app routes to the matching module afterwards, so there is no role picker here.
export function AuthGateScreen({ mode, onToggleTheme, onAuthenticated }: AuthGateScreenProps) {
  const theme = themes[mode];
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [signupDraft, setSignupDraft] = useState<SignupDraft>(emptySignupDraft);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function updateSignupField(field: keyof SignupDraft, value: string) {
    setSignupDraft((current) => ({ ...current, [field]: value }));
  }

  function applyDemoAccount(email: string) {
    setAuthMode('signin');
    setIdentifier(email);
    setPassword(demoPassword);
    setErrorMessage(null);
  }

  async function handleSignIn() {
    if (submitting) {
      return;
    }

    if (!identifier.trim() || !password) {
      setErrorMessage('Enter your email or phone number and your password.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      onAuthenticated(await login(identifier, password));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Sign-in failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignUp() {
    if (submitting) {
      return;
    }

    const validationError = validateSignupDraft(signupDraft);

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      onAuthenticated(
        await signupCustomer({
          fullName: signupDraft.fullName.trim(),
          email: signupDraft.email.trim().toLowerCase(),
          phone: normalizePhone(signupDraft.phone),
          password: signupDraft.password,
          address: buildAddressPayload(signupDraft.address),
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'We could not create your account.';

      setErrorMessage(
        /same unique field already exists/i.test(message)
          ? 'An account already uses this email or phone number. Sign in instead.'
          : message,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[customerStyles.page, { backgroundColor: theme.bg }]}>
      <StatusBar style={statusBarStyle(mode)} />
      <LinearGradient
        colors={theme.gradientAurora as unknown as readonly [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={customerStyles.page}
      >
      <ScrollView contentContainerStyle={customerStyles.authScroll}>
        <View style={customerStyles.authHeader}>
          <BrandLogo mode={mode} size="hero" />
          <HeaderIcon mode={mode} icon={mode === 'dark' ? 'sun' : 'moon'} onPress={onToggleTheme} />
        </View>

        <View
          style={[
            customerStyles.authCard,
            { backgroundColor: theme.glass, borderColor: theme.hairline },
            glowShadow(theme.shadow, 0.5, 28, 16),
          ]}
        >
          <View style={[customerStyles.authTabBar, { backgroundColor: theme.surfaceAlt }]}>
            {(
              [
                { id: 'signin' as const, label: 'Sign In' },
                { id: 'signup' as const, label: 'Create Account' },
              ]
            ).map((tab) => {
              const isActive = authMode === tab.id;

              return (
                <Pressable
                  key={tab.id}
                  onPress={() => {
                    setAuthMode(tab.id);
                    setErrorMessage(null);
                  }}
                  style={[
                    customerStyles.authTab,
                    isActive && { backgroundColor: theme.primary },
                  ]}
                >
                  <Text
                    style={[
                      customerStyles.authTabText,
                      { color: isActive ? theme.buttonText : theme.subtext },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {authMode === 'signin' ? (
            <View>
              <Text style={[customerStyles.authTitle, { color: theme.text }]}>Welcome back</Text>
              <Text style={[customerStyles.authSub, { color: theme.subtext }]}>
                Sign in with the email address or phone number registered to your account. Customers,
                pharmacies, wholesellers, and manufacturers all sign in here.
              </Text>

              <TextInput
                value={identifier}
                onChangeText={setIdentifier}
                placeholder="Email or phone number"
                placeholderTextColor={theme.subtext}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={[
                  customerStyles.input,
                  { backgroundColor: theme.surfaceAlt, color: theme.text, borderColor: theme.border },
                ]}
              />

              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={theme.subtext}
                secureTextEntry
                onSubmitEditing={handleSignIn}
                style={[
                  customerStyles.input,
                  { backgroundColor: theme.surfaceAlt, color: theme.text, borderColor: theme.border },
                ]}
              />

              <ActionButton
                mode={mode}
                label={submitting ? 'Signing in...' : 'Sign In'}
                icon="log-in"
                onPress={handleSignIn}
                fullWidth
              />

              <Text style={[customerStyles.authDemoLabel, { color: theme.subtext }]}>
                Pilot accounts (password {demoPassword})
              </Text>
              <View style={customerStyles.authDemoRow}>
                {demoAccounts.map((account) => {
                  const isSelected = identifier === account.email;

                  return (
                    <Pressable
                      key={account.email}
                      onPress={() => applyDemoAccount(account.email)}
                      style={[
                        customerStyles.authDemoChip,
                        {
                          backgroundColor: isSelected ? theme.primarySoft : theme.surfaceAlt,
                          borderColor: isSelected ? theme.primary : theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          customerStyles.authDemoChipText,
                          { color: isSelected ? theme.primaryStrong : theme.text },
                        ]}
                      >
                        {account.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : (
            <View>
              <Text style={[customerStyles.authTitle, { color: theme.text }]}>Create your account</Text>
              <Text style={[customerStyles.authSub, { color: theme.subtext }]}>
                Customer accounts can be created here. Pharmacy, wholeseller, and manufacturer
                accounts are onboarded by the PharmaConnect team.
              </Text>

              {(
                [
                  { key: 'fullName' as const, placeholder: 'Full name', secure: false, multiline: false },
                  { key: 'email' as const, placeholder: 'Email address', secure: false, multiline: false },
                  { key: 'password' as const, placeholder: 'Password (min 6 characters)', secure: true, multiline: false },
                  { key: 'phone' as const, placeholder: 'Phone number', secure: false, multiline: false },
                  { key: 'address' as const, placeholder: 'Full delivery address', secure: false, multiline: true },
                ]
              ).map((field) => (
                <TextInput
                  key={field.key}
                  value={signupDraft[field.key]}
                  onChangeText={(value) => updateSignupField(field.key, value)}
                  placeholder={field.placeholder}
                  placeholderTextColor={theme.subtext}
                  secureTextEntry={field.secure}
                  multiline={field.multiline}
                  autoCapitalize={field.key === 'email' ? 'none' : 'sentences'}
                  keyboardType={field.key === 'phone' ? 'phone-pad' : 'default'}
                  style={[
                    customerStyles.input,
                    field.multiline && customerStyles.inputMultiline,
                    { backgroundColor: theme.surfaceAlt, color: theme.text, borderColor: theme.border },
                  ]}
                />
              ))}

              <ActionButton
                mode={mode}
                label={submitting ? 'Creating account...' : 'Create Account'}
                icon="arrow-right"
                onPress={handleSignUp}
                fullWidth
              />
            </View>
          )}

          {submitting ? <ActivityIndicator color={theme.primary} style={{ marginTop: 12 }} /> : null}

          {errorMessage ? (
            <Text style={[customerStyles.helperText, { color: theme.danger }]}>{errorMessage}</Text>
          ) : null}
        </View>
      </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}
