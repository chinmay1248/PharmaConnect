declare module 'react-native-razorpay' {
  export type RazorpayCheckoutResponse = {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };

  export type RazorpayCheckoutOptions = {
    key: string;
    amount: number | string;
    currency?: string;
    name?: string;
    description?: string;
    order_id?: string;
    prefill?: {
      name?: string;
      email?: string;
      contact?: string;
    };
    theme?: {
      color?: string;
    };
    [key: string]: unknown;
  };

  const RazorpayCheckout: {
    open: (options: RazorpayCheckoutOptions) => Promise<RazorpayCheckoutResponse>;
  };

  export default RazorpayCheckout;
}
