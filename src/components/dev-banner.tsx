import { AlertTriangle } from "lucide-react";

export function DevBanner() {
  return (
    <div className="border-b border-amber-300/60 bg-amber-100 text-amber-900">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 text-xs font-medium md:text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          This platform is currently under development. Live payments are temporarily unavailable.
        </span>
      </div>
    </div>
  );
}
