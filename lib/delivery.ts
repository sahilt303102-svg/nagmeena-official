const DEFAULT_FREE_PINCODES = [
  "201304", "201305", "201306", "201308", "201309",
  "201310", "201311", "201312", "201314", "201318"
];

export const STANDARD_DELIVERY_CHARGE = 100;

export function normalizePincode(value: unknown) {
  return String(value || "").replace(/\D/g, "").slice(0, 6);
}

export function freeDeliveryPincodes() {
  const configured = String(process.env.NEXT_PUBLIC_FREE_DELIVERY_PINCODES || "")
    .split(",")
    .map((value) => normalizePincode(value))
    .filter((value) => /^\d{6}$/.test(value));
  return configured.length ? configured : DEFAULT_FREE_PINCODES;
}

export function isValidPincode(value: unknown) {
  return /^\d{6}$/.test(normalizePincode(value));
}

export function isFreeDeliveryPincode(value: unknown) {
  const pin = normalizePincode(value);
  return isValidPincode(pin) && freeDeliveryPincodes().includes(pin);
}

export function deliveryChargeForPincode(value: unknown) {
  if (!isValidPincode(value)) return null;
  return isFreeDeliveryPincode(value) ? 0 : STANDARD_DELIVERY_CHARGE;
}
