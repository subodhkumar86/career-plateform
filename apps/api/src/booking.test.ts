import { describe, expect, it } from "vitest";
import { canTransitionBooking, transitionBooking } from "./booking-state";
describe("booking state transitions", () => {
  it("allows pending payment to become paid", () => expect(canTransitionBooking("PENDING_PAYMENT", "PAID")).toBe(true));
  it("does not allow completed bookings to be reopened", () => expect(canTransitionBooking("COMPLETED", "CONFIRMED")).toBe(false));
  it("rejects invalid transitions at runtime", () => expect(() => transitionBooking({ status: "COMPLETED" }, "PAID")).toThrow(/Invalid booking transition/));
});
