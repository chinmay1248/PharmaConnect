import Feather from '@expo/vector-icons/Feather';
import { Alert, Text, View } from 'react-native';
import { BrandLogo } from '../../components/BrandLogo';
import { InteractivePressable } from '../../components/InteractivePressable';
import { ThemeMode, ThemePalette } from '../../theme/theme';
import { HeaderIcon, SearchBar } from './CustomerShared';
import { customerStyles } from './customerStyles';

type CustomerHeaderProps = {
  mode: ThemeMode;
  theme: ThemePalette;
  isHomeScreen: boolean;
  searchQuery: string;
  address: string;
  onChangeSearchText: (value: string) => void;
  onSubmitSearch: () => void;
  onPressAccount: () => void;
  onToggleTheme: () => void;
  onPressCart: () => void;
};

// Renders the shared customer app header, adapting layout for home versus inner screens.
export function CustomerHeader({
  mode,
  theme,
  isHomeScreen,
  searchQuery,
  address,
  onChangeSearchText,
  onSubmitSearch,
  onPressAccount,
  onToggleTheme,
  onPressCart,
}: CustomerHeaderProps) {
  return (
    <View
      style={[
        customerStyles.header,
        {
          backgroundColor: theme.surfaceAlt,
          borderBottomColor: theme.border,
        },
      ]}
    >
      {isHomeScreen ? (
        <>
          <View style={customerStyles.homeHeaderRow}>
            <View style={customerStyles.homeLogoWrap}>
              <BrandLogo mode={mode} size="nav" align="start" />
            </View>
            <View style={customerStyles.headerSearchFlex}>
              <SearchBar
                mode={mode}
                value={searchQuery}
                onChangeText={onChangeSearchText}
                onSubmit={onSubmitSearch}
              />
            </View>
          </View>

          <View style={customerStyles.homeUtilityRow}>
            <InteractivePressable
              onPress={onPressAccount}
              style={[customerStyles.locationBar, customerStyles.locationBarInline]}
              hoveredStyle={{ backgroundColor: theme.surface }}
              pressedStyle={{ backgroundColor: theme.elevated }}
            >
              <View style={customerStyles.locationCopy}>
                <Feather name="map-pin" size={15} color={theme.primary} />
                <Text numberOfLines={1} style={[customerStyles.locationText, { color: theme.text }]}>
                  Deliver to {address || 'your saved address'}
                </Text>
              </View>
              <Text style={[customerStyles.locationAction, { color: theme.primary }]}>Change</Text>
            </InteractivePressable>

            <View style={customerStyles.headerActions}>
              <HeaderIcon mode={mode} icon={mode === 'dark' ? 'sun' : 'moon'} onPress={onToggleTheme} />
              <HeaderIcon
                mode={mode}
                icon="bell"
                onPress={() => Alert.alert('Notifications', 'Notifications panel can be added next.')}
              />
              <HeaderIcon mode={mode} icon="shopping-cart" onPress={onPressCart} />
            </View>
          </View>
        </>
      ) : (
        <>
          <View style={customerStyles.headerTop}>
            <BrandLogo mode={mode} size="compact" align="start" />
            <View style={customerStyles.headerActions}>
              <HeaderIcon mode={mode} icon={mode === 'dark' ? 'sun' : 'moon'} onPress={onToggleTheme} />
              <HeaderIcon
                mode={mode}
                icon="bell"
                onPress={() => Alert.alert('Notifications', 'Notifications panel can be added next.')}
              />
              <HeaderIcon mode={mode} icon="shopping-cart" onPress={onPressCart} />
            </View>
          </View>

          <SearchBar
            mode={mode}
            value={searchQuery}
            onChangeText={onChangeSearchText}
            onSubmit={onSubmitSearch}
          />

          <InteractivePressable
            onPress={onPressAccount}
            style={customerStyles.locationBar}
            hoveredStyle={{ backgroundColor: theme.surface }}
            pressedStyle={{ backgroundColor: theme.elevated }}
          >
            <View style={customerStyles.locationCopy}>
              <Feather name="map-pin" size={15} color={theme.primary} />
              <Text numberOfLines={1} style={[customerStyles.locationText, { color: theme.text }]}>
                Deliver to {address || 'your saved address'}
              </Text>
            </View>
            <Text style={[customerStyles.locationAction, { color: theme.primary }]}>Change</Text>
          </InteractivePressable>
        </>
      )}
    </View>
  );
}
