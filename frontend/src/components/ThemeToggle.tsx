import { Moon, Sun } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { IconButton } from "./ui";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <IconButton
      type="button"
      onClick={toggle}
      title={dark ? "Mudar para modo claro" : "Mudar para modo escuro"}
      aria-label={dark ? "Mudar para modo claro" : "Mudar para modo escuro"}
      aria-pressed={dark}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </IconButton>
  );
}
