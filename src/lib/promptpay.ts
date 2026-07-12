// Thai PromptPay QR payload builder (EMVCo merchant-presented QR, static).
// Reference: EMV QRCPS + Thai QR Payment Standard. The payload encodes only
// the PromptPay id; the payer types the amount in their banking app.

export type PromptPayTarget =
  | { kind: "phone"; value: string }
  | { kind: "national_id"; value: string }
  | { kind: "ewallet"; value: string };

/** Normalize and classify a PromptPay id typed by an admin (phone / บัตรประชาชน / e-wallet). */
export function parsePromptPayId(raw: string): PromptPayTarget | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (/^0\d{9}$/.test(digits)) return { kind: "phone", value: digits };
  if (/^\d{13}$/.test(digits)) return { kind: "national_id", value: digits };
  if (/^\d{15}$/.test(digits)) return { kind: "ewallet", value: digits };
  return null;
}

/** Format a normalized PromptPay id for display (0812345678 → 081-234-5678). */
export function formatPromptPayId(target: PromptPayTarget) {
  if (target.kind === "phone") {
    return target.value.replace(/^(\d{3})(\d{3})(\d{4})$/, "$1-$2-$3");
  }
  if (target.kind === "national_id") {
    return target.value.replace(/^(\d)(\d{4})(\d{5})(\d{2})(\d)$/, "$1-$2-$3-$4-$5");
  }
  return target.value;
}

function tlv(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

// CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) over the ASCII payload.
function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Build the scannable PromptPay payload string for a QR code. */
export function buildPromptPayPayload(target: PromptPayTarget) {
  const account =
    target.kind === "phone"
      ? tlv("01", `0066${target.value.slice(1)}`)
      : target.kind === "national_id"
        ? tlv("02", target.value)
        : tlv("03", target.value);

  const body =
    tlv("00", "01") + // payload format indicator
    tlv("01", "11") + // static QR (reusable, payer enters the amount)
    tlv("29", tlv("00", "A000000677010111") + account) + // PromptPay AID + id
    tlv("53", "764") + // currency THB
    tlv("58", "TH");

  return `${body}6304${crc16(`${body}6304`)}`;
}
