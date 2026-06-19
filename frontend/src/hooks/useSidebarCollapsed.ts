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

  return { sidebarCollapsed, toggleSidebar };
}
