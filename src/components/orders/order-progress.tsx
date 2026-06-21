import { Check, Clock, X } from "lucide-react";
import { clsx } from "clsx";
import { orderStatusLabel } from "@/lib/format";

const normalStages = [
  "pending_admin",
  "packing",
  "shipping",
];

const rejectedStages = ["pending_admin", "rejected"];

const shortLabels: Record<string, string> = {
  pending_admin: "รออนุมัติ",
  packing: "เตรียมจัดส่ง",
  shipping: "จัดส่งแล้ว",
  rejected: "ปฏิเสธ",
  cancelled: "ยกเลิก",
};

function progressStatus(status: string) {
  if (status === "approved" || status === "ready_to_ship") return "packing";
  if (status === "delivered") return "shipping";
  return status;
}

function stageState(status: string, stage: string, index: number, activeIndex: number) {
  if (stage === "rejected" || stage === "cancelled") return "rejected";
  if (status === "rejected" || status === "cancelled") return index < activeIndex ? "done" : "current";
  if (index < activeIndex) return "done";
  if (index === activeIndex) return "current";
  return "next";
}

export function OrderProgress({
  status,
  compact = false,
}: {
  status: string;
  compact?: boolean;
}) {
  const activeStatus = progressStatus(status);
  const stages = activeStatus === "rejected" || activeStatus === "cancelled" ? rejectedStages : normalStages;
  const activeIndex = Math.max(0, stages.indexOf(activeStatus));

  return (
    <div className="overflow-x-auto pb-1">
      <div
        className={clsx(
          "grid min-w-[560px] items-start",
          compact ? "gap-1" : "gap-2",
        )}
        style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}
      >
        {stages.map((stage, index) => {
          const state = stageState(activeStatus, stage, index, activeIndex);
          const isDone = state === "done";
          const isCurrent = state === "current";
          const isRejected = state === "rejected";

          return (
            <div key={stage} className="relative grid gap-2">
              {index > 0 ? (
                <span
                  className={clsx(
                    "absolute right-1/2 top-4 h-1 w-full -translate-y-1/2",
                    isDone || isCurrent ? "bg-accent" : "bg-white/70",
                    isRejected ? "bg-danger" : null,
                  )}
                />
              ) : null}
              <div
                className={clsx(
                  "relative z-10 mx-auto grid h-8 w-8 place-items-center rounded-full border text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]",
                  isDone ? "border-accent bg-accent text-white" : null,
                  isCurrent ? "border-accent bg-white text-accent ring-4 ring-accent/15" : null,
                  isRejected ? "border-danger bg-danger text-white ring-4 ring-danger/15" : null,
                  state === "next" ? "border-white/70 bg-white/70 text-muted" : null,
                )}
              >
                {isRejected ? <X className="h-4 w-4" /> : isDone ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              </div>
              <div className="text-center">
                <p
                  className={clsx(
                    compact ? "text-[11px]" : "text-xs",
                    "font-semibold",
                    isCurrent ? "text-accent" : isRejected ? "text-danger" : "text-foreground",
                  )}
                >
                  {shortLabels[stage] ?? orderStatusLabel(stage)}
                </p>
                {!compact ? (
                  <p className="mt-0.5 text-[11px] text-muted">
                    {isDone ? "ผ่านแล้ว" : isCurrent ? "สถานะปัจจุบัน" : "รอดำเนินการ"}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
