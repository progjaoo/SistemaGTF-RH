import { useState } from "react";

const sidebarCollapsedKey = "sistema-rh-sidebar-collapsed";

export function useSidebarCollapsed() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(sidebarCollapsedKey) === "true"
  );

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      localStorage.setItem(sidebarCollapsedKey, String(next));
      return next;
    });
  };

  const setCollapsed = (next: boolean) => {
    localStorage.setItem(sidebarCollapsedKey, String(next));
    setSidebarCollapsed(next);
  };

  return { sidebarCollapsed, toggleSidebar, setCollapsed };
}
