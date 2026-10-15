export type BookingStatus = "PENDING_PAYMENT" | "PAYMENT_FAILED" | "PAID" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

const transitions: Record<BookingStatus, BookingStatus[]> = {
  PENDING_PAYMENT: ["PAYMENT_FAILED", "PAID", "CANCELLED"],
  PAYMENT_FAILED: ["PENDING_PAYMENT", "CANCELLED"],
  PAID: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CANCELLED", "COMPLETED"],
  CANCELLED: [],
  COMPLETED: []
};

export function canTransitionBooking(from: BookingStatus, to: BookingStatus) {
  return transitions[from]?.includes(to) ?? false;
}

export function transitionBooking<T extends { status: BookingStatus }>(booking: T, to: BookingStatus) {
  if (!canTransitionBooking(booking.status, to)) {
    throw Object.assign(new Error(`Invalid booking transition: ${booking.status} -> ${to}`), { status: 409 });
  }
  booking.status = to;
  return booking;
}
