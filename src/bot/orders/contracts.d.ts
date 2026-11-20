export type Role = "CLIENT" | "SELLER" | "ADMIN";
export type Status =
  | "pending"
  | "accepted"
  | "preparing"
  | "ready"
  | "delivering"
  | "delivered"
  | "completed"
  | "cancelled"
  | "rejected";
export interface Identity {
  linked: true;
  confirmed: true;
  telegramId: string;
  user: { id: string; role: Role; status: "active" };
  shopId?: string;
  botStarted?: boolean;
}
export interface Order {
  id: string;
  number: string;
  customerId: string;
  sellerId: string;
  shopId: string;
  shopName: string;
  buyerName: string;
  buyerPhone: string;
  total: number;
  status: Status;
  fulfillment: "pickup" | "delivery";
  address: string;
  scheduledAt: string;
  createdAt: string;
  comment?: string;
  location?: { latitude: number; longitude: number };
  items: { productId: string; title: string; price: number; qty: number }[];
  history: { status: Status; at: string }[];
}
export interface Job {
  id: string;
  leaseToken: string;
  attempts: number;
  kind: "order.created" | "order.status_changed";
  recipient: Identity;
  order: Order;
}
export interface TelegramBridge {
  identity(actor: string): Promise<Identity | null>;
  startLink(
    actor: string,
    phone: string,
  ): Promise<{ id: string; expiresAt: string; confirmationUrl: string }>;
  shop(
    actor: string,
  ): Promise<{
    id: string;
    ownerId: string;
    name: string;
    phone: string;
    address: string;
    productCount: number;
    revenue: number;
    counts: Record<Status, number>;
  }>;
  products(
    actor: string,
  ): Promise<{
    ownerId: string;
    shopId: string;
    items: { id: string; title: string; price: number }[];
  }>;
  list(
    actor: string,
    audience: "seller" | "buyer",
    view: string,
    page?: number,
  ): Promise<{ orders: Order[]; nextPage: number | null }>;
  order(actor: string, id: string): Promise<Order>;
  transition(
    actor: string,
    id: string,
    from: Status,
    to: Status,
    key: string,
  ): Promise<Order>;
  claim(): Promise<{ jobs: Job[] }>;
  begin(job: Job): Promise<{ started: boolean }>;
  ack(job: Job, messageId: number): Promise<unknown>;
  fail(
    job: Job,
    failure: {
      state: "retry" | "blocked" | "failed" | "uncertain";
      code: number;
      retryAt?: string;
    },
  ): Promise<unknown>;
}
