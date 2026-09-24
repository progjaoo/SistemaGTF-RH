import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export { Button } from "./button";
export { Badge } from "./badge";

export function IconButton({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-lg border border-line bg-white text-ink transition-colors hover:bg-teal-bg hover:text-teal-deep disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {children}
    </button>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("min-w-0 rounded-lg border border-line bg-surface p-[18px] shadow-[0_18px_48px_rgb(32_38_44/0.08)] max-[520px]:p-[14px]", className)}>
      {children}
    </section>
  );
}

export function PanelHeader({ children }: { children: ReactNode }) {
  return (
    <div className="mb-[14px] flex items-center justify-between gap-3 max-[520px]:flex-col max-[520px]:items-start [&>div>h2]:m-0 [&>div>h2]:text-[1.05rem] [&>div>p]:mt-1 [&>div>p]:text-[0.9rem] [&>div>p]:text-muted [&>h2]:m-0 [&>h2]:text-[1.05rem]">
      {children}
    </div>
  );
}

export function TwoColumn({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(280px,380px)_minmax(0,1fr)] gap-[18px] max-[980px]:grid-cols-1 max-[520px]:gap-3">
      {children}
    </div>
  );
}

export function DataTable({ children }: { children: ReactNode }) {
  return (
    <table className="w-full border-collapse max-[720px]:block max-[720px]:overflow-x-auto [&_td]:border-b [&_td]:border-line [&_td]:px-[10px] [&_td]:py-[11px] [&_td]:text-left [&_td]:align-middle [&_th]:border-b [&_th]:border-line [&_th]:px-[10px] [&_th]:py-[11px] [&_th]:text-left [&_th]:align-middle [&_th]:text-[0.78rem] [&_th]:uppercase [&_th]:text-muted max-[720px]:[&_tbody]:min-w-full max-[720px]:[&_td]:whitespace-nowrap max-[720px]:[&_thead]:min-w-full max-[720px]:[&_tr]:w-max max-[720px]:[&_tr]:min-w-full">
      {children}
    </table>
  );
}

export function FormGrid({ children, onSubmit }: { children: ReactNode; onSubmit: (event: React.FormEvent) => void }) {
  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      {children}
    </form>
  );
}

export function Field({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-[6px] [&>label]:text-[0.82rem] [&>label]:font-bold [&>label]:text-muted [&>input]:min-h-10 [&>input]:w-full [&>input]:rounded-lg [&>input]:border [&>input]:border-line [&>input]:bg-white [&>input]:px-[10px] [&>input]:py-2 [&>input]:text-ink [&>input]:focus:border-teal [&>input]:focus:outline-none [&>select]:min-h-10 [&>select]:w-full [&>select]:rounded-lg [&>select]:border [&>select]:border-line [&>select]:bg-white [&>select]:px-[10px] [&>select]:py-2 [&>select]:text-ink [&>select]:focus:border-teal [&>select]:focus:outline-none [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-line [&>textarea]:bg-white [&>textarea]:p-[10px] [&>textarea]:focus:border-teal [&>textarea]:focus:outline-none">
      {children}
    </div>
  );
}

export function CheckboxLabel({ children }: { children: ReactNode }) {
  return (
    <label className="flex items-center gap-2 font-bold text-muted [&>input]:h-[18px] [&>input]:w-[18px] [&>input]:accent-teal-deep">
      {children}
    </label>
  );
}

export function InlineActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap gap-2 max-[520px]:items-stretch max-[520px]:[&>button]:flex-[1_1_120px]">
      {children}
    </div>
  );
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <div className="mb-[14px] flex items-center justify-between gap-[10px] rounded-lg border border-teal/25 bg-teal-bg p-[11px_12px] font-bold text-teal-deep max-[520px]:items-start max-[520px]:[&>span]:min-w-0 max-[520px]:[&>span]:wrap-anywhere">
      {children}
    </div>
  );
}

export function Loading({ children }: { children: ReactNode }) {
  return <div className="mb-[14px] text-muted">{children}</div>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white/70 p-7 text-muted">
      {children}
    </div>
  );
}

export function InlineError({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("font-bold text-danger-ink", className)}>{children}</div>;
}
