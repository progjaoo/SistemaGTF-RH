import type { JSX } from "react";

export type Tab = "dashboard" | "records" | "reports" | "employees" | "prices" | "periods" | "users";

export type NavigationTab = {
  id: Tab;
  label: string;
  icon: JSX.Element;
  rhOnly?: boolean;
};
