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
import { Button } from "@/components/ui/button"; // Hanya dipakai untuk tombol utama, bukan trigger dropdown
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

  const startRename = (session: ChatSessionItem) => {
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
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-background/60 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={onToggle}
        />
      )}

      <div
        className={cn(
          "fixed lg:relative inset-y-0 left-0 flex-shrink-0 transition-all duration-300 ease-in-out h-full z-50",
          isOpen
            ? "w-[280px] md:w-[300px] translate-x-0"
            : "w-0 -translate-x-full lg:translate-x-0 lg:w-0",
        )}
      >
        {/* Sliding Inner Panel */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 flex flex-col border-r border-border/50 bg-background/95 backdrop-blur-md lg:bg-muted/30 transition-all duration-300 ease-in-out w-[280px] md:w-[300px] shadow-2xl lg:shadow-none",
            !isOpen && "-translate-x-full",
          )}
        >
          {/* Sidebar Header */}
          <div className="p-4">
            <Button
              onClick={onNewSession}
              variant="outline"
              className="w-full gap-2 justify-start font-semibold border-[#33345c]/20 bg-background text-[#33345c] hover:bg-[#33345c]/5 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm h-11 px-4 rounded-xl group"
            >
              <div className="p-1 rounded-md bg-[#33345c]/10 text-[#33345c] group-hover:bg-[#33345c] group-hover:text-white transition-colors">
                <Plus className="w-4 h-4" />
              </div>
              <span className="text-sm">New Chat</span>
            </Button>
          </div>

          {/* Sessions List */}
          <ScrollArea className="flex-1 px-3">
            <div className="pb-3 space-y-1 group/list">
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center mt-4">
                  <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                    <MessageSquare className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground/60">
                    Belum ada percakapan
                  </p>
                </div>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "group relative rounded-xl transition-all duration-200 border border-transparent overflow-hidden",
                      currentSessionId === session.id
                        ? "bg-[#33345c]/10 text-[#33345c] font-medium border-[#33345c]/20"
                        : "bg-transparent text-muted-foreground hover:bg-[#33345c]/5 hover:text-[#33345c]",
                    )}
                  >
                    {editingId === session.id ? (
                      /* Inline Rename Mode */
                      <div className="flex items-center gap-2 p-2 w-full">
                        <Input
                          ref={editInputRef}
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={handleKeyDown}
                          onBlur={confirmRename}
                          className="h-8 text-sm px-2 bg-background border-border flex-1 min-w-0 rounded-lg shadow-inner"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={confirmRename}
                            className="h-7 w-7 rounded-lg text-green-500 hover:bg-green-500/10 flex items-center justify-center transition-colors"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelRename}
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-muted/50 flex items-center justify-center transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Normal Display Mode */
                      <div className="grid grid-cols-[1fr_auto] items-center w-full group/item">
                        {/* Selection Area / Title */}
                        <button
                          className="flex items-center gap-3 px-3 py-2.5 cursor-pointer min-w-0 text-left w-full focus:outline-none focus:bg-accent/50 rounded-l-xl"
                          onClick={() => onSelectSession(session.id)}
                        >
                          <div
                            className={cn(
                              "p-1.5 rounded-lg transition-colors shrink-0",
                              currentSessionId === session.id
                                ? "bg-[#33345c] text-white"
                                : "bg-muted/50 text-muted-foreground group-hover/item:bg-[#33345c]/10 group-hover/item:text-[#33345c]",
                            )}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </div>
                          <div
                            className="truncate text-sm tracking-tight"
                            title={session.title || "New Chat"}
                          >
                            {session.title || "New Chat"}
                          </div>
                        </button>

                        {/* Options Button Area */}
                        <div className="pr-1 pl-1 flex items-center justify-end w-10 shrink-0 h-full">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              {/* Menggunakan button native untuk memastikan event trigger bekerja 100% */}
                              <button
                                type="button"
                                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                <MoreHorizontal className="w-4 h-4 pointer-events-none" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuContent
                                align="end"
                                side="right"
                                sideOffset={5}
                                className="w-48 p-1 bg-background border border-border shadow-xl rounded-xl z-[99999] animate-in fade-in zoom-in-95 duration-200"
                              >
                                {onRenameSession && (
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      startRename(session);
                                    }}
                                    className="cursor-pointer flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent focus:bg-accent outline-none"
                                  >
                                    <Pencil className="w-4 h-4 text-muted-foreground" />
                                    <span>Rename</span>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onSelect={() => {
                                    onDeleteSession(session.id);
                                  }}
                                  className="cursor-pointer flex items-center gap-2 px-3 py-2 text-sm text-destructive rounded-md hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive outline-none mt-1"
                                >
                                  <Trash2 className="w-4 h-4" />
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

        {/* Collapse Toggle Button - Desktop Only */}
        <div
          className={cn(
            "hidden lg:block absolute top-1/2 -translate-y-1/2 transition-transform duration-300 ease-in-out z-50",
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
    </>
  );
}
