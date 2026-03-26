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
  Settings,
  User,
  LogOut,
  Sparkles,
  Zap,
  HelpCircle,
  ChevronRight,
  Search
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
  isAdmin?: boolean;
  onOpenSettings?: () => void;
  userName?: string;
  handleLogout?: () => void;
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
  isAdmin,
  onOpenSettings,
  userName,
  handleLogout,
}: ChatSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  const filteredSessions = sessions.filter(session => 
    (session.title || "New Chat").toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            : "w-0 -translate-x-full lg:translate-x-0 lg:w-[80px]",
        )}
      >
        {/* Sliding Inner Panel */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 flex flex-col border-r border-border/50 bg-background/95 backdrop-blur-md lg:bg-muted/30 transition-all duration-300 ease-in-out shadow-2xl lg:shadow-none overflow-hidden",
            isOpen ? "w-[280px] md:w-[300px]" : "w-[280px] md:w-[300px] -translate-x-full lg:translate-x-0 lg:w-[80px]"
          )}
        >
          {/* Sidebar Header */}
          <div className="p-4 flex flex-col gap-3">
            <Button
              onClick={onNewSession}
              variant="outline"
              className={cn(
                 "gap-2 font-semibold border-indigo-500/20 bg-background text-indigo-500 hover:bg-indigo-500/5 transition-all shadow-sm h-11 rounded-xl group overflow-hidden",
                 isOpen ? "w-full justify-start px-4" : "w-11 h-11 px-0 justify-center mx-auto"
              )}
            >
              <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors shrink-0">
                <Plus className="w-4 h-4" />
              </div>
              {isOpen && <span className="text-sm whitespace-nowrap">New Chat</span>}
            </Button>

            {/* Search Input Bar (only when expanded) */}
            <div className={cn("relative transition-all duration-300", isOpen ? "opacity-100 h-10 mt-1" : "opacity-0 h-0 w-0 overflow-hidden mt-0")}>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-muted-foreground/60" />
              </div>
              <Input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background border-border/50 pl-9 rounded-xl h-10 text-sm focus-visible:ring-1 focus-visible:ring-indigo-500/50"
              />
            </div>
          </div>

          {/* Sessions List */}
          <ScrollArea className="flex-1 px-3">
            <div className={cn("pb-3 space-y-1 group/list", !isOpen && "flex flex-col items-center")}>
              {filteredSessions.length === 0 ? (
                isOpen ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center mt-4">
                    <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                      <MessageSquare className="w-6 h-6 text-muted-foreground/30" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground/60">
                      {searchQuery ? "Tidak ditemukan" : "Belum ada percakapan"}
                    </p>
                  </div>
                ) : null

              ) : (
                filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "group relative rounded-xl transition-all duration-200 border border-transparent overflow-hidden",
                      currentSessionId === session.id
                        ? "bg-[#33345c]/10 text-[#33345c] font-medium border-[#33345c]/20"
                        : "bg-transparent text-muted-foreground hover:bg-[#33345c]/5 hover:text-[#33345c]",
                      !isOpen && "w-11 h-11 mx-auto flex items-center justify-center shrink-0"
                    )}
                  >
                    {editingId === session.id && isOpen ? (
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
                      <div className={cn("grid w-full group/item", isOpen ? "grid-cols-[1fr_auto] items-center" : "grid-cols-1 place-items-center w-full h-full")}>
                        {/* Selection Area / Title */}
                        <button
                          className={cn(
                            "flex items-center cursor-pointer min-w-0 text-left w-full h-full focus:outline-none focus:bg-accent/50 rounded-l-xl",
                            isOpen ? "gap-3 px-3 py-2.5" : "justify-center p-0 rounded-xl"
                          )}
                          onClick={() => onSelectSession(session.id)}
                          title={session.title || "New Chat"}
                        >
                          <div
                            className={cn(
                              "p-1.5 rounded-lg transition-colors shrink-0",
                              currentSessionId === session.id
                                ? "bg-[#33345c] text-white"
                                : "bg-muted/50 text-muted-foreground group-hover/item:bg-[#33345c]/10 group-hover/item:text-[#33345c]",
                            )}
                          >
                            <MessageSquare className={cn("w-3.5 h-3.5", !isOpen && "w-4 h-4")} />
                          </div>
                          {isOpen && (
                            <div
                              className="truncate text-sm tracking-tight"
                            >
                              {session.title || "New Chat"}
                            </div>
                          )}
                        </button>

                        {/* Options Button Area */}
                        {isOpen && (
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
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* User Profile & Settings Area (Dropdown Menu) */}
          <div className="p-2 shrink-0 mt-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "flex items-center transition-colors font-normal outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 overflow-hidden",
                    isOpen 
                      ? "w-full gap-3 justify-start px-2 py-2.5 rounded-xl hover:bg-muted/60" 
                      : "w-11 h-11 justify-center rounded-xl mx-auto hover:bg-muted/60"
                  )}
                >
                  <div className="w-8 h-8 bg-[#d83545] text-white rounded-full flex items-center justify-center shrink-0 text-xs font-semibold shadow-sm">
                    {userName ? userName.substring(0, 2).toUpperCase() : "LE"}
                  </div>
                  {isOpen && (
                    <div className="flex flex-col items-start min-w-0 flex-1">
                      <span className="text-[13px] font-semibold text-foreground truncate w-full text-left">{userName || "LeonPradagon"}</span>
                      <span className="text-[11px] text-muted-foreground text-left truncate w-full">{isAdmin ? "Super Admin" : "Analyst"}</span>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuPortal>
                <DropdownMenuContent 
                   align="start" 
                   side="top" 
                   sideOffset={8}
                   className="w-[280px] p-2 rounded-2xl border shadow-xl z-[99999]" 
                >
                  <div className="flex items-center gap-3 px-2 py-3 mb-1">
                    <div className="w-8 h-8 bg-[#d83545] text-white rounded-full flex items-center justify-center shrink-0 text-xs font-semibold">
                      {userName ? userName.substring(0, 2).toUpperCase() : "LE"}
                    </div>
                    <div className="flex flex-col items-start min-w-0">
                       <p className="text-[13px] font-semibold truncate w-full leading-tight">{userName || "LeonPradagon"}</p>
                       <p className="text-[11px] text-muted-foreground w-full mt-0.5">{isAdmin ? "Super Admin" : "Analyst"}</p>
                    </div>
                  </div>
                  
                  <div className="h-px bg-border my-1 mx-2" />
                  
                  <DropdownMenuItem className="gap-3 cursor-pointer py-3 px-2 rounded-xl text-[13px] font-medium transition-colors">
                    <Zap className="w-4 h-4 text-muted-foreground" /> Personalization
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem className="gap-3 cursor-pointer py-3 px-2 rounded-xl text-[13px] font-medium transition-colors">
                    <div className="w-4 h-4 bg-[#d83545] text-white rounded-full flex items-center justify-center text-[7px] font-bold">
                       {userName ? userName.substring(0, 2).toUpperCase() : "LE"}
                    </div>
                    Profile
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem
                    disabled={!isAdmin}
                    onSelect={() => {
                      if (onOpenSettings) onOpenSettings();
                    }}
                    className="gap-3 cursor-pointer py-3 px-2 rounded-xl text-[13px] font-medium transition-colors"
                  >
                    <Settings className="w-4 h-4 text-muted-foreground" /> {isAdmin ? "Admin Settings" : "Settings"}
                  </DropdownMenuItem>
                  
                  <div className="h-px bg-border my-1 mx-2" />
                  
                  <DropdownMenuItem className="flex justify-between items-center cursor-pointer py-3 px-2 rounded-xl text-[13px] font-medium transition-colors">
                    <div className="flex items-center gap-3">
                      <HelpCircle className="w-4 h-4 text-muted-foreground" /> Help
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem
                    onSelect={() => {
                        if (handleLogout) handleLogout();
                    }}
                    className="gap-3 cursor-pointer py-3 px-2 rounded-xl text-[13px] font-medium transition-colors mt-0.5"
                  >
                    <LogOut className="w-4 h-4 text-muted-foreground" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenuPortal>
            </DropdownMenu>
          </div>
        </div>

        {/* Collapse Toggle Button - Desktop Only */}
        <div className="hidden lg:block absolute top-1/2 right-[-14px] -translate-y-1/2 transition-all duration-300 ease-in-out z-50">
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
