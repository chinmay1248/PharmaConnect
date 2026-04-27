import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View, StyleProp, ViewStyle } from 'react-native';
import { SectionHeader } from '../../components/SectionHeader';
import { ThemeMode, ThemePalette } from '../../theme/theme';
import { CustomerAddressDraft, formatCustomerAddress } from '../../services/customerAuth';
import { ActionButton } from './CustomerShared';
import { customerStyles } from './customerStyles';
import { CustomerAddress, CustomerSession, SignupState } from './customerTypes';

type AccountScreenProps = {
  mode: ThemeMode;
  theme: ThemePalette;
  contentContainerStyle: StyleProp<ViewStyle>;
  signup: SignupState;
  customerSession: CustomerSession | null;
  helperText?: string | null;
  isSavingAddress?: boolean;
  onSaveAddress: (draft: CustomerAddressDraft, addressId?: string) => Promise<boolean>;
  onSetDefaultAddress: (addressId: string) => Promise<boolean>;
  onDeleteAddress: (addressId: string) => Promise<boolean>;
  onLogout: () => void;
};

function buildEmptyDraft(forceDefault = false): CustomerAddressDraft {
  return {
    label: '',
    line1: '',
    line2: '',
    area: '',
    city: '',
    state: '',
    postalCode: '',
    isDefault: forceDefault,
  };
}

function buildDraftFromAddress(address: CustomerAddress): CustomerAddressDraft {
  return {
    label: address.label ?? '',
    line1: address.line1,
    line2: address.line2 ?? '',
    area: address.area,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    isDefault: address.isDefault,
  };
}

