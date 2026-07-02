import { cn } from "@/lib/utils";

export function stockLabel(stock: number, threshold = 10) {
  if (stock <= 0) return { text: "Out of Stock", tone: "danger" as const };
  if (stock <= threshold) return { text: `Only ${stock} left`, tone: "warn" as const };
  return { text: "In Stock", tone: "ok" as const };
}

export function StockBadge({ stock, size = "sm", className }: { stock: number; size?: "sm" | "md"; className?: string }) {
  const { text, tone } = stockLabel(stock);
  const toneCls =
    tone === "ok"
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
      : tone === "warn"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  const sizeCls = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10px]";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wide", toneCls, sizeCls, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", tone === "ok" ? "bg-green-500" : tone === "warn" ? "bg-amber-500" : "bg-red-500")} />
      {text}
    </span>
  );
}
