import { findOrderById, userId } from "../src/order-service.js";

// @ts-expect-error UserId は OrderId と互換ではない。
findOrderById(userId("user-42"));

