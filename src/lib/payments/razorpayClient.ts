"use client";

type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
};

type RazorpayUser = {
  name?: string;
  email?: string;
  contact?: string;
};

type CheckoutParams = {
  order: RazorpayOrder;
  keyId?: string;
  user?: RazorpayUser;
  description?: string;
  notes?: Record<string, string>;
};

type CheckoutResult =
  | {
      status: "success";
      paymentId: string;
      signature: string;
    }
  | {
      status: "dismissed";
    }
  | {
      status: "error";
      error?: string;
    };

declare global {
  interface Window {
    Razorpay?: any;
  }
}

let loadPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Razorpay can only be loaded in the browser"));
      return;
    }

    if (window.Razorpay) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay script"));

    document.body.appendChild(script);
  });

  return loadPromise;
}

export async function openRazorpayCheckout(params: CheckoutParams): Promise<CheckoutResult> {
  try {
    await loadRazorpayScript();
  } catch {
    return { status: "error", error: "Payment module failed to load" };
  }

  if (typeof window === "undefined" || !window.Razorpay) {
    return { status: "error", error: "Razorpay is not available in this environment" };
  }

  const key = params.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

  if (!key) {
    return { status: "error", error: "Razorpay key is not configured" };
  }

  const { order, user, description, notes } = params;

  return new Promise<CheckoutResult>((resolve) => {
    const options: any = {
      key,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      description: description || "neta payment",
      notes: notes || {},
      prefill: {
        name: user?.name || "",
        email: user?.email || "",
        contact: user?.contact || ""
      },
      handler: (response: any) => {
        resolve({
          status: "success",
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature
        });
      },
      modal: {
        ondismiss: () => {
          resolve({ status: "dismissed" });
        }
      }
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      resolve({ status: "error", error: "Failed to open Razorpay checkout" });
    }
  });
}

