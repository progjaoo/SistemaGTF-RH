import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import styled from "styled-components";
import logoGtf from "../../images/logogtf.png";
import type { NavigationTab, Tab } from "../../navigation";
import type { Session } from "../../types";
import { IconButton } from "../ui";
import { Brand, BrandLogo, BrandText } from "./Brand";

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
    <SidebarContainer $collapsed={collapsed}>
      <SidebarHeader $collapsed={collapsed}>
        <BrandSlot $collapsed={collapsed}>
          <Brand>
            <BrandLogo src={logoGtf} alt="Grupo GTF" />
            {/* <BrandText>
              <strong>Sistema RH</strong>
              <span>Controle de almoço</span>
            </BrandText> */}
          </Brand>
        </BrandSlot>
        <SidebarToggle
          type="button"
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          onClick={onToggle}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </SidebarToggle>
      </SidebarHeader>

      <Nav aria-label="Módulos">
        {tabs.map((tab) => (
          <NavButton
            key={tab.id}
            type="button"
            title={collapsed ? tab.label : undefined}
            $active={activeTab === tab.id}
            $collapsed={collapsed}
            onClick={() => onChangeTab(tab.id)}
          >
            {tab.icon}
            <span aria-hidden={collapsed}>{tab.label}</span>
          </NavButton>
        ))}
      </Nav>

      <UserBox $collapsed={collapsed}>
        <UserInfo $collapsed={collapsed}>
          <strong>{user.name}</strong>
          <span>{user.role === "RH" ? "RH" : "Gestora"}</span>
        </UserInfo>
        <SidebarFooterActions $collapsed={collapsed}>
          <IconButton type="button" title="Sair" onClick={onLogout}>
            <LogOut size={18} />
          </IconButton>
        </SidebarFooterActions>
      </UserBox>
    </SidebarContainer>
  );
}

const SidebarContainer = styled.aside<{ $collapsed: boolean }>`
  position: sticky;
  top: 0;
  height: 100vh;
  display: grid;
  grid-template-rows: ${({ $collapsed }) => ($collapsed ? "1fr auto" : "auto 1fr auto")};
  gap: ${({ $collapsed }) => ($collapsed ? "20px" : "24px")};
  padding: ${({ $collapsed }) => ($collapsed ? "22px 12px" : "24px")};
  background: #20262c;
  color: #fff;
  border-right: 5px solid var(--teal);
  overflow: hidden;
  transition: padding 0.22s ease, gap 0.22s ease;

  @media (max-width: 900px) {
    position: sticky;
    z-index: 20;
    height: auto;
    top: 0;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    gap: 10px;
    padding: 12px;
    border-right: 0;
    border-bottom: 4px solid var(--teal);
    overflow: visible;
  }
`;

const SidebarToggle = styled.button`
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
  }

  @media (max-width: 900px) {
    justify-self: end;
  }
`;

const SidebarHeader = styled.div<{ $collapsed: boolean }>`
  display: flex;
  align-items: flex-start;
  justify-content: ${({ $collapsed }) => ($collapsed ? "center" : "space-between")};
  gap: 12px;
  min-width: 0;

  ${SidebarToggle} {
    flex: 0 0 auto;
    margin-top: ${({ $collapsed }) => ($collapsed ? "0" : "2px")};
    ${({ $collapsed }) => $collapsed && "width: 56px; height: 56px;"}
  }

  @media (max-width: 900px) {
    display: contents;

    ${SidebarToggle} {
      display: none;
    }
  }
`;

const BrandSlot = styled.div<{ $collapsed: boolean }>`
  display: ${({ $collapsed }) => ($collapsed ? "none" : "block")};
  min-width: 0;

  @media (max-width: 900px) {
    display: block;
    grid-column: 1;
    grid-row: 1;
    align-self: center;

    ${Brand} {
      gap: 10px;
    }

    ${BrandLogo} {
      width: 54px;
      height: 42px;
    }

    ${BrandText} strong {
      font-size: 0.95rem;
    }

    ${BrandText} span {
      font-size: 0.78rem;
    }
  }

  @media (max-width: 380px) {
    ${BrandText} span {
      display: none;
    }
  }
`;

