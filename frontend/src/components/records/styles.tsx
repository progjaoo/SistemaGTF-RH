import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RecordsLayout({ children }: { children: ReactNode }) {
  return <section className="grid gap-[18px]">{children}</section>;
}

export function RecordsHero({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 pb-1 max-[720px]:flex-col max-[720px]:items-stretch max-[720px]:gap-3">
      {children}
    </div>
  );
}

export function RecordsTitle({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-[13px] max-[520px]:items-start max-[520px]:gap-[10px] [&>div>h2]:m-0 [&>div>h2]:text-[clamp(1.45rem,2.2vw,2.25rem)] [&>div>h2]:tracking-normal max-[520px]:[&>div>h2]:text-[1.35rem] max-[520px]:[&>div>h2]:leading-[1.12] [&>div>p]:mt-[3px] [&>div>p]:text-muted">
      {children}
    </div>
  );
}

export function RecordsMark({ children }: { children: ReactNode }) {
  return (
    <div className="grid h-[58px] w-[58px] place-items-center rounded-lg bg-teal text-white shadow-[0_14px_28px_rgb(43_168_162/0.22)] max-[520px]:h-[46px] max-[520px]:w-[46px]">
      {children}
    </div>
  );
}

export function SaveButton(props: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <Button
      variant="primary"
      size="lg"
      {...props}
      className="min-h-[54px] px-5 shadow-[0_14px_28px_rgb(43_168_162/0.24)] max-[720px]:w-full"
    />
  );
}

export function DailyControls({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(280px,470px)_minmax(260px,1fr)_minmax(140px,180px)] gap-3 max-[1050px]:grid-cols-2 max-[700px]:grid-cols-1 max-[700px]:gap-[10px]">
      {children}
    </div>
  );
}

export function DateCard({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-[76px] grid-cols-[52px_1fr_52px] items-center rounded-lg border border-line bg-surface shadow-[0_18px_48px_rgb(32_38_44/0.08)] max-[520px]:min-h-[66px] max-[520px]:grid-cols-[44px_minmax(0,1fr)_44px]">
      {children}
    </div>
  );
}

export function DateNavButton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="grid h-full min-h-[74px] place-items-center border-0 bg-transparent text-steel disabled:cursor-not-allowed disabled:opacity-30 max-[520px]:min-h-[64px]"
    >
      {children}
    </button>
  );
}

export function DateSummary({ children }: { children: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-[3px] px-[6px] py-[11px] text-center [&>strong]:text-[1.05rem] max-[520px]:[&>strong]:text-[0.95rem] [&>span]:text-[0.88rem] [&>span]:capitalize [&>span]:text-muted max-[520px]:[&>span]:text-[0.8rem]">
      {children}
    </div>
  );
}

export function InfoCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[76px] items-center gap-[10px] rounded-lg border border-teal/20 bg-teal-bg p-[14px_16px] font-bold text-teal-deep max-[520px]:items-start max-[520px]:min-h-0 max-[520px]:p-3 max-[520px]:text-[0.88rem]">
      {children}
    </div>
  );
}

export function DailyTotalCard({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-[76px] content-center justify-items-center rounded-lg border border-line bg-surface p-3 shadow-[0_18px_48px_rgb(32_38_44/0.08)] max-[520px]:min-h-[66px] [&>span]:text-[0.82rem] [&>span]:font-bold [&>span]:text-muted [&>strong]:text-[1.8rem] [&>strong]:leading-none [&>strong]:tabular-nums">
      {children}
    </div>
  );
}

export function RecordsTools({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 rounded-lg border border-line bg-white/75 p-[14px] shadow-[0_18px_48px_rgb(32_38_44/0.08)] max-[820px]:flex-col max-[820px]:items-stretch max-[520px]:p-3">
      {children}
    </div>
  );
}

export function SearchField({ children }: { children: ReactNode }) {
  return <div className="grid w-[min(420px,100%)] gap-[7px] [&>label]:text-[0.82rem] [&>label]:font-bold [&>label]:text-muted">{children}</div>;
}

