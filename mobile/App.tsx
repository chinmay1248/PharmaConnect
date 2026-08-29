import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { CustomerModuleApp } from './src/screens/CustomerModuleApp';
import { CompanyModuleApp } from './src/screens/CompanyModuleApp';
import { RetailerModuleApp } from './src/screens/RetailerModuleApp';
import { WholesellerModuleApp } from './src/screens/WholesellerModuleApp';
import { AuthGateScreen } from './src/screens/AuthGateScreen';
import { AuthSession, clearStoredSession, resolveModuleForRole, restoreSession } from './src/services/session';
import { registerPushDevice, unregisterPushDevice } from './src/services/pushNotifications';
import { ThemeMode, themes } from './src/theme/theme';

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [mode, setMode] = useState<ThemeMode>('light');

  const toggleTheme = useCallback(() => {
    setMode((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  // A stored session is refreshed against the backend before the app opens, so a revoked or
  // expired token lands on the sign-in screen instead of a half-loaded dashboard.
  useEffect(() => {
    let cancelled = false;

    void restoreSession()
      .then((restored) => {
        if (!cancelled) {
          setSession(restored);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRestoring(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Device push registration follows the signed-in user rather than the app launch, so each
  // account only receives its own notifications on a shared device.
  useEffect(() => {
    if (!session) {
      return;
    }

    void registerPushDevice(session.user.id);
  }, [session]);

  const handleSignOut = useCallback(async () => {
    await unregisterPushDevice();
    await clearStoredSession();
    setSession(null);
  }, []);

  if (restoring) {
    const theme = themes[mode];

    return (
      <View style={[styles.centered, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.subtext }]}>Restoring your session...</Text>
      </View>
    );
  }

  if (!session) {
    return <AuthGateScreen mode={mode} onToggleTheme={toggleTheme} onAuthenticated={setSession} />;
  }

  // The account's role decides which module opens; there is no manual role switcher.
  switch (resolveModuleForRole(session.user.role)) {
    case 'retailer':
      return <RetailerModuleApp session={session} onSignOut={handleSignOut} />;
    case 'wholeseller':
      return <WholesellerModuleApp session={session} onSignOut={handleSignOut} />;
    case 'company':
      return <CompanyModuleApp session={session} onSignOut={handleSignOut} />;
    default:
      return <CustomerModuleApp session={session} onSignOut={handleSignOut} />;
  }
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
});
