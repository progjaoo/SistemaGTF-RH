import type { JSX } from "react";

export type Tab = "dashboard" | "records" | "employees" | "prices" | "periods" | "users";

export type NavigationTab = {
  id: Tab;
  label: string;
  icon: JSX.Element;
  rhOnly?: boolean;
};