export function SearchInputWrap({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center gap-[9px] rounded-lg border border-line bg-surface px-3 text-muted focus-within:border-teal/55 focus-within:shadow-[0_0_0_3px_rgb(43_168_162/0.12)] [&>input]:w-full [&>input]:min-w-0 [&>input]:border-0 [&>input]:bg-transparent [&>input]:text-ink [&>input]:outline-none">
      {children}
    </div>
  );
}

export function BulkActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex max-w-[620px] flex-wrap justify-end gap-2 max-[820px]:max-w-none max-[820px]:justify-stretch max-[820px]:[&>button]:flex-[1_1_210px] max-[520px]:[&>button]:w-full max-[520px]:[&>button]:flex-[1_1_100%]">
      {children}
    </div>
  );
}

export function SortHint({ children }: { children: ReactNode }) {
  return <span className="flex-[1_1_100%] text-right text-[0.82rem] font-bold text-muted max-[820px]:text-left">{children}</span>;
}

export function EmployeeCards({ children }: { children: ReactNode }) {
  return <div className="grid gap-[10px]">{children}</div>;
}

export function EmployeeMealCard({ warn, children }: { warn: boolean; children: ReactNode }) {
  return (
    <article
      className={cn(
        "grid min-h-[92px] grid-cols-[minmax(240px,1.4fr)_minmax(250px,360px)_38px] items-center gap-4 rounded-lg border border-line border-l-[5px] bg-surface p-[14px_16px] shadow-[0_18px_48px_rgb(32_38_44/0.08)]",
        warn ? "border-gold-deep/40 border-l-gold-deep" : "border-l-teal",
        "max-[840px]:grid-cols-[1fr_auto] max-[840px]:items-start",
        "max-[620px]:grid-cols-1 max-[620px]:min-h-0 max-[620px]:gap-3 max-[620px]:p-3"
      )}
    >
      {children}
    </article>
  );
}

export function EmployeeIdentity({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-[13px] max-[520px]:items-start [&>div>strong]:block [&>div>strong]:text-[1.04rem] [&>div>strong]:wrap-anywhere [&>div>span]:mt-[5px] [&>div>span]:inline-flex [&>div>span]:items-center [&>div>span]:gap-[6px] [&>div>span]:text-[0.9rem] [&>div>span]:text-muted max-[520px]:[&>div>span]:flex-wrap">
      {children}
    </div>
  );
}

export function EmployeeInitials({ children }: { children: ReactNode }) {
  return (
    <div aria-hidden="true" className="grid h-[52px] w-[52px] flex-none place-items-center rounded-lg border border-teal/20 bg-gradient-to-b from-teal-bg to-white font-black text-teal-deep max-[520px]:h-11 max-[520px]:w-11">
      {children}
    </div>
  );
}

export function QuantityControl({ children, ...props }: { children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className="grid min-h-[58px] grid-cols-[58px_minmax(110px,1fr)_58px] items-stretch justify-stretch overflow-hidden rounded-lg border border-line bg-white max-[620px]:w-full max-[620px]:grid-cols-[52px_minmax(92px,1fr)_52px]"
    >
      {children}
    </div>
  );
}

export function QuantityButton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="grid place-items-center bg-teal-bg text-teal-deep hover:bg-teal/20 disabled:cursor-not-allowed disabled:bg-[#f3f5f7] disabled:text-muted"
    >
      {children}
    </button>
  );
}

export function QuantityValue({ children }: { children: ReactNode }) {
  return (
    <div className="grid place-items-center px-[10px] py-[7px] [&>strong]:text-[1.35rem] [&>strong]:leading-none [&>strong]:tabular-nums [&>span]:mt-[3px] [&>span]:text-[0.78rem] [&>span]:font-bold [&>span]:text-muted">
      {children}
    </div>
  );
}

export function RowWarning({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div title={title} className="grid h-9 w-9 place-items-center justify-self-end text-[#8a6d00] max-[840px]:col-start-2 max-[840px]:row-start-1 max-[620px]:col-auto max-[620px]:row-auto max-[620px]:justify-self-start">
      {children}
    </div>
  );
}

export function SaveStatus({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-[10px] rounded-lg border border-teal/20 bg-teal-bg p-[14px_16px] font-bold text-teal-deep max-[520px]:items-start max-[520px]:p-3 max-[520px]:text-[0.9rem]">
      {children}
    </div>
  );
}
