"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <Button
      variant="ghost"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="flex items-center gap-2 px-2"
    >
      <Sun className="h-[1.5rem] w-[1.3rem] dark:hidden" color="#000" />
      <Moon className="hidden h-5 w-5 dark:block" />
      <span className="sr-only">Toggle theme</span>
      <span className="text-xs font-medium">Toggle theme</span>
    </Button>
  );
}