// Renders editable customer profile details and saved delivery addresses.
export function AccountScreen({
  mode,
  theme,
  contentContainerStyle,
  signup,
  customerSession,
  helperText,
  isSavingAddress = false,
  onSaveAddress,
  onSetDefaultAddress,
  onDeleteAddress,
  onLogout,
}: AccountScreenProps) {
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CustomerAddressDraft>(() => buildEmptyDraft(false));
  const addresses = customerSession?.user.addresses ?? [];

  const defaultAddress = useMemo(
    () => addresses.find((address) => address.isDefault) ?? addresses[0] ?? null,
    [addresses],
  );
  const syncedAddress = defaultAddress ? formatCustomerAddress(defaultAddress) : null;

  useEffect(() => {
    if (!customerSession) {
      setEditingAddressId(null);
      setDraft(buildEmptyDraft(false));
      return;
    }

    if (editingAddressId) {
      const editedAddress = addresses.find((address) => address.id === editingAddressId);

      if (editedAddress) {
        setDraft(buildDraftFromAddress(editedAddress));
      } else {
        setEditingAddressId(null);
        setDraft(buildEmptyDraft(addresses.length === 0));
      }

      return;
    }

    if (!addresses.length && !draft.isDefault) {
      setDraft((current) => ({ ...current, isDefault: true }));
    }
  }, [addresses, customerSession, draft.isDefault, editingAddressId]);

  function startNewAddress() {
    setEditingAddressId(null);
    setDraft(buildEmptyDraft(addresses.length === 0));
  }

  function startEditAddress(address: CustomerAddress) {
    setEditingAddressId(address.id);
    setDraft(buildDraftFromAddress(address));
  }

  function updateDraftField(field: keyof CustomerAddressDraft, value: string | boolean) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function submitAddress() {
    const saved = await onSaveAddress(draft, editingAddressId ?? undefined);

    if (saved) {
      startNewAddress();
    }
  }

  function confirmDeleteAddress(addressId: string) {
    Alert.alert('Delete address', 'This address will be removed from your saved profile.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void onDeleteAddress(addressId);
        },
      },
    ]);
  }

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
          Default address: {syncedAddress || signup.address || 'Not added'}
        </Text>
        <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>
          Mode: {customerSession ? 'Backend-linked customer session' : 'Local prototype profile'}
        </Text>
        {customerSession ? (
          <ActionButton mode={mode} label="Sign out" icon="log-out" variant="secondary" onPress={onLogout} fullWidth />
        ) : null}
      </View>

      {customerSession ? (
        <>
          <SectionHeader
            mode={mode}
            title="Saved addresses"
            description="Add, edit, set default, and remove delivery addresses for checkout."
          />

          {helperText ? <Text style={[customerStyles.helperText, { color: theme.subtext }]}>{helperText}</Text> : null}

          {addresses.length ? (
            addresses.map((address) => (
              <View
                key={address.id}
                style={[customerStyles.addressCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <View style={customerStyles.infoHeader}>
                  <Text style={[customerStyles.infoTitle, { color: theme.text }]}>
                    {address.label || 'Saved address'}
                  </Text>
                  {address.isDefault ? (
                    <View style={[customerStyles.statusPill, { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}>
                      <Text style={[customerStyles.statusPillText, { color: theme.primaryStrong }]}>Default</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>{formatCustomerAddress(address)}</Text>

                <View style={customerStyles.inlineRow}>
                  <ActionButton
                    mode={mode}
                    label="Edit"
                    icon="edit-2"
                    variant="secondary"
                    onPress={() => startEditAddress(address)}
                  />
                  {!address.isDefault ? (
                    <ActionButton
                      mode={mode}
                      label="Set default"
                      icon="check-circle"
                      variant="soft"
                      onPress={() => {
                        void onSetDefaultAddress(address.id);
                      }}
                    />
                  ) : null}
                  <ActionButton
                    mode={mode}
                    label="Delete"
                    icon="trash-2"
                    variant="secondary"
                    onPress={() => confirmDeleteAddress(address.id)}
                  />
                </View>
              </View>
            ))
          ) : (
            <View style={[customerStyles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>
                No saved delivery addresses yet. Add one below to make checkout smoother.
              </Text>
            </View>
          )}

          <View style={[customerStyles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[customerStyles.infoTitle, { color: theme.text }]}>
              {editingAddressId ? 'Edit address' : 'Add new address'}
            </Text>

            <TextInput
              value={draft.label}
              onChangeText={(value) => updateDraftField('label', value)}
              placeholder="Label (Home, Work, etc.)"
              placeholderTextColor={theme.subtext}
              style={[
                customerStyles.input,
                {
                  backgroundColor: theme.surfaceAlt,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
            />

            <TextInput
              value={draft.line1}
              onChangeText={(value) => updateDraftField('line1', value)}
              placeholder="Address line 1"
              placeholderTextColor={theme.subtext}
              style={[
                customerStyles.input,
                {
                  backgroundColor: theme.surfaceAlt,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
            />

            <TextInput
              value={draft.line2}
              onChangeText={(value) => updateDraftField('line2', value)}
              placeholder="Address line 2 (optional)"
              placeholderTextColor={theme.subtext}
              style={[
                customerStyles.input,
                {
                  backgroundColor: theme.surfaceAlt,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
            />

            <View style={customerStyles.optionGrid}>
              <TextInput
                value={draft.area}
                onChangeText={(value) => updateDraftField('area', value)}
                placeholder="Area"
                placeholderTextColor={theme.subtext}
                style={[
                  customerStyles.input,
                  customerStyles.halfInput,
                  {
                    backgroundColor: theme.surfaceAlt,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
              />
              <TextInput
                value={draft.city}
                onChangeText={(value) => updateDraftField('city', value)}
                placeholder="City"
                placeholderTextColor={theme.subtext}
                style={[
                  customerStyles.input,
                  customerStyles.halfInput,
                  {
                    backgroundColor: theme.surfaceAlt,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
              />
              <TextInput
                value={draft.state}
                onChangeText={(value) => updateDraftField('state', value)}
                placeholder="State"
                placeholderTextColor={theme.subtext}
                style={[
                  customerStyles.input,
                  customerStyles.halfInput,
                  {
                    backgroundColor: theme.surfaceAlt,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
              />
              <TextInput
                value={draft.postalCode}
                onChangeText={(value) => updateDraftField('postalCode', value)}
                placeholder="Postal code"
                placeholderTextColor={theme.subtext}
                style={[
                  customerStyles.input,
                  customerStyles.halfInput,
                  {
                    backgroundColor: theme.surfaceAlt,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
              />
            </View>

            <View style={customerStyles.inlineRow}>
              <ActionButton
                mode={mode}
                label={draft.isDefault ? 'Default for delivery' : 'Mark as default'}
                icon="check-circle"
                variant="soft"
                onPress={() => updateDraftField('isDefault', true)}
              />
              {editingAddressId ? (
                <ActionButton mode={mode} label="Cancel edit" icon="x" variant="secondary" onPress={startNewAddress} />
              ) : null}
            </View>

            <ActionButton
              mode={mode}
              label={isSavingAddress ? 'Saving address...' : editingAddressId ? 'Update address' : 'Save address'}
              icon="save"
              onPress={() => {
                void submitAddress();
              }}
              fullWidth
            />
          </View>
        </>
      ) : (
        <View style={[customerStyles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>
            Address editing is available when you are using a backend-linked customer session.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
