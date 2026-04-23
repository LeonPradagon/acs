import React, { useState, useEffect } from "react";
import { Calendar, Sun, Moon, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface WorkspaceHeaderProps {
  currentTime: string;
  onMenuToggle?: () => void;
}

/**
 * Header component for the Analyst Workspace
 */
export const WorkspaceHeader = ({
  currentTime,
  onMenuToggle,
}: WorkspaceHeaderProps) => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="border-b border-border bg-card">
      <div className="flex items-center justify-between px-4 md:px-6 py-4">
        <div className="flex items-center gap-3 md:gap-6">
          {/* Mobile Menu Toggle */}
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-xl hover:bg-accent transition-colors"
            title="Buka Sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center shrink-0">
              <img
                src={"/images/Asisgo.png"}
                className="w-full h-full object-contain"
                alt="ASISGO Logo"
              />
            </div>
            <div className="flex flex-col leading-tight hidden xs:flex">
              <span className="text-xl md:text-3xl font-extrabold text-primary">
                ACS
              </span>
              <span className="text-[10px] md:text-sm font-medium text-muted-foreground tracking-wide whitespace-nowrap">
                ASISGO CORE-SOVEREIGN
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex items-center gap-2 text-[10px] md:text-sm text-muted-foreground mr-1 md:mr-4">
            <Calendar className="w-3 h-3 md:w-4 md:h-4 text-indigo-500/80" />
            <span className="font-semibold tracking-tight truncate max-w-[120px] md:max-w-none">
              {currentTime}
            </span>
          </div>

          {/* Theme Toggle Button */}
          {mounted && (
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-accent/30 hover:bg-accent/80 transition-colors group/theme focus:outline-none"
              title={resolvedTheme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              <div className="relative w-5 h-5 flex items-center justify-center text-muted-foreground group-hover/theme:text-primary transition-all duration-300">
                <Sun className="h-full w-full rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 drop-shadow-sm" />
                <Moon className="absolute h-full w-full rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 drop-shadow-sm" />
              </div>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
