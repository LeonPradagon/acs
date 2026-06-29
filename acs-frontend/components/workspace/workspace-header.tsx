import React from "react";
import { Menu, MoreVertical, Download, Copy, Share2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WorkspaceHeaderProps {
  onMenuToggle?: () => void;
  sessionTitle?: string;
  onExport?: () => void;
  onCopy?: () => void;
  onShare?: () => void;
}

/**
 * Header component for the Analyst Workspace
 */
export const WorkspaceHeader = ({
  onMenuToggle,
  sessionTitle,
  onExport,
  onCopy,
  onShare,
}: WorkspaceHeaderProps) => {
  return (
    <header className="border-b border-border bg-card">
      <div className="flex items-center justify-between px-4 md:px-6 py-4">
        <div className="flex items-center gap-3 md:gap-6 w-full">
          {/* Mobile Menu Toggle */}
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-xl hover:bg-accent transition-colors shrink-0"
            title="Buka Sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={"/images/Asisgo.png"}
                className="w-full h-full object-contain"
                alt="ASISGO Logo"
              />
            </div>
            <div className="hidden xs:flex flex-col leading-tight">
              <span className="text-xl md:text-3xl font-extrabold text-primary">
                ACS
              </span>
              <span className="text-[10px] md:text-sm font-medium text-muted-foreground tracking-wide whitespace-nowrap flex items-center">
                ASISGO CORE-SOVEREIGN
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[8px] md:text-[10px] font-bold">
                  {process.env.NEXT_PUBLIC_APP_VERSION || "v1.0.0"}
                </span>
              </span>
            </div>
          </div>

          {/* Divider and Session Title */}
          {sessionTitle && (
            <div className="hidden md:flex items-center ml-2 md:ml-4 pl-4 border-l-2 border-border/60 min-w-0 flex-1">
              <span className="text-sm md:text-base font-semibold text-foreground truncate">
                {sessionTitle}
              </span>
            </div>
          )}
        </div>

        {/* Action Menu (Visible when chat has started) */}
        {sessionTitle && (
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-2 rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                  title="Chat Options"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl z-[99999]">
                <DropdownMenuItem onClick={onExport} className="gap-3 cursor-pointer py-2.5 px-3 rounded-lg text-[13px] font-medium transition-colors">
                  <Download className="w-4 h-4 text-muted-foreground" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onCopy} className="gap-3 cursor-pointer py-2.5 px-3 rounded-lg text-[13px] font-medium transition-colors">
                  <Copy className="w-4 h-4 text-muted-foreground" />
                  Copy Conversation
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onShare} className="gap-3 cursor-pointer py-2.5 px-3 rounded-lg text-[13px] font-medium transition-colors">
                  <Share2 className="w-4 h-4 text-muted-foreground" />
                  Share Conversation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  );
};