const Nav = styled.nav`
  display: grid;
  align-content: start;
  justify-items: stretch;
  gap: 8px;
  min-width: 0;
  padding-top: 4px;

  @media (max-width: 900px) {
    display: flex;
    grid-column: 1 / -1;
    grid-row: 2;
    gap: 8px;
    margin: 0 -12px;
    padding: 2px 12px 0;
    overflow-x: auto;
    scroll-padding-inline: 12px;
    -webkit-overflow-scrolling: touch;

    &::-webkit-scrollbar {
      display: none;
    }
  }
`;

const NavButton = styled.button<{ $active: boolean; $collapsed: boolean }>`
  display: flex;
  align-items: center;
  justify-content: ${({ $collapsed }) => ($collapsed ? "center" : "flex-start")};
  gap: ${({ $collapsed }) => ($collapsed ? "0" : "10px")};
  width: ${({ $collapsed }) => ($collapsed ? "56px" : "100%")};
  height: ${({ $collapsed }) => ($collapsed ? "56px" : "auto")};
  justify-self: ${({ $collapsed }) => ($collapsed ? "center" : "stretch")};
  padding: ${({ $collapsed }) => ($collapsed ? "0" : "11px 12px")};
  border: 1px solid ${({ $active }) => ($active ? "rgba(255,255,255,0.28)" : "transparent")};
  border-radius: 8px;
  color: #fff;
  background: ${({ $active }) => ($active ? "rgba(255,255,255,0.12)" : "transparent")};
  text-align: left;
  transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;

  svg {
    flex: 0 0 auto;
  }

  span {
    overflow: hidden;
    max-width: ${({ $collapsed }) => ($collapsed ? "0" : "160px")};
    opacity: ${({ $collapsed }) => ($collapsed ? 0 : 1)};
    white-space: nowrap;
    transition: max-width 0.22s ease, opacity 0.16s ease;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  @media (max-width: 900px) {
    flex: 0 0 auto;
    justify-content: center;
    gap: 10px;
    width: auto;
    height: 44px;
    padding: 0 12px;
    border-color: ${({ $active }) => ($active ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.12)")};
    background: ${({ $active }) => ($active ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.04)")};

    span {
      display: inline;
      max-width: 160px;
      opacity: 1;
      font-size: 0.88rem;
    }
  }
`;

const UserBox = styled.div<{ $collapsed: boolean }>`
  display: grid;
  justify-items: ${({ $collapsed }) => ($collapsed ? "center" : "stretch")};
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.18);

  span {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.86rem;
  }

  @media (max-width: 900px) {
    grid-column: 2;
    grid-row: 1;
    align-self: center;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    justify-items: end;
    gap: 8px;
    padding-top: 0;
    border-top: 0;
  }
`;

const SidebarFooterActions = styled.div<{ $collapsed: boolean }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: ${({ $collapsed }) => ($collapsed ? "center" : "flex-start")};
  gap: 8px;
  width: 100%;

  button {
    flex: 0 0 auto;
    ${({ $collapsed }) => $collapsed && "width: 56px; height: 56px;"}
  }

  @media (max-width: 900px) {
    justify-content: flex-end;

    button {
      width: 40px;
      height: 40px;
    }
  }
`;

const UserInfo = styled.div<{ $collapsed: boolean }>`
  min-width: 0;
  overflow: hidden;
  opacity: ${({ $collapsed }) => ($collapsed ? 0 : 1)};
  max-height: ${({ $collapsed }) => ($collapsed ? "0" : "64px")};
  transition: opacity 0.18s ease, max-height 0.22s ease;

  strong {
    display: block;
    overflow-wrap: anywhere;
    line-height: 1.2;
  }

  span {
    display: block;
    margin-top: 4px;
    line-height: 1.2;
  }

  @media (max-width: 900px) {
    opacity: 1;
    max-width: 128px;
    max-height: 42px;
    text-align: right;

    strong,
    span {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  @media (max-width: 520px) {
    display: none;
  }
`;
