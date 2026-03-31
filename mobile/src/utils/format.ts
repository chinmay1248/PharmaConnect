export function formatCurrency(amount: number) {
  return `₹${amount.toFixed(0)}`;
}

export function orderStepIndex(status: string) {
  const steps = [
    'Order Placed',
    'Confirmed',
    'Packed',
    'Out for Delivery',
    'Delivered',
  ];

  return steps.indexOf(status);
}
