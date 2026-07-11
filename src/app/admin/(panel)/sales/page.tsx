import { redirect } from "next/navigation";

// ยอดขาย merged into the reports section — keep old links working.
export default async function LegacySalesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  const suffix = qs.toString();
  redirect(`/admin/reports/sales${suffix ? `?${suffix}` : ""}`);
}
