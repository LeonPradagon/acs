import React from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WorkspaceHeaderProps {
  currentTime: string;
}

/**
 * Header component for the Analyst Workspace
 */
export const WorkspaceHeader = ({
  currentTime,
}: WorkspaceHeaderProps) => {
  return (
    <header className="border-b border-border bg-card">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center">
              <img
                src={"/images/Asisgo.png"}
                className="w-12 h-12 object-contain"
                alt="ASISGO Logo"
              />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-3xl font-extrabold text-foreground">
                ACS
              </span>
              <span className="text-sm font-medium text-muted-foreground tracking-wide">
                ASISGO CORE-SOVEREIGN
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mr-4">
            <Calendar className="w-4 h-4 text-indigo-500/80" />
            <span className="font-semibold tracking-tight">{currentTime}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
