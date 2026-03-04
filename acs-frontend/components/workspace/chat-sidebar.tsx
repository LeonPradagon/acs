"use client";

import React from "react";
import {
  Plus,
  MessageSquare,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ChatSessionItem } from "@/lib/ai-query.service";

interface ChatSidebarProps {
  sessions: ChatSessionItem[];
  currentSessionId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onNewSession: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
}

export function ChatSidebar({
  sessions,
  currentSessionId,
  isOpen,
  onToggle,
  onNewSession,
  onSelectSession,
  onDeleteSession,
}: ChatSidebarProps) {
  return (
    <div
      className={cn(
        "relative flex-shrink-0 transition-all duration-300 ease-in-out h-full z-20",
        isOpen ? "w-[260px] md:w-[280px]" : "w-0",
      )}
    >
      {/* Sliding Inner Panel */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 flex flex-col border-r border-border bg-muted/30 transition-transform duration-300 ease-in-out w-[260px] md:w-[280px]",
          !isOpen && "-translate-x-full",
        )}
      >
        {/* Sidebar Header */}
        <div className="p-3">
          <Button
            onClick={onNewSession}
            variant="ghost"
            className="w-full gap-2 justify-start font-medium bg-transparent border border-border text-foreground hover:bg-muted/80 hover:text-foreground shadow-sm h-10 px-3 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">New Chat</span>
          </Button>
        </div>

        {/* Sessions List */}
        <ScrollArea className="flex-1">
          <div className="px-3 pb-3 space-y-0.5 group/list">
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center mt-4">
                <p className="text-sm font-medium text-muted-foreground/60">
                  Belum ada percakapan
                </p>
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className={cn(
                    "group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                    currentSessionId === session.id
                      ? "bg-secondary text-secondary-foreground font-medium shadow-sm"
                      : "bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <MessageSquare
                      className={cn(
                        "w-4 h-4 shrink-0 transition-colors",
                        currentSessionId === session.id
                          ? "text-primary"
                          : "text-muted-foreground/70 group-hover:text-foreground/80",
                      )}
                    />
                    <div className="truncate text-sm">
                      {session.title || "New Chat"}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive shrink-0 rounded-md data-[state=open]:opacity-100 -mr-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Collapse Toggle Button (Hover Tab) outside the sliding panel */}
      <div
        className={cn(
          "absolute top-1/2 -translate-y-1/2 transition-transform duration-300 ease-in-out z-50",
          isOpen ? "right-[-14px]" : "right-[-14px] translate-x-full",
        )}
      >
        <button
          onClick={onToggle}
          className="flex h-12 w-3.5 items-center justify-center rounded-r-md border border-l-0 border-border bg-card text-muted-foreground hover:text-foreground shadow-sm transition-colors cursor-pointer group/toggle focus:outline-none"
          title={isOpen ? "Tutup Sidebar" : "Buka Sidebar"}
        >
          <div className="w-1 h-3 rounded-full bg-muted-foreground/30 transition-colors group-hover/toggle:bg-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
