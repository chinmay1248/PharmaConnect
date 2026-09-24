import { Text, TextInput, View } from 'react-native';
import { SectionHeader } from '../../components/SectionHeader';
import { formatCurrency } from '../../utils/format';
import { themes, type ThemeMode } from '../../theme/theme';
import {
  ActionButton,
  BillRow,
  Chip,
  formatAddress,
  formatShortDate,
  prescriptionDenialReasons,
  styles,
} from './retailerShared';
import type { RetailerOrder } from './retailerTypes';

type RetailerOrderDetailProps = {
  mode: ThemeMode;
  order: RetailerOrder;
  prescriptionApprovalNote: string;
  setPrescriptionApprovalNote: (value: string) => void;
  rejectionReason: string;
  setRejectionReason: (value: string) => void;
  courierName: string;
  setCourierName: (value: string) => void;
  courierPhone: string;
  setCourierPhone: (value: string) => void;
  courierEtaMinutes: string;
  setCourierEtaMinutes: (value: string) => void;
  approveOrder: (order: RetailerOrder) => Promise<void>;
  rejectOrder: (order: RetailerOrder) => Promise<void>;
  moveOrder: (order: RetailerOrder) => Promise<void>;
  shareCourierLocation: (order: RetailerOrder) => Promise<void>;
  openPrescription: (order: RetailerOrder) => Promise<void>;
};

