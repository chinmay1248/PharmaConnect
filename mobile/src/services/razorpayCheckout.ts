type RazorpayCheckoutResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type OpenRazorpayCheckoutInput = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
};

type RazorpayConstructor = new (
  options: Record<string, unknown>,
) => {
  open: () => void;
  on: (eventName: string, handler: (response: { error?: { description?: string } }) => void) => void;
};

const checkoutScriptUrl = 'https://checkout.razorpay.com/v1/checkout.js';

function getBrowserWindow() {
  return globalThis as typeof globalThis & {
    document?: {
      createElement: (tagName: string) => {
        src: string;
        async: boolean;
        onload: (() => void) | null;
        onerror: (() => void) | null;
      };
      body?: {
        appendChild: (node: unknown) => void;
      };
      querySelector: (selector: string) => unknown;
    };
    Razorpay?: RazorpayConstructor;
    setInterval: typeof setInterval;
    clearInterval: typeof clearInterval;
    setTimeout: typeof setTimeout;
  };
}

function ensureRazorpayScript() {
  const browserWindow = getBrowserWindow();

  if (browserWindow.Razorpay) {
    return Promise.resolve();
  }

  if (!browserWindow.document?.body) {
    return Promise.reject(new Error('Razorpay Checkout is only available in the web build right now.'));
  }

  if (browserWindow.document.querySelector(`script[src="${checkoutScriptUrl}"]`)) {
    return new Promise<void>((resolve, reject) => {
      const checkLoaded = browserWindow.setInterval(() => {
        if (browserWindow.Razorpay) {
          browserWindow.clearInterval(checkLoaded);
          resolve();
        }
      }, 50);

      browserWindow.setTimeout(() => {
        browserWindow.clearInterval(checkLoaded);
        reject(new Error('Razorpay Checkout did not finish loading.'));
      }, 5000);
    });
  }

  return new Promise<void>((resolve, reject) => {
    const script = browserWindow.document!.createElement('script');
    script.src = checkoutScriptUrl;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Razorpay Checkout.'));
    browserWindow.document!.body!.appendChild(script);
  });
}

// Opens Razorpay Standard Checkout on Expo web and returns the signed success payload.
export async function openRazorpayCheckout(input: OpenRazorpayCheckoutInput) {
  await ensureRazorpayScript();

  const browserWindow = getBrowserWindow();

  if (!browserWindow.Razorpay) {
    throw new Error('Razorpay Checkout is not available.');
  }

  const Razorpay = browserWindow.Razorpay;

  return new Promise<RazorpayCheckoutResponse>((resolve, reject) => {
    const checkout = new Razorpay({
      key: input.keyId,
      amount: input.amount,
      currency: input.currency,
      name: 'PharmaConnect',
      description: 'Medicine order payment',
      order_id: input.orderId,
      prefill: {
        name: input.customerName,
        email: input.customerEmail,
        contact: input.customerPhone,
      },
      theme: {
        color: '#0f9f8f',
      },
      handler: (response: RazorpayCheckoutResponse) => resolve(response),
      modal: {
        ondismiss: () => reject(new Error('Payment checkout was closed before completion.')),
      },
    });

    checkout.on('payment.failed', (response) => {
      reject(new Error(response.error?.description ?? 'Razorpay payment failed.'));
    });

    checkout.open();
  });
}
