export type GoRequest = (
  path: string,
  options?: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    signal?: AbortSignal;
  },
) => Promise<unknown>;
export interface GoOrder {
  id: string;
  customerId: string;
  sellerId: string;
  status: string;
  total: number;
  items: { productId: string; title: string; price: number; qty: number }[];
  [key: string]: unknown;
}
export interface Delivery {
  fulfillment: "delivery" | "pickup";
  date: string;
  time: string;
  address?: string;
  comment?: string;
  location?: { latitude: number; longitude: number } | null;
}
export function createWebsiteOrdersClient(request: GoRequest, options?: { audience?: "auto" | "buyer" | "seller" }): {
  load(signal?: AbortSignal): Promise<{
    user: { uid: string; role: "customer" | "seller" };
    orders: GoOrder[];
    audience: "buyer" | "seller";
  }>;
  confirmLink(
    challengeId: string,
    password: string,
  ): Promise<{ linked: true; confirmed: true }>;
  transition(
    order: GoOrder,
    status: string,
    requestId: string,
  ): Promise<GoOrder>;
  checkout(input: {
    items: { productId: string; variantId?: string; qty: number }[];
    delivery?: Delivery;
    deliveries?: Record<string, Delivery>;
    requestId: string;
    cartRevision?: string;
  }): Promise<{ orders: GoOrder[] }>;
  notifications(
    signal?: AbortSignal,
  ): Promise<
    { id: string; userId: string; title: string; telegramState: string }[]
  >;
};