export function RetailerOrderDetail({ mode, order, prescriptionApprovalNote, setPrescriptionApprovalNote, rejectionReason, setRejectionReason, courierName, setCourierName, courierPhone, setCourierPhone, courierEtaMinutes, setCourierEtaMinutes, approveOrder, rejectOrder, moveOrder, shareCourierLocation, openPrescription }: RetailerOrderDetailProps) {
  const theme = themes[mode];
  const canDecide = order.status === 'PENDING_RETAILER_APPROVAL';
  const canMove = ['APPROVED_BY_RETAILER', 'PAYMENT_PENDING', 'PAID', 'PACKED', 'OUT_FOR_DELIVERY', 'READY_FOR_PICKUP'].includes(order.status);

  return (
    <View style={[styles.detailPanel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <SectionHeader mode={mode} title="Order detail" description="Customer, prescription, payment, and fulfilment actions." />
      <Text style={[styles.cardTitle, { color: theme.text }]}>{order.customer.fullName}</Text>
      <Text style={[styles.cardMeta, { color: theme.subtext }]}>Phone: {order.customer.phone}</Text>
      <Text style={[styles.cardMeta, { color: theme.subtext }]}>Address: {formatAddress(order)}</Text>
      <Text style={[styles.cardMeta, { color: theme.subtext }]}>
        Payment: {order.latestPayment?.method ?? 'Not selected'} - {order.latestPayment?.status ?? 'Pending'}
      </Text>

      <View style={styles.table}>
        {order.items.map((item) => (
          <View key={`${order.id}-${item.medicineId}`} style={styles.tableRow}>
            <View style={styles.tableName}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{item.brandName}</Text>
              <Text style={[styles.cardMeta, { color: theme.subtext }]}>{item.genericName}</Text>
            </View>
            <Text style={[styles.cardMeta, { color: theme.subtext }]}>x{item.quantity}</Text>
            <Text style={[styles.cardMeta, { color: theme.text }]}>{formatCurrency(item.lineTotal)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.billBox}>
        <BillRow mode={mode} label="Subtotal" value={formatCurrency(order.subtotalAmount)} />
        <BillRow mode={mode} label="Delivery" value={formatCurrency(order.deliveryFee)} />
        <BillRow mode={mode} label="Total" value={formatCurrency(order.totalAmount)} strong />
      </View>

      {order.prescription ? (
        <View style={[styles.rxBox, { borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Prescription</Text>
          <Text style={[styles.cardMeta, { color: theme.subtext }]}>
            {order.prescription.originalFileName ?? 'Uploaded prescription'} - {order.prescription.status}
          </Text>
          {order.prescription.reviewedAt ? (
            <Text style={[styles.cardMeta, { color: theme.subtext }]}>
              Reviewed {formatShortDate(order.prescription.reviewedAt)}
            </Text>
          ) : null}
          {order.prescription.retailerNotes ? (
            <Text style={[styles.reviewNote, { color: theme.text, backgroundColor: theme.surfaceAlt }]}>
              {order.prescription.retailerNotes}
            </Text>
          ) : null}
          <ActionButton
            mode={mode}
            label="Open prescription"
            icon="external-link"
            variant="secondary"
            onPress={() => {
              void openPrescription(order);
            }}
          />
        </View>
      ) : null}

      {canDecide ? (
        <>
          {order.prescription ? (
            <TextInput
              value={prescriptionApprovalNote}
              onChangeText={setPrescriptionApprovalNote}
              placeholder="Approval note"
              placeholderTextColor={theme.subtext}
              multiline
              style={[
                styles.input,
                styles.textArea,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt },
              ]}
            />
          ) : null}
          {order.prescription ? (
            <View style={styles.chipRow}>
              {prescriptionDenialReasons.map((reason) => (
                <Chip
                  key={reason}
                  mode={mode}
                  label={reason}
                  active={rejectionReason === reason}
                  onPress={() => setRejectionReason(reason)}
                />
              ))}
            </View>
          ) : null}
          <TextInput
            value={rejectionReason}
            onChangeText={setRejectionReason}
            placeholder="Denial reason"
            placeholderTextColor={theme.subtext}
            multiline
            style={[
              styles.input,
              styles.textArea,
              { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt },
            ]}
          />
          <View style={styles.actionRow}>
            <ActionButton
              mode={mode}
              label={order.prescription ? 'Approve Rx' : 'Approve'}
              icon="check"
              onPress={() => {
                void approveOrder(order);
              }}
            />
            <ActionButton
              mode={mode}
              label={order.prescription ? 'Reject Rx' : 'Deny'}
              icon="x"
              variant="danger"
              onPress={() => {
                void rejectOrder(order);
              }}
            />
          </View>
        </>
      ) : null}

      {/* Courier details are captured before dispatch and can be refreshed while on the road. */}
      {order.deliveryMethod !== 'PICKUP' && ['PACKED', 'OUT_FOR_DELIVERY'].includes(order.status) ? (
        <View style={[styles.rxBox, { borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Delivery</Text>
          <TextInput
            value={courierName}
            onChangeText={setCourierName}
            placeholder="Courier name"
            placeholderTextColor={theme.subtext}
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
          />
          <TextInput
            value={courierPhone}
            onChangeText={setCourierPhone}
            placeholder="Courier phone"
            placeholderTextColor={theme.subtext}
            keyboardType="phone-pad"
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
          />
          <TextInput
            value={courierEtaMinutes}
            onChangeText={setCourierEtaMinutes}
            placeholder="ETA in minutes"
            placeholderTextColor={theme.subtext}
            keyboardType="number-pad"
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
          />
          {order.status === 'OUT_FOR_DELIVERY' ? (
            <>
              {order.delivery?.lastLocationAt ? (
                <Text style={[styles.cardMeta, { color: theme.subtext }]}>
                  Last shared {formatShortDate(order.delivery.lastLocationAt)}
                </Text>
              ) : null}
              <ActionButton
                mode={mode}
                label="Share courier location"
                icon="map-pin"
                variant="secondary"
                onPress={() => {
                  void shareCourierLocation(order);
                }}
              />
            </>
          ) : null}
        </View>
      ) : null}

      {canMove ? (
        <ActionButton mode={mode} label="Move to next status" icon="arrow-right" onPress={() => { void moveOrder(order); }} />
      ) : null}
    </View>
  );
}
