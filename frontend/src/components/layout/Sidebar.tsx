import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import logoGtf from "../../images/logogtf.png";
import type { NavigationTab, Tab } from "../../navigation";
import type { Session } from "../../types";
import { Brand, BrandLogo } from "./Brand";

export function Sidebar({
  tabs,
  activeTab,
  user,
  onChangeTab,
  onLogout
}: {
  tabs: NavigationTab[];
  activeTab: Tab;
  user: Session["user"];
  onChangeTab: (tab: Tab) => void;
  onLogout: () => void;
}) {
  return (
    <SidebarRoot collapsible="icon" className="border-r-[5px] border-teal bg-teal-ink text-white">
      <SidebarHeader className="p-4">
        <Brand>
          <BrandLogo src={logoGtf} alt="Grupo GTF" className="h-[42px] w-[120px] group-data-[collapsible=icon]:hidden" />
        </Brand>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarMenu>
          {tabs.map((tab) => (
            <SidebarMenuItem key={tab.id}>
              <SidebarMenuButton
                isActive={activeTab === tab.id}
                tooltip={tab.label}
                onClick={() => onChangeTab(tab.id)}
                className="text-white hover:bg-white/10 hover:text-white data-[active=true]:border-l-2 data-[active=true]:border-l-gold data-[active=true]:bg-white/10 data-[active=true]:font-bold data-[active=true]:text-white"
              >
                {tab.icon}
                <span>{tab.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-white/20 p-4">
        <div className="mb-2 min-w-0 group-data-[collapsible=icon]:hidden">
          <strong className="block leading-[1.2] wrap-anywhere">{user.name}</strong>
          <span className="mt-1 block text-[0.86rem] leading-[1.2] text-white/70">
            {user.role === "RH" ? "RH" : "Gestora"}
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          title="Sair"
          aria-label="Sair"
          onClick={onLogout}
          className="w-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white group-data-[collapsible=icon]:w-auto"
        >
          <LogOut size={16} />
          <span className="group-data-[collapsible=icon]:hidden">Sair</span>
        </Button>
      </SidebarFooter>
    </SidebarRoot>
  );
}
