import { ScrollView, Text, View } from 'react-native';
import { SectionHeader } from '../../components/SectionHeader';
import { themes, type ThemeMode } from '../../theme/theme';
import { formatCurrency } from '../../utils/format';
import { ActionButton, Chip, OrderCard, PAYMENT_METHODS, styles } from './wholesellerShared';
import type { B2BMedicine, B2BOrder, B2BPaymentMethod, CompanyCartLine, CompanyListItem } from './wholesellerTypes';

type CompanyBuyTabProps = {
  mode: ThemeMode;
  expandedOrderId: string | null;
  setExpandedOrderId: (id: string | null) => void;
  rejectReason: string;
  setRejectReason: (value: string) => void;
  onApprove: (order: B2BOrder) => void;
  onReject: (order: B2BOrder) => void;
  onAdvance: (order: B2BOrder) => void;
  companies: CompanyListItem[];
  selectedCompany: CompanyListItem | null;
  selectedCompanyId: string | null;
  setSelectedCompanyId: (id: string) => void;
  medicines: B2BMedicine[];
  cart: Record<string, CompanyCartLine>;
  setCart: (cart: Record<string, CompanyCartLine>) => void;
  cartLines: CompanyCartLine[];
  cartTotal: number;
  payMethod: B2BPaymentMethod;
  setPayMethod: (method: B2BPaymentMethod) => void;
  companyOrders: B2BOrder[];
  onAddToCart: (medicine: B2BMedicine) => void;
  onSetCartQty: (medicineId: string, quantity: number) => void;
  onPlaceOrder: () => void;
};

export function WholesellerCompanyBuyTab({
  mode,
  expandedOrderId,
  setExpandedOrderId,
  rejectReason,
  setRejectReason,
  onApprove,
  onReject,
  onAdvance,
  companies,
  selectedCompany,
  selectedCompanyId,
  setSelectedCompanyId,
  medicines,
  cart,
  setCart,
  cartLines,
  cartTotal,
  payMethod,
  setPayMethod,
  companyOrders,
  onAddToCart,
  onSetCartQty,
  onPlaceOrder,
}: CompanyBuyTabProps) {
  const theme = themes[mode];
  const orderCardProps = {
    mode,
    expandedOrderId,
    setExpandedOrderId,
    rejectReason,
    setRejectReason,
    onApprove,
    onReject,
    onAdvance,
  };
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <SectionHeader mode={mode} title="Company buying" description="Build a bulk purchase order against a company catalogue." />
      <View style={styles.chipRow}>
        {companies.map((company) => (
          <Chip
            key={company.id}
            mode={mode}
            label={company.legalName}
            active={selectedCompanyId === company.id}
            onPress={() => setSelectedCompanyId(company.id)}
          />
        ))}
      </View>

      {medicines.map((medicine) => {
        const line = cart[medicine.id];
        return (
          <View key={medicine.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{medicine.brandName}</Text>
            <Text style={[styles.meta, { color: theme.subtext }]}>
              {medicine.genericName} · {medicine.dosage} · {medicine.packSize}
            </Text>
            <Text style={[styles.meta, { color: theme.text }]}>Buy price ≈ {formatCurrency(medicine.mrp * 0.74)} · MRP {formatCurrency(medicine.mrp)}</Text>
            {line ? (
              <View style={styles.stepperRow}>
                <ActionButton mode={mode} label="-10" icon="minus" onPress={() => onSetCartQty(medicine.id, line.quantity - 10)} />
                <Text style={[styles.total, { color: theme.text }]}>{line.quantity}</Text>
                <ActionButton mode={mode} label="+10" icon="plus" onPress={() => onSetCartQty(medicine.id, line.quantity + 10)} />
              </View>
            ) : (
              <ActionButton mode={mode} label="Add to PO" icon="shopping-bag" onPress={() => onAddToCart(medicine)} />
            )}
          </View>
        );
      })}

      {cartLines.length > 0 ? (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.primary }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Purchase order draft</Text>
          {cartLines.map((line) => (
            <View key={line.medicineId} style={styles.lineRow}>
              <Text style={[styles.meta, { color: theme.subtext, flex: 1 }]} numberOfLines={1}>{line.brandName} × {line.quantity}</Text>
              <Text style={[styles.meta, { color: theme.subtext }]}>{formatCurrency(line.unitPrice * line.quantity)}</Text>
            </View>
          ))}
          <Text style={[styles.total, { color: theme.text }]}>Total {formatCurrency(cartTotal)}</Text>
          <View style={styles.chipRow}>
            {PAYMENT_METHODS.map((method) => (
              <Chip key={method} mode={mode} label={method.replace(/_/g, ' ')} active={payMethod === method} onPress={() => setPayMethod(method)} />
            ))}
          </View>
          <View style={styles.actionRow}>
            <ActionButton mode={mode} label={`Place PO with ${selectedCompany?.legalName ?? 'company'}`} icon="send" onPress={() => onPlaceOrder()} />
            <ActionButton mode={mode} label="Clear" icon="trash-2" danger onPress={() => setCart({})} />
          </View>
        </View>
      ) : null}

      <SectionHeader mode={mode} title="Company purchase orders" description="Bulk orders sent upstream." />
      {companyOrders.map((order) => <OrderCard key={order.id} {...orderCardProps} order={order} />)}
    </ScrollView>
  );
}
