import { ScrollView, StyleProp, Text, View, ViewStyle } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { SectionHeader } from '../../components/SectionHeader';
import { ThemeMode, ThemePalette } from '../../theme/theme';
import { ActionButton } from './CustomerShared';
import { CustomerNotification } from './customerTypes';
import { customerStyles } from './customerStyles';

type NotificationsScreenProps = {
  mode: ThemeMode;
  theme: ThemePalette;
  contentContainerStyle: StyleProp<ViewStyle>;
  notifications: CustomerNotification[];
  unreadCount: number;
  helperText?: string | null;
  isLoading: boolean;
  onRefresh: () => void;
  onMarkAllRead: () => void;
};

function formatNotificationDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function notificationIcon(type: string): keyof typeof Feather.glyphMap {
  if (type === 'PAYMENT') {
    return 'credit-card';
  }

  if (type === 'PRESCRIPTION') {
    return 'file-text';
  }

  if (type === 'DELIVERY') {
    return 'truck';
  }

  return 'package';
}

// Shows backend-created customer events such as orders, prescription review, payment, and delivery.
export function NotificationsScreen({
  mode,
  theme,
  contentContainerStyle,
  notifications,
  unreadCount,
  helperText,
  isLoading,
  onRefresh,
  onMarkAllRead,
}: NotificationsScreenProps) {
  return (
    <ScrollView style={customerStyles.scroll} contentContainerStyle={contentContainerStyle}>
      <SectionHeader
        mode={mode}
        title="Notifications"
        description="Order, prescription, payment, and delivery updates from the backend appear here."
      />
      {helperText ? <Text style={[customerStyles.helperText, { color: theme.subtext }]}>{helperText}</Text> : null}

      <View style={[customerStyles.inlineRow, customerStyles.inlineRowStack]}>
        <ActionButton
          mode={mode}
          label={isLoading ? 'Refreshing' : 'Refresh'}
          icon="refresh-cw"
          variant="secondary"
          onPress={onRefresh}
          fullWidth
        />
        <ActionButton
          mode={mode}
          label={unreadCount > 0 ? `Mark ${unreadCount} read` : 'All caught up'}
          icon="check-circle"
          variant="soft"
          onPress={onMarkAllRead}
          fullWidth
        />
      </View>

      {notifications.length === 0 ? (
        <View style={[customerStyles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>
            Customer notifications will appear after live order, prescription, payment, or delivery events.
          </Text>
        </View>
      ) : null}

      {notifications.map((notification) => (
        <View
          key={notification.id}
          style={[
            customerStyles.notificationCard,
            notification.isRead ? null : customerStyles.notificationUnread,
            {
              backgroundColor: notification.isRead ? theme.surface : theme.surfaceAlt,
              borderColor: notification.isRead ? theme.border : theme.primary,
              borderLeftColor: theme.primary,
            },
          ]}
        >
          <View style={customerStyles.infoHeader}>
            <View style={customerStyles.notificationMeta}>
              <Feather name={notificationIcon(notification.type)} size={16} color={theme.primary} />
              <Text style={[customerStyles.infoTitle, { color: theme.text }]}>{notification.title}</Text>
            </View>
            <View style={[customerStyles.statusPill, { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}>
              <Text style={[customerStyles.statusPillText, { color: theme.primaryStrong }]}>
                {notification.isRead ? 'Read' : 'New'}
              </Text>
            </View>
          </View>
          <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>{notification.body}</Text>
          <Text style={[customerStyles.infoLine, { color: theme.subtext }]}>
            {formatNotificationDate(notification.createdAt)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
