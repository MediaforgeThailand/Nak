// Maps the admin-entered bank name to a bundled logo in /public/banks so the
// payment page shows the right branding. Unknown banks get no logo (the page
// falls back to a plain text card), so a typo can never show the wrong bank.
const BANK_LOGOS: { match: RegExp; logo: string }[] = [
  { match: /กรุงไทย|krung\s*thai|ktb/i, logo: "/banks/ktb.png" },
];

export function bankLogoFor(bankName: string): string | null {
  return BANK_LOGOS.find((b) => b.match.test(bankName))?.logo ?? null;
}

// Thai banks print 10-digit account numbers as 3-1-5-1 (e.g. 663-6-81505-1).
// Applied only when the admin saved plain digits; anything else shows as typed.
export function formatAccountNumber(value: string): string {
  return /^\d{10}$/.test(value)
    ? `${value.slice(0, 3)}-${value.slice(3, 4)}-${value.slice(4, 9)}-${value.slice(9)}`
    : value;
}
