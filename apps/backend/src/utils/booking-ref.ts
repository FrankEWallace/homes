/**
 * Generates a human-readable booking reference: TJ-YYYYMMDD-XXXX
 * e.g. TJ-20240401-A3F2
 */
export function generateBookingRef(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randPart = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `TJ-${datePart}-${randPart}`;
}
