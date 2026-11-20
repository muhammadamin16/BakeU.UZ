import type { Identity, Order, TelegramBridge } from "./contracts";
export type OrdersSettings =
  { enabled: false } | { enabled: true; baseUrl: string; token: string };
export class BridgeError extends Error {
  constructor(status?: number);
  status: number;
}
export function validId(id: unknown): boolean;
export function validateIdentity(
  data: unknown,
  telegramId: string,
): Identity | null;
export function validateOrder(data: unknown): Order;
export function createOrdersApi(
  config: OrdersSettings,
  options?: { fetchImpl?: typeof fetch },
): TelegramBridge;
