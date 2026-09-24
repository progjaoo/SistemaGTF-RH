import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import logoGtf from "../../images/logogtf.png";
import type { NavigationTab, Tab } from "../../navigation";
import type { Session } from "../../types";
import { Brand, BrandLogo } from "./Brand";

export function Sidebar({
  tabs,
  activeTab,
  collapsed,
  user,
  onChangeTab,
  onToggle,
  onLogout
}: {
  tabs: NavigationTab[];
  activeTab: Tab;
  collapsed: boolean;
  user: Session["user"];
  onChangeTab: (tab: Tab) => void;
  onToggle: () => void;
  onLogout: () => void;
}) {
  return (
    <aside
      className={cn(
        "sticky top-0 grid h-[100dvh] gap-6 overflow-hidden border-r-[5px] border-teal bg-teal-ink p-6 text-white transition-[padding,gap]",
        collapsed ? "grid-rows-[1fr_auto] gap-5 px-3 py-[22px]" : "grid-rows-[auto_1fr_auto]",
        "max-[900px]:sticky max-[900px]:z-20 max-[900px]:h-auto max-[900px]:grid-cols-[1fr_auto] max-[900px]:grid-rows-[auto_auto] max-[900px]:gap-[10px] max-[900px]:overflow-visible max-[900px]:border-r-0 max-[900px]:border-b-4 max-[900px]:border-teal max-[900px]:p-3"
      )}
    >
      <div
        className={cn(
          "flex min-w-0 items-start gap-3",
          collapsed ? "justify-center" : "justify-between",
          "max-[900px]:contents"
        )}
      >
        <div className={cn("min-w-0", collapsed ? "hidden" : "block", "max-[900px]:col-start-1 max-[900px]:row-start-1 max-[900px]:block max-[900px]:self-center")}>
          <Brand>
            <BrandLogo src={logoGtf} alt="Grupo GTF" className="max-[900px]:h-[42px] max-[900px]:w-[54px]" />
          </Brand>
        </div>
        <button
          type="button"
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          onClick={onToggle}
          className={cn(
            "grid h-10 w-10 flex-none place-items-center rounded-lg border border-white/20 bg-white/10 text-white hover:bg-white/15",
            collapsed && "mt-0 h-14 w-14",
            !collapsed && "mt-[2px]",
            "max-[900px]:hidden"
          )}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav
        aria-label="Módulos"
        className="grid min-w-0 content-start justify-stretch gap-2 pt-1 max-[900px]:col-[1/-1] max-[900px]:row-start-2 max-[900px]:-mx-3 max-[900px]:flex max-[900px]:gap-2 max-[900px]:overflow-x-auto max-[900px]:px-3 max-[900px]:pt-[2px] max-[900px]:[scrollbar-width:none] max-[900px]:[&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              title={collapsed ? tab.label : undefined}
              onClick={() => onChangeTab(tab.id)}
              className={cn(
                "flex items-center gap-[10px] rounded-lg border text-left text-white transition-colors",
                collapsed ? "h-14 w-14 justify-center justify-self-center p-0" : "w-full px-3 py-[11px]",
                active ? "border-l-2 border-l-gold border-white/25 bg-white/10" : "border-transparent hover:bg-white/10",
                "max-[900px]:h-11 max-[900px]:w-auto max-[900px]:flex-none max-[900px]:justify-center max-[900px]:gap-[10px] max-[900px]:border max-[900px]:px-3",
                active
                  ? "max-[900px]:border-white/30 max-[900px]:bg-white/15"
                  : "max-[900px]:border-white/10 max-[900px]:bg-white/5"
              )}
            >
              <span className="flex-none [&>svg]:block">{tab.icon}</span>
              <span aria-hidden={collapsed} className={cn("overflow-hidden whitespace-nowrap transition-all", collapsed ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100", "max-[900px]:inline max-[900px]:max-w-[160px] max-[900px]:text-[0.88rem] max-[900px]:opacity-100")}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="grid gap-3 border-t border-white/20 pt-4 justify-stretch max-[900px]:col-start-2 max-[900px]:row-start-1 max-[900px]:flex max-[900px]:items-center max-[900px]:justify-end max-[900px]:gap-2 max-[900px]:border-t-0 max-[900px]:p-0">
        <div className={cn("min-w-0 overflow-hidden transition-all max-[900px]:max-w-32 max-[900px]:text-right", collapsed ? "max-h-0 opacity-0" : "max-h-16 opacity-100", "max-[520px]:hidden")}>
          <strong className="block leading-[1.2] wrap-anywhere">{user.name}</strong>
          <span className="mt-1 block text-[0.86rem] leading-[1.2] text-white/70">{user.role === "RH" ? "RH" : "Gestora"}</span>
        </div>
        <div className={cn("flex w-full flex-row items-center gap-2", collapsed ? "justify-center" : "justify-start", "max-[900px]:w-auto max-[900px]:justify-end")}>
          <button
            type="button"
            title="Sair"
            aria-label="Sair"
            onClick={onLogout}
            className="grid h-10 w-10 flex-none place-items-center rounded-lg border border-white/20 bg-transparent text-white transition-colors hover:bg-white/10 max-[900px]:h-10 max-[900px]:w-10"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
