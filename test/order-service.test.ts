import { describe, expect, it } from "vitest";
import {
  formatOrderResponse,
  getCurrentUsersOrder
} from "../src/order-service.js";

describe("GET /me/order の最小再現", () => {
  it("returns the current user's order, not an order whose id merely equals the user id", () => {
    const response = formatOrderResponse(getCurrentUsersOrder("user-42"));

    // user-42 は存在するユーザーだが、user-42 という注文IDの注文ではない。
    expect(response).toBe("404 Order Not Found");
  });

  it("returns the known order when an actual order id is used internally", () => {
    expect(formatOrderResponse({ id: "order-100", userId: "user-42", totalYen: 4800 }))
      .toBe("200 order-100 4800");
  });
});

