import { ScrollView, TextInput } from 'react-native';
import { SectionHeader } from '../../components/SectionHeader';
import { themes, type ThemeMode } from '../../theme/theme';
import { RetailerOrderDetail } from './RetailerOrderDetail';
import { Chip, OrderCard, countByStatus, orderFilters, styles, type OrderFilter } from './retailerShared';
import type { RetailerOrder } from './retailerTypes';

type RetailerOrdersTabProps = {
  mode: ThemeMode;
  orders: RetailerOrder[];
  filteredOrders: RetailerOrder[];
  selectedOrder: RetailerOrder | null;
  onSelectOrder: (id: string) => void;
  searchText: string;
  setSearchText: (value: string) => void;
  orderFilter: OrderFilter;
  setOrderFilter: (filter: OrderFilter) => void;
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

export function RetailerOrdersTab({ mode, orders, filteredOrders, selectedOrder, onSelectOrder, searchText, setSearchText, orderFilter, setOrderFilter, prescriptionApprovalNote, setPrescriptionApprovalNote, rejectionReason, setRejectionReason, courierName, setCourierName, courierPhone, setCourierPhone, courierEtaMinutes, setCourierEtaMinutes, approveOrder, rejectOrder, moveOrder, shareCourierLocation, openPrescription }: RetailerOrdersTabProps) {
  const theme = themes[mode];
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <SectionHeader mode={mode} title="Customer orders" description="Approve prescriptions, pack orders, and update delivery." />
      <TextInput
        value={searchText}
        onChangeText={setSearchText}
        placeholder="Search order number or customer"
        placeholderTextColor={theme.subtext}
        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {orderFilters.map((filter) => (
          <Chip
            key={filter.id}
            mode={mode}
            label={`${filter.label} ${countByStatus(orders, filter.id)}`}
            active={orderFilter === filter.id}
            onPress={() => setOrderFilter(filter.id)}
          />
        ))}
      </ScrollView>
      {filteredOrders.map((order) => (
      <OrderCard
        key={order.id}
        mode={mode}
        order={order}
        active={selectedOrder?.id === order.id}
        onPress={() => onSelectOrder(order.id)}
      />
    ))}
      {selectedOrder ? (
      <RetailerOrderDetail
        mode={mode}
        order={selectedOrder}
        prescriptionApprovalNote={prescriptionApprovalNote}
        setPrescriptionApprovalNote={setPrescriptionApprovalNote}
        rejectionReason={rejectionReason}
        setRejectionReason={setRejectionReason}
        courierName={courierName}
        setCourierName={setCourierName}
        courierPhone={courierPhone}
        setCourierPhone={setCourierPhone}
        courierEtaMinutes={courierEtaMinutes}
        setCourierEtaMinutes={setCourierEtaMinutes}
        approveOrder={approveOrder}
        rejectOrder={rejectOrder}
        moveOrder={moveOrder}
        shareCourierLocation={shareCourierLocation}
        openPrescription={openPrescription}
      />
    ) : null}
    </ScrollView>
  );
}
