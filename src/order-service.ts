export type UserId = string;
export type OrderId = string;

export interface Order {
  id: OrderId;
  userId: UserId;
  totalYen: number;
}

const orders: Order[] = [
  { id: "order-100", userId: "user-42", totalYen: 4800 },
  { id: "user-42", userId: "user-7", totalYen: 999999 }
];

export function findOrderById(id: OrderId): Order | undefined {
  return orders.find((order) => order.id === id);
}

export function getCurrentUsersOrder(currentUserId: UserId): Order | undefined {
  // BUG: UserId と OrderId は意味が異なるが、どちらも string なので受け渡せてしまう。
  return findOrderById(currentUserId);
}

export function formatOrderResponse(order: Order | undefined): string {
  return order === undefined ? "404 Order Not Found" : `200 ${order.id} ${order.totalYen}`;
}

