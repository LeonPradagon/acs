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
  Search,
  Mail,
  Sun,
  Moon,
  Database,
  Shield,
  RefreshCw,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button"; // Hanya dipakai untuk tombol utama, bukan trigger dropdown
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ChatSessionItem, aiQueryService } from "@/lib/ai-query.service";
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
  onOpenEmailSettings?: () => void;
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
  onOpenEmailSettings,
  userName,
  handleLogout,
}: ChatSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Search debounce and API fetch
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await aiQueryService.searchChatHistory(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) {
      return <span>{text}</span>;
    }
    const regex = new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, "gi");
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-amber-200 dark:bg-amber-800 text-foreground rounded px-0.5 font-semibold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const filteredSessions = sessions.filter((session) =>
    (session.title || "New Chat")
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
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
            "absolute inset-y-0 left-0 h-full flex flex-col bg-[var(--surface-container-low)]/95 backdrop-blur-2xl lg:bg-[var(--surface-container-low)]/80 transition-all duration-300 ease-in-out shadow-[12px_0_40px_rgba(45,52,51,0.04)] overflow-hidden",
            isOpen
              ? "w-[280px] md:w-[300px]"
              : "w-[280px] md:w-[300px] -translate-x-full lg:translate-x-0 lg:w-[80px]",
          )}
        >
          {/* Sidebar Header — fixed at top */}
          <div className="p-4 flex flex-col gap-3 shrink-0">
            <Button
              onClick={onNewSession}
              variant="outline"
              className={cn(
                "gap-2 font-semibold border-none bg-muted/40 hover:bg-muted/80 text-foreground dark:bg-white/5 dark:hover:bg-white/10 dark:text-foreground dark:border dark:border-white/5 shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-all ease-out duration-300 h-11 rounded-full group overflow-hidden",
                isOpen
                  ? "w-full justify-start px-4"
                  : "w-11 h-11 px-0 justify-center mx-auto",
              )}
            >
              <div className="p-1 rounded-full bg-primary text-primary-foreground group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(255,145,89,0.5)] transition-all shrink-0">
                <Plus className="w-4 h-4" />
              </div>
              {isOpen && (
                <span className="text-sm tracking-wide whitespace-nowrap">
                  New Chat
                </span>
              )}
            </Button>

            {/* Search Input Bar (only when expanded) */}
            <div
              className={cn(
                "relative transition-all duration-300",
                isOpen
                  ? "opacity-100 h-10 mt-1"
                  : "opacity-0 h-0 w-0 overflow-hidden mt-0",
              )}
            >
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-muted-foreground/60" />
              </div>
              <Input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/5 dark:bg-black/30 border-none pl-9 rounded-2xl h-10 text-sm shadow-inner focus-visible:ring-1 focus-visible:ring-primary/50 text-foreground placeholder:text-muted-foreground/50 transition-colors"
              />
            </div>
          </div>

          {/* Sessions List — scrollable area, takes remaining space */}
          <ScrollArea className="flex-1 min-h-0 px-3">
            <div
              className={cn(
                "pb-3 space-y-1 group/list",
                !isOpen && "flex flex-col items-center",
              )}
            >
              {searchQuery.trim().length >= 2 ? (
                isSearching ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center mt-4 w-full">
                    <RefreshCw className="w-6 h-6 text-primary animate-spin mb-3" />
                    <p className="text-xs text-muted-foreground">Searching history...</p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center mt-4 w-full">
                    <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                      <Search className="w-6 h-6 text-muted-foreground/30" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground/60">Tidak ditemukan</p>
                  </div>
                ) : (
                  searchResults.map((res) => (
                    <button
                      key={res.id}
                      onClick={() => {
                        onSelectSession(res.sessionId);
                        setSearchQuery("");
                      }}
                      className={cn(
                        "w-full text-left p-3 rounded-2xl border bg-gradient-to-br transition-all duration-300 hover:scale-[1.01] hover:shadow focus:outline-none mb-2 border-border/50",
                        currentSessionId === res.sessionId
                          ? "from-primary/10 to-transparent border-primary/20"
                          : "from-muted/50 to-muted/20 hover:from-muted/80"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-foreground/80 truncate max-w-[150px]">
                          {res.session?.title || "New Chat"}
                        </span>
                        <span className="text-[9px] text-muted-foreground/60 font-mono">
                          {new Date(res.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground/80 leading-relaxed line-clamp-2 italic">
                        &quot;{highlightText(res.content, searchQuery)}&quot;
                      </p>
                    </button>
                  ))
                )
              ) : filteredSessions.length === 0 ? (
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
                      "group relative font-sans transition-all ease-in-out duration-300",
                      isOpen ? "rounded-[12px]" : "rounded-[12px]",
                      currentSessionId === session.id
                        ? "bg-black/5 dark:bg-[#FF5E00] dark:shadow-[0_4px_12px_rgba(255,94,0,0.3)] shadow-sm"
                        : "bg-transparent hover:bg-black/5 dark:hover:bg-[#FF5E00]/10 transition-colors",
                      !isOpen &&
                        "w-11 h-11 mx-auto flex items-center justify-center shrink-0",
                    )}
                  >
                    {/* Indicator Bar */}
                    {currentSessionId === session.id && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] bg-foreground/60 dark:bg-white rounded-r-full dark:shadow-[0_0_8px_rgba(255,255,255,0.5)] z-10" />
                    )}

                    {editingId === session.id && isOpen ? (
                      /* Inline Rename Mode */
                      <div className="flex items-center gap-2 p-2 w-full relative z-10">
                        <Input
                          ref={editInputRef}
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={handleKeyDown}
                          onBlur={confirmRename}
                          className="h-8 text-sm px-2 bg-background border-border flex-1 min-w-0 rounded-lg shadow-inner focus-visible:ring-1 focus-visible:ring-[#FF5E00]"
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
                      <div
                        className={cn(
                          "grid w-full group/item relative z-10",
                          isOpen
                            ? "grid-cols-[1fr_auto] items-center"
                            : "grid-cols-1 place-items-center w-full h-full",
                        )}
                      >
                        {/* Selection Area / Title */}
                        <button
                          className={cn(
                            "flex items-center cursor-pointer min-w-0 text-left w-full h-full focus:outline-none focus:bg-white/5 transition-transform duration-300",
                            isOpen ? "rounded-[12px]" : "rounded-[12px]",
                            currentSessionId !== session.id &&
                              "group-hover/item:translate-x-1",
                            isOpen
                              ? "gap-3 px-3 py-2.5"
                              : "justify-center p-0",
                          )}
                          onClick={() => onSelectSession(session.id)}
                          title={session.title || "New Chat"}
                        >
                          <div
                            className={cn(
                              "flex items-center justify-center transition-colors duration-300 shrink-0",
                              currentSessionId === session.id
                                ? "text-foreground dark:text-white"
                                : "text-muted-foreground group-hover/item:text-foreground dark:group-hover/item:text-[#FF5E00] opacity-70 group-hover/item:opacity-100",
                            )}
                          >
                            <MessageSquare
                              className={cn(
                                "w-4 h-4",
                                !isOpen && "w-5 h-5",
                              )}
                            />
                          </div>
                          {isOpen && (
                            <div
                              className={cn(
                                "truncate text-[14px] tracking-wide transition-colors duration-300",
                                currentSessionId === session.id
                                  ? "text-foreground dark:text-white font-medium"
                                  : "text-muted-foreground group-hover/item:text-foreground"
                              )}
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
                                <button
                                  type="button"
                                  className={cn(
                                    "h-8 w-8 flex items-center justify-center rounded-lg transition-colors outline-none",
                                    currentSessionId === session.id
                                      ? "text-foreground/70 hover:text-foreground hover:bg-black/10 dark:text-white/80 dark:hover:text-white dark:hover:bg-white/20"
                                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                                  )}
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

          {/* Bottom Section — pinned to bottom */}
          <div className="shrink-0 border-t border-border/10">
            {/* User Profile & Settings Area (Dropdown Menu) */}
            <div className="p-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "flex items-center transition-colors font-normal outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 overflow-hidden",
                      isOpen
                        ? "w-full gap-3 justify-start px-2 py-2.5 rounded-2xl hover:bg-[var(--surface-variant)]"
                        : "w-11 h-11 justify-center rounded-2xl mx-auto hover:bg-[var(--surface-variant)]",
                    )}
                  >
                    <div className="w-8 h-8 bg-[#d83545] text-white rounded-full flex items-center justify-center shrink-0 text-xs font-semibold shadow-sm">
                      {userName ? userName.substring(0, 2).toUpperCase() : "LE"}
                    </div>
                    {isOpen && (
                      <div className="flex flex-col items-start min-w-0 flex-1">
                        <span className="text-[13px] font-semibold text-foreground truncate w-full text-left">
                          {userName || "LeonPradagon"}
                        </span>
                        <span className="text-[11px] text-muted-foreground text-left truncate w-full">
                          {isAdmin ? "Super Admin" : "Analyst"}
                        </span>
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
                        <p className="text-[13px] font-semibold truncate w-full leading-tight">
                          {userName || "LeonPradagon"}
                        </p>
                        <p className="text-[11px] text-muted-foreground w-full mt-0.5">
                          {isAdmin ? "Super Admin" : "Analyst"}
                        </p>
                      </div>
                    </div>

                    <div className="h-px bg-border my-1 mx-2" />

                    <DropdownMenuItem className="gap-3 cursor-pointer py-3 px-2 rounded-xl text-[13px] font-medium transition-colors">
                      <Zap className="w-4 h-4 text-muted-foreground" />{" "}
                      Personalization
                    </DropdownMenuItem>

                    <DropdownMenuItem className="gap-3 cursor-pointer py-3 px-2 rounded-xl text-[13px] font-medium transition-colors">
                      <div className="w-4 h-4 bg-[#d83545] text-white rounded-full flex items-center justify-center text-[7px] font-bold">
                        {userName ? userName.substring(0, 2).toUpperCase() : "LE"}
                      </div>
                      Profile
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onSelect={() => {
                        if (onOpenEmailSettings) onOpenEmailSettings();
                      }}
                      className="gap-3 cursor-pointer py-3 px-2 rounded-xl text-[13px] font-medium transition-colors"
                    >
                      <Mail className="w-4 h-4 text-muted-foreground" /> Email
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      disabled={!isAdmin}
                      onSelect={() => {
                        window.location.href = '/admin/users';
                      }}
                      className="gap-3 cursor-pointer py-3 px-2 rounded-xl text-[13px] font-medium transition-colors text-indigo-500/80 hover:text-indigo-500"
                    >
                      <Shield className="w-4 h-4" />{" "}
                      {isAdmin ? "Admin Dashboard" : "Admin Settings"}
                    </DropdownMenuItem>

                    <div className="h-px bg-border my-1 mx-2" />

                    <DropdownMenuItem className="flex justify-between items-center cursor-pointer py-3 px-2 rounded-xl text-[13px] font-medium transition-colors">
                      <div className="flex items-center gap-3">
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />{" "}
                        Help
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
        </div>

        {/* Collapse Toggle Button - Desktop Only */}
        <div className="hidden lg:block absolute top-1/2 right-[-14px] -translate-y-1/2 transition-all duration-300 ease-in-out z-50">
          <button
            onClick={onToggle}
            className="flex h-12 w-3.5 items-center justify-center rounded-r-2xl bg-[var(--surface-container-lowest)] text-muted-foreground hover:text-foreground shadow-[12px_0_20px_rgba(45,52,51,0.03)] transition-colors cursor-pointer group/toggle focus:outline-none"
            title={isOpen ? "Tutup Sidebar" : "Buka Sidebar"}
          >
            <div className="w-1 h-3 rounded-full bg-muted-foreground/30 transition-colors group-hover/toggle:bg-muted-foreground" />
          </button>
        </div>
      </div>
    </>
  );
}
