import { useState } from "react";
import { ChevronsUpDown, LogOut, Moon, Sun, UserRound } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useTheme } from "../../hooks/useTheme";
import { initials } from "../../utils/format";
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
  const [profileOpen, setProfileOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Abrir menu do usuário"
              className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-white hover:bg-white/10 focus-visible:outline-2"
            >
              <span aria-hidden="true" className="grid h-9 w-9 flex-none place-items-center rounded-full bg-white/15 text-sm font-black">
                {initials(user.name)}
              </span>
              <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                <strong className="block truncate leading-[1.2]">{user.name}</strong>
                <span className="block truncate text-[0.8rem] text-white/70">{user.email}</span>
              </span>
              <ChevronsUpDown size={16} className="flex-none text-white/70 group-data-[collapsible=icon]:hidden" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-[240px]">
            <DropdownMenuLabel>
              <span className="block truncate">{user.name}</span>
              <span className="block truncate text-xs font-normal text-muted">{user.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
              <UserRound /> Meu Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => toggle()}>
              {dark ? <Sun /> : <Moon />} {dark ? "Modo claro" : "Modo escuro"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onLogout()}>
              <LogOut /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Meu Perfil</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><p className="text-[0.82rem] font-bold text-muted">Nome</p><p className="font-bold">{user.name}</p></div>
              <div><p className="text-[0.82rem] font-bold text-muted">E-mail</p><p className="font-bold wrap-anywhere">{user.email}</p></div>
              <div><p className="text-[0.82rem] font-bold text-muted">Perfil</p><p className="font-bold">{user.role === "RH" ? "RH" : "Gestora"}</p></div>
            </div>
          </DialogContent>
        </Dialog>
      </SidebarFooter>
    </SidebarRoot>
  );
}
