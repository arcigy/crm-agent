"use client";

import * as React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex items-center gap-4 rounded-xl px-5 py-3.5 text-base font-medium text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-100 w-full transition-all group text-left"
      title={
        theme === "dark" ? "Prepnúť na svetlý režim" : "Prepnúť na tmavý režim"
      }
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        <Sun
          className={`h-5 w-5 absolute transition-all duration-300 ${theme === "dark" ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`}
        />
        <Moon
          className={`h-5 w-5 absolute transition-all duration-300 ${theme === "dark" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"}`}
        />
      </div>
      <span>{theme === "dark" ? "Svetlý režim" : "Tmavý režim"}</span>
    </button>
  );
}
