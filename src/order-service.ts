type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type UserId = Brand<string, "UserId">;
export type OrderId = Brand<string, "OrderId">;

export function userId(value: string): UserId {
  return value as UserId;
}

export function orderId(value: string): OrderId {
  return value as OrderId;
}

export interface Order {
  id: OrderId;
  userId: UserId;
  totalYen: number;
}

const orders: Order[] = [
  { id: orderId("order-100"), userId: userId("user-42"), totalYen: 4800 },
  { id: orderId("user-42"), userId: userId("user-7"), totalYen: 999999 }
];

export function findOrderById(id: OrderId): Order | undefined {
  return orders.find((order) => order.id === id);
}

export function findOrderByUserId(id: UserId): Order | undefined {
  return orders.find((order) => order.userId === id);
}

export function getCurrentUsersOrder(currentUserId: UserId): Order | undefined {
  return findOrderByUserId(currentUserId);
}

export function formatOrderResponse(order: Order | undefined): string {
  return order === undefined ? "404 Order Not Found" : `200 ${order.id} ${order.totalYen}`;
}

