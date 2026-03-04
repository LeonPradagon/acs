import React from "react";
import { Calendar, Bell, LogOut, User, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface WorkspaceHeaderProps {
  handleLogout: () => void;
  currentTime: string;
  onUploadClick: () => void;
}

/**
 * Header component for the Analyst Workspace
 */
export const WorkspaceHeader = ({
  handleLogout,
  currentTime,
  onUploadClick,
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{currentTime}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-4 h-4" />
            </Button>
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
