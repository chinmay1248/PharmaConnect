// Formats currency values for all medicine, cart, and invoice price labels.
export function formatCurrency(amount: number) {
  return `\u20B9${amount.toFixed(0)}`;
}

// Converts an order status into its step position for the tracking timeline.
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
