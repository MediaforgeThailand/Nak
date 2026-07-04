import { PriceProgramView } from "@/components/nak/price-program-view";
import { requireCustomer } from "@/lib/auth";
import { getPriceProgramStatus, getPriceTiers } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function PriceProgramPage() {
  const [, status, tiers] = await Promise.all([requireCustomer(), getPriceProgramStatus(), getPriceTiers()]);

  return (
    <PriceProgramView
      floorQuantity={Number(status.floor_quantity ?? 0)}
      monthQuantity={Number(status.month_quantity ?? 0)}
      tiers={tiers}
    />
  );
}
