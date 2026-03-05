"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  MessageSquare,
  Trash2,
  Pencil,
  Check,
  X,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ChatSessionItem } from "@/lib/ai-query.service";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";

interface ChatSidebarProps {
  sessions: ChatSessionItem[];
  currentSessionId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onNewSession: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onRenameSession?: (id: string, title: string) => void;
}

export function ChatSidebar({
  sessions,
  currentSessionId,
  isOpen,
  onToggle,
  onNewSession,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
}: ChatSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const startRename = (session: ChatSessionItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title || "New Chat");
  };

  const confirmRename = () => {
    if (editingId && editTitle.trim() && onRenameSession) {
      onRenameSession(editingId, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelRename = () => {
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      confirmRename();
    } else if (e.key === "Escape") {
      cancelRename();
    }
  };

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
                  className={cn(
                    "group relative flex items-center rounded-lg transition-colors border border-transparent mb-0.5",
                    currentSessionId === session.id
                      ? "bg-secondary text-secondary-foreground font-medium shadow-sm border-border/50"
                      : "bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {editingId === session.id ? (
                    /* Inline Rename Mode */
                    <div className="flex items-center gap-1.5 flex-1 min-w-0 px-2 py-1.5">
                      <Input
                        ref={editInputRef}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={confirmRename}
                        className="h-7 text-sm px-2 py-0 bg-background border-border"
                      />
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={confirmRename}
                          className="h-6 w-6 shrink-0 text-green-500 hover:bg-green-500/10"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={cancelRename}
                          className="h-6 w-6 shrink-0 text-muted-foreground hover:bg-muted/50"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Normal Display Mode */
                    <div className="flex-1 min-w-0 flex items-center h-full group/item relative">
                      {/* Selection Area */}
                      <div
                        className="flex-1 min-w-0 py-2.5 px-3 cursor-pointer"
                        onClick={() => onSelectSession(session.id)}
                      >
                        <div
                          className="truncate text-sm pr-6"
                          title={session.title || "New Chat"}
                        >
                          {session.title || "New Chat"}
                        </div>
                      </div>

                      {/* Options Button Area */}
                      <div
                        className={cn(
                          "absolute right-1.5 top-1/2 -translate-y-1/2 transition-opacity z-20",
                          currentSessionId === session.id
                            ? "opacity-100"
                            : "opacity-0 group-hover/item:opacity-100",
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted-foreground/10 focus:outline-none focus:ring-0 transition-colors"
                              type="button"
                              aria-label="Opsi chat"
                            >
                              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuContent
                              align="end"
                              side="right"
                              sideOffset={8}
                              className="w-44 p-1.5 bg-popover border border-border shadow-2xl rounded-xl z-[9999] animate-in zoom-in-95 fade-in duration-200"
                            >
                              {onRenameSession && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startRename(session, e as any);
                                  }}
                                  className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold cursor-pointer rounded-lg hover:bg-accent focus:bg-accent transition-colors"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span>Rename</span>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteSession(session.id);
                                }}
                                className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold cursor-pointer rounded-lg text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenuPortal>
                        </DropdownMenu>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Collapse Toggle Button */}
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
