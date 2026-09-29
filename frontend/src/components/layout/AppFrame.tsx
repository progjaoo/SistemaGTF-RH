import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Shell({ collapsed, children }: { collapsed: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        "grid min-h-[100dvh] transition-[grid-template-columns] duration-200",
        collapsed ? "grid-cols-[96px_minmax(0,1fr)]" : "grid-cols-[280px_minmax(0,1fr)]",
        "max-[900px]:grid-cols-1"
      )}
    >
      {children}
    </div>
  );
}

export function Main({ children }: { children: ReactNode }) {
  return <main className="min-w-0 p-7 max-[700px]:px-3 max-[700px]:py-[14px] max-[700px]:pb-[18px]">{children}</main>;
}

export function Topbar({ children }: { children: ReactNode }) {
  return <header className="mb-5 flex justify-between gap-[18px] max-[820px]:mb-[14px] max-[820px]:flex-col max-[820px]:gap-3">{children}</header>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="text-[0.78rem] font-extrabold uppercase text-teal-deep">{children}</div>;
}

export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-[10px] max-[600px]:w-full max-[600px]:flex-col max-[600px]:items-stretch [&>select]:min-w-[230px] max-[600px]:[&>select]:w-full max-[600px]:[&>select]:min-w-0 max-[600px]:[&>button]:w-full">
      {children}
    </div>
  );
}
