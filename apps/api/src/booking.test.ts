import { describe, expect, it } from "vitest";

function canTransition(from: string, to: string) {
  const transitions: Record<string, string[]> = {
    PENDING_PAYMENT: ["PAYMENT_FAILED", "PAID", "CANCELLED"],
    PAYMENT_FAILED: ["PENDING_PAYMENT", "CANCELLED"],
    PAID: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["CANCELLED", "COMPLETED"],
    CANCELLED: [],
    COMPLETED: []
  };
  return (transitions[from] || []).includes(to);
}
describe("booking state transitions", () => {
  it("allows pending payment to become paid", () => expect(canTransition("PENDING_PAYMENT", "PAID")).toBe(true));
  it("does not allow completed bookings to be reopened", () => expect(canTransition("COMPLETED", "CONFIRMED")).toBe(false));
});
