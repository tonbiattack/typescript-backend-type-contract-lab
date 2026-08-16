import { describe, expect, it } from "vitest";
import {
  formatOrderResponse,
  getCurrentUsersOrder,
  orderId,
  userId
} from "../src/order-service.js";

describe("GET /me/order の最小再現", () => {
  it("returns the current user's order, not an order whose id merely equals the user id", () => {
    const response = formatOrderResponse(getCurrentUsersOrder(userId("user-42")));

    expect(response).toBe("200 order-100 4800");
  });

  it("returns the known order when an actual order id is used internally", () => {
    expect(formatOrderResponse({ id: orderId("order-100"), userId: userId("user-42"), totalYen: 4800 }))
      .toBe("200 order-100 4800");
  });
});

