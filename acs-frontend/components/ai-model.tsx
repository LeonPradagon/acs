"use client";

import React, {
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useRef,
  useEffect,
} from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Virtuoso } from "react-virtuoso";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectSeparator,
  SelectLabel,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import {
  Bot,
  Brain,
  Send,
  RefreshCw,
  Trash2,
  Copy,
  Upload,
  Square,
  Download,
  AlertCircle,
  CheckCircle,
  FileText,
  ArrowDown,
  Sparkles,
  MessageSquare,
  Code,
  Lightbulb,
  ImageIcon,
  Check,
  Plus,
  X,
  ChevronDown,
  File,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// Custom Hooks
import { useRouter, usePathname } from "next/navigation";
import { useChat } from "@/hooks/useChat";
import { useRAG } from "@/hooks/useRAG";

// Sub-components
import { ChatMessageView } from "./chat/chat-message-view";
import { ChatSidebar } from "./workspace/chat-sidebar";
import { EmailSettingsModal } from "./workspace/email-settings-modal";

// Config
import { AVAILABLE_MODELS } from "@/constants/ai-config";
import { ChatMessage } from "@/types/chat";

// ============================================================
// Welcome Screen Component
// ============================================================

function WelcomeScreen({
  userName,
}: {
  userName: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [greeting, setGreeting] = useState("Selamat datang");

  useEffect(() => {
    setMounted(true);
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) setGreeting("Selamat pagi");
    else if (hour >= 11 && hour < 15) setGreeting("Selamat siang");
    else if (hour >= 15 && hour < 18) setGreeting("Selamat sore");
    else setGreeting("Selamat malam");
  }, []);

  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center w-full transition-all duration-1000 ease-out pointer-events-auto",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
    >
      <div className="flex flex-row flex-wrap items-center justify-center gap-3 md:gap-4 mb-6 px-4">
        <div className="flex items-center gap-2 md:gap-3">
          <Image
            src="/images/Asisgo.png"
            alt="Logo"
            width={40}
            height={40}
            className="w-8 h-8 md:w-10 md:h-10 object-contain drop-shadow-sm"
          />
          <span className="text-base md:text-xl font-bold text-foreground tracking-tight">
            Asisgo Core Sovereign
          </span>
        </div>
        
        <div className="h-5 md:h-7 w-[2px] bg-black/20 dark:bg-white/20 rounded-full mx-1 md:mx-2" />
        
        <h2 className="text-base md:text-xl font-medium text-muted-foreground tracking-tight">
          {greeting}, {userName.split(" ")[0]}
        </h2>
      </div>
    </div>
  );
}

const ImagePreviewThumb = ({ file, onRemove }: { file: File; onRemove: () => void }) => {
  const [src, setSrc] = useState<string>("");
  
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setSrc(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <div className="relative flex items-center justify-center w-14 h-14 bg-muted/50 border border-border/50 rounded-xl group overflow-visible shrink-0 shadow-sm">
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img 
          src={src} 
          alt={file.name} 
          className="w-full h-full object-cover rounded-xl"
        />
      )}
      <button
        onClick={(e) => {
          e.preventDefault();
          onRemove();
        }}
        className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center bg-background border border-border/80 rounded-full text-muted-foreground hover:bg-destructive hover:text-white hover:border-destructive transition-all shadow-sm z-10"
        title="Hapus gambar"
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </div>
  );
};

// ============================================================
// Main Component
// ============================================================

interface AIQueryInputProps {
  onProcessComplete?: (message: ChatMessage) => void;
  className?: string;
  workspaceHeader?: React.ReactNode;
  handleLogout?: () => void;
}

export const AIQueryInput = forwardRef<any, AIQueryInputProps>((props, ref) => {
  const chat = useChat({
    onProcessComplete: props.onProcessComplete,
  });

  const rag = useRAG();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const [userName, setUserName] = useState<string>("User");
  const [userRole, setUserRole] = useState<string>("user");
  const [isEmailSettingsOpen, setIsEmailSettingsOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const uploadMenuRef = useRef<HTMLDivElement>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(event.target as Node)) {
        setIsUploadOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const loadUserFromStorage = async () => {
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const userObj = JSON.parse(userStr);
          if (userObj && userObj.name) {
            setUserName(userObj.name);
          }
          if (userObj && userObj.role) {
            setUserRole(userObj.role);
          }
        }
        
        // Always verify with backend to ensure data is perfectly synced
        const token = localStorage.getItem("accessToken");
        if (token) {
          const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
          const res = await fetch(`${baseUrl}/api/users/profile`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.name) setUserName(data.name);
            if (data.role) setUserRole(data.role);
            
            // Sync localstorage
            if (userStr) {
              const userObj = JSON.parse(userStr);
              userObj.name = data.name;
              userObj.role = data.role;
              localStorage.setItem("user", JSON.stringify(userObj));
            }
          }
        }
      } catch (e) {
        console.error("Failed to load user from storage/API", e);
      }
    };

    // Load initially
    loadUserFromStorage();

    // Listen to changes (e.g. from Profile edit in another tab)
    window.addEventListener("storage", loadUserFromStorage);
    return () => window.removeEventListener("storage", loadUserFromStorage);
  }, [pathname]);

  useImperativeHandle(ref, () => ({
    setQuery: (newQuery: string) => {
      chat.setQuery(newQuery);
    },
  }));

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+N -> New Session
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        chat.handleNewSession();
      }
      // Ctrl+Shift+S -> Toggle Sidebar
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        chat.setIsSidebarOpen(!chat.isSidebarOpen);
      }
      // Escape -> Stop Generation
      if (e.key === "Escape" && chat.isProcessing) {
        e.preventDefault();
        chat.stopGeneration();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [chat]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    chat.setQuery(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
  };

  const handlePromptClick = (prompt: string) => {
    chat.setQuery(prompt);
    chat.handleProcess(prompt, "universal", "universal", "auto", {});
  };

  const getModelDisplayName = (model: string): string => {
    return (
      AVAILABLE_MODELS[model as keyof typeof AVAILABLE_MODELS]?.name || model
    );
  };

  const handleSendMessage = async () => {
    let currentFiles: any[] = [];
    if (rag.uploadedFiles.length > 0) {
      // Capture file info before they are cleared
      currentFiles = rag.uploadedFiles.map((f) => ({
        name: f.name,
        type: f.type,
        size: f.size,
      }));

      if (!rag.isUploading) {
        // Explicitly upload files that were just queued
        const success = await rag.uploadDocuments();
        if (success) {
          // Minor sync delay to ensure the backend DB commit/ES refresh is complete
          // before the first query attempts retrieval.
          await new Promise((resolve) => setTimeout(resolve, 1200));
        }
      }

      // Clear the RAG files from the UI after sending
      rag.setUploadedFiles([]);
    }

    let base64Images: string[] = [];
    if (imageFiles.length > 0) {
      if (chat.selectedModel !== "openai/gemma4:31b-cloud") {
        chat.setSelectedModel("openai/gemma4:31b-cloud");
      }

      base64Images = await Promise.all(
        imageFiles.map(
          (file) =>
            new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
            }),
        ),
      );

      setImageFiles([]);
    }

    if (chat.query.trim() || base64Images.length > 0) {
      chat.handleProcess(
        chat.query,
        "universal",
        "universal",
        "auto",
        {},
        undefined,
        currentFiles,
        base64Images.length > 0
          ? "openai/gemma4:31b-cloud"
          : undefined,
        base64Images,
      );
    }
  };

  // Determine if we should show welcome screen
  const showWelcome =
    chat.chatHistory.length <= 1 &&
    (chat.chatHistory.length === 0 || chat.chatHistory[0]?.id === "welcome") &&
    !chat.isProcessing;

  return (
    <>
      <div className="flex h-full w-full overflow-hidden relative">
        {/* Chat Sidebar */}
        <ChatSidebar
          isAdmin={userRole === "admin"}
          userName={userName}
          onOpenEmailSettings={() => setIsEmailSettingsOpen(true)}
          handleLogout={props.handleLogout}
          sessions={chat.sessions}
          currentSessionId={chat.currentSessionId}
          isOpen={chat.isSidebarOpen}
          onToggle={() => chat.setIsSidebarOpen(!chat.isSidebarOpen)}
          onNewSession={chat.handleNewSession}
          onSelectSession={chat.handleSelectSession}
          onDeleteSession={chat.handleDeleteSession}
          onRenameSession={chat.handleRenameSession}
        />

        {/* Main Chat Area */}
        <div className="flex flex-col flex-1 h-full bg-background relative min-w-0">
          {props.workspaceHeader && React.isValidElement(props.workspaceHeader) 
            ? React.cloneElement(props.workspaceHeader as React.ReactElement<any>, { 
                onMenuToggle: () => chat.setIsSidebarOpen(!chat.isSidebarOpen),
                sessionTitle: chat.chatHistory.length > 0 && chat.chatHistory[0]?.id !== "welcome" 
                  ? (chat.sessions.find(s => s.id === chat.currentSessionId)?.title || "New Chat") 
                  : undefined,
                onExport: chat.exportToMarkdown,
                onCopy: chat.copyConversation,
                onShare: () => alert("Share conversation functionality to be implemented")
              })
            : props.workspaceHeader}

          {/* Chat History */}
          <div className="flex-1 overflow-hidden relative">
            {!showWelcome && (
              <Virtuoso
                className="h-full w-full custom-scrollbar"
                data={chat.chatHistory}
                initialTopMostItemIndex={Math.max(0, chat.chatHistory.length - 1)}
                followOutput="smooth"
                itemContent={(index, message) => (
                  <div className="py-2">
                    <ChatMessageView
                      key={message.id}
                      message={message}
                      messageIndex={index}
                      userName={userName}
                      onRegenerate={
                        message.role === "assistant" &&
                        message.id !== "welcome" &&
                        message.id !== "cleared"
                          ? chat.handleRegenerate
                          : undefined
                      }
                      onFeedback={
                        message.role === "assistant" &&
                        message.id !== "welcome" &&
                        message.id !== "cleared" &&
                        message.id !== "streaming"
                          ? chat.submitFeedback
                          : undefined
                      }
                      onEditAndResubmit={
                        message.role === "user" &&
                        message.id !== "welcome" &&
                        message.id !== "cleared"
                          ? chat.handleEditAndResubmit
                          : undefined
                      }
                    />
                  </div>
                )}
                components={{
                  Footer: () => (
                    <div className="pb-10">
                      {/* Streaming Live */}
                      {chat.isProcessing && chat.streamingContent && (
                        <ChatMessageView
                          key="streaming"
                          message={{
                            id: "streaming",
                            content: chat.streamingContent,
                            role: "assistant",
                            timestamp: new Date(),
                          }}
                          isProcessing={chat.isProcessing}
                        />
                      )}

                      {/* Thinking Indicator */}
                      {chat.isProcessing && !chat.streamingContent && (
                        <div className="flex flex-col w-full max-w-3xl mx-auto px-1 animate-in fade-in duration-500">
                          <div className="flex items-center gap-3 text-primary/60 mb-2">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">
                              {chat.streamingContent ? "Streaming..." : "Thinking..."}
                            </span>
                          </div>

                          {/* Processing Steps */}
                          {chat.processingSteps.length > 0 && (
                            <div className="ml-6 space-y-1.5 border-l border-primary/10 pl-4 py-1">
                              {chat.processingSteps.map((step, idx) => (
                                <div
                                  key={idx}
                                  className={cn(
                                    "text-[11px] flex items-center gap-2",
                                    idx === chat.processingSteps.length - 1
                                      ? "text-primary font-medium animate-pulse"
                                      : "text-muted-foreground/60",
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "w-1 h-1 rounded-full",
                                      idx === chat.processingSteps.length - 1
                                        ? "bg-primary"
                                        : "bg-muted-foreground/30",
                                    )}
                                  />
                                  {step}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <div ref={chat.messagesEndRef} className="h-40" />
                    </div>
                  )
                }}
              />
            )}
          </div>

          {/* Stop Generation Button */}
          {chat.isProcessing && (
            <div className="absolute bottom-[120px] left-0 right-0 flex justify-center pointer-events-none z-10">
              <Button
                onClick={chat.stopGeneration}
                variant="outline"
                size="sm"
                className="pointer-events-auto gap-2 rounded-full bg-white/70 dark:bg-[var(--surface-container-highest)]/80 backdrop-blur-xl shadow-[0_12px_40px_rgba(45,52,51,0.06)] border border-white/20 dark:border-primary/10 hover:bg-white dark:hover:bg-[var(--surface-variant)] transition-all text-on-surface"
              >
                <Square className="w-3 h-3 fill-current" />
                <span className="text-xs font-medium">Hentikan Generasi</span>
              </Button>
            </div>
          )}

          {/* Input Area */}
          <div className={cn(
            "absolute left-0 right-0 px-6 flex flex-col justify-center items-center pointer-events-none transition-all duration-500 ease-in-out",
            showWelcome ? "top-[40%] -translate-y-1/2" : "bottom-6"
          )}>
            {showWelcome && <WelcomeScreen userName={userName} />}
            <div className="w-full max-w-3xl flex flex-col gap-1 pointer-events-auto transition-all duration-300 relative">
              
              {/* Inline Upload UI (Above Input) */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  const images = files.filter((f) =>
                    f.type.startsWith("image/"),
                  );
                  const nonImages = files.filter(
                    (f) => !f.type.startsWith("image/"),
                  );

                  if (images.length > 0) {
                    setImageFiles((prev) => [...prev, ...images]);
                  }

                  if (nonImages.length > 0) {
                    const dt = new DataTransfer();
                    nonImages.forEach((f) => dt.items.add(f));
                    rag.handleFileSelect({
                      ...e,
                      target: { ...e.target, files: dt.files },
                    } as any);
                  }

                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                className="hidden"
                multiple
                accept=".pdf,.txt,.docx,.csv,.xlsx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,image/*"
              />

              {/* Chat Input Container */}
              <div className="w-full relative bg-transparent border border-border/50 rounded-[2rem] focus-within:ring-2 focus-within:ring-primary/10 focus-within:border-primary/30 transition-all shadow-sm flex flex-col">
                
                {/* Uploaded Files & Progress Section (Top) */}
                {(imageFiles.length > 0 || rag.uploadedFiles.length > 0) && (
                  <div className="px-5 pt-4 pb-0 w-full max-h-32 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                    <div className="flex flex-wrap gap-3">
                      {imageFiles.map((file, idx) => (
                        <ImagePreviewThumb 
                          key={`img-${file.name}-${idx}`} 
                          file={file} 
                          onRemove={() => {
                            setImageFiles((prev) =>
                              prev.filter((_, i) => i !== idx)
                            );
                          }} 
                        />
                      ))}

                      {rag.uploadedFiles.map((file, idx) => (
                        <div
                          key={`${file.name}-${idx}`}
                          className="relative flex items-center gap-2 bg-muted/50 hover:bg-muted/80 cursor-pointer border border-border/50 rounded-xl pl-2.5 pr-4 py-1.5 text-sm group transition-colors"
                          onClick={() => {
                            const url = URL.createObjectURL(file);
                            setPreviewFile({ url, name: file.name });
                          }}
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="max-w-[120px] truncate text-[11px] font-medium">
                            {file.name}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              rag.removeFile(idx);
                            }}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center bg-background border border-border/80 rounded-full text-muted-foreground hover:bg-destructive hover:text-white hover:border-destructive transition-all shadow-sm z-10"
                            title="Hapus file"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Upload Status / Progress */}
                    {rag.isUploading && (
                      <div className="flex items-center gap-3 w-full pb-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground whitespace-nowrap">
                          Uploading... {rag.uploadProgress}%
                        </span>
                        <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${rag.uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {rag.uploadError && (
                      <div className="text-[10px] text-destructive flex items-center gap-1 font-medium bg-destructive/10 px-2 py-1 rounded-md w-max mb-2">
                        <AlertCircle className="w-3 h-3" /> {rag.uploadError}
                      </div>
                    )}
                    {rag.showUploadSuccess && (
                      <div className="text-[10px] text-emerald-500 flex items-center gap-1 font-medium bg-emerald-500/10 px-2 py-1 rounded-md w-max mb-2">
                        <CheckCircle className="w-3 h-3" /> {rag.uploadSuccess}
                      </div>
                    )}
                  </div>
                )}

                {/* Text Input Area */}
                <div className="relative w-full">
                  <Textarea
                    ref={chat.textareaRef}
                    placeholder="Message ACS AI Assistant..."
                    value={chat.query}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyPress}
                    className="w-full min-h-[56px] max-h-[200px] py-4 pl-12 pr-32 resize-none border-0 focus-visible:ring-0 text-[15px] bg-transparent text-foreground placeholder:text-muted-foreground/40 leading-relaxed shadow-none custom-scrollbar rounded-[2rem]"
                    disabled={chat.isProcessing || rag.isUploading}
                    style={{ overflowY: "auto" }}
                  />
                  
                  {/* Embedded Upload Button (Left) */}
                  <div className="absolute left-3 bottom-2.5 z-20" ref={uploadMenuRef}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsUploadOpen(!isUploadOpen);
                      }}
                      disabled={chat.isProcessing || rag.isUploading}
                      className="h-9 w-9 text-muted-foreground !bg-transparent hover:!bg-transparent hover:opacity-70 hover:text-foreground transition-all rounded-full flex items-center justify-center focus-visible:ring-0"
                      title="Upload options"
                    >
                      <Plus className={cn("w-5 h-5 transition-transform duration-300", isUploadOpen ? "rotate-45" : "rotate-0")} />
                    </Button>

                    {isUploadOpen && (
                      <div className={cn(
                        "absolute left-0 w-56 p-2 rounded-2xl shadow-xl border border-border/50 bg-background/95 backdrop-blur-xl z-[999] animate-in fade-in zoom-in-95 duration-200",
                        showWelcome ? "top-full mt-2" : "bottom-full mb-2"
                      )}>
                        <button 
                          className="flex items-center gap-3 w-full text-left py-2.5 px-3 rounded-xl hover:bg-muted transition-colors" 
                          onClick={() => {
                            fileInputRef.current?.click();
                            setIsUploadOpen(false);
                          }}
                        >
                          <FileText className="w-4 h-4 text-indigo-500" />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">Document</span>
                            <span className="text-[10px] text-muted-foreground">PDF, Word, Excel, CSV</span>
                          </div>
                        </button>
                        <button 
                          className="flex items-center gap-3 w-full text-left py-2.5 px-3 rounded-xl hover:bg-muted transition-colors mt-1" 
                          onClick={() => {
                            fileInputRef.current?.click();
                            setIsUploadOpen(false);
                          }}
                        >
                          <ImageIcon className="w-4 h-4 text-blue-500" />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">Image</span>
                            <span className="text-[10px] text-muted-foreground">JPG, PNG, GIF</span>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Embedded Controls (Right) */}
                  <div className="absolute right-4 bottom-3 z-10 flex items-center gap-2">
                    {/* Unified Model & Effort Selector */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-border/50 bg-[var(--surface-container-low)] hover:bg-[var(--surface-container)] text-[11px] font-mono shadow-sm transition-all outline-none group">
                          <span className="truncate max-w-[120px]">
                            {AVAILABLE_MODELS[chat.selectedModel as keyof typeof AVAILABLE_MODELS]?.name || "Model"}
                          </span>
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[280px] p-2 rounded-xl border-border/50 shadow-xl backdrop-blur-xl">
                        
                        {/* Open Source Models */}
                        <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Open Source Models
                        </div>
                        {Object.entries(AVAILABLE_MODELS).filter(([id]) => id.includes('oss')).map(([id, model]) => (
                          <DropdownMenuItem 
                            key={id} 
                            onClick={() => chat.setSelectedModel(id)}
                            className={cn("flex flex-col items-start gap-0.5 py-2 px-2 cursor-pointer rounded-lg", chat.selectedModel === id ? "bg-accent/50" : "")}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="font-semibold text-[13px]">{model.name}</span>
                              {chat.selectedModel === id && <Check className="w-4 h-4 text-blue-500" />}
                            </div>
                            <span className="text-[11px] text-muted-foreground line-clamp-1">{model.description}</span>
                          </DropdownMenuItem>
                        ))}

                        <DropdownMenuSeparator className="my-1.5" />

                        {/* Cloud Models */}
                        <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Cloud Models
                        </div>
                        {Object.entries(AVAILABLE_MODELS).filter(([id]) => !id.includes('oss')).map(([id, model]) => (
                          <DropdownMenuItem 
                            key={id} 
                            onClick={() => chat.setSelectedModel(id)}
                            className={cn("flex flex-col items-start gap-0.5 py-2 px-2 cursor-pointer rounded-lg", chat.selectedModel === id ? "bg-accent/50" : "")}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="font-semibold text-[13px]">{model.name}</span>
                              {chat.selectedModel === id && <Check className="w-4 h-4 text-blue-500" />}
                            </div>
                            <span className="text-[11px] text-muted-foreground line-clamp-1">{model.description}</span>
                          </DropdownMenuItem>
                        ))}

                        <DropdownMenuSeparator className="my-1.5" />

                        {/* Effort Sub Menu */}
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="py-2.5 px-2 rounded-lg cursor-pointer">
                            <span className="text-[13px] font-medium flex-1">Effort</span>
                            <span className="text-xs text-muted-foreground capitalize mr-1">{chat.effortLevel}</span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent className="w-[300px] p-2 rounded-xl border-border/50 shadow-xl backdrop-blur-xl" sideOffset={8}>
                              <div className="px-2 py-2 mb-1 text-xs text-muted-foreground leading-relaxed">
                                Higher effort means more thorough responses, but takes longer and uses your limits faster.
                              </div>
                              
                              {["low", "medium", "high", "ultra high"].map((level) => (
                                <DropdownMenuItem 
                                  key={level}
                                  onClick={() => chat.setEffortLevel(level)}
                                  className="flex items-center justify-between py-2.5 px-2 cursor-pointer rounded-lg"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-[13px] capitalize">{level === "ultra high" ? "Max" : level}</span>
                                    {level === "low" && <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-muted text-muted-foreground border-none">Default</Badge>}
                                  </div>
                                  {chat.effortLevel === level && <Check className="w-4 h-4 text-blue-500" />}
                                </DropdownMenuItem>
                              ))}
                              
                              <DropdownMenuSeparator className="my-2" />
                              
                              <div className="px-2 py-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[13px] font-medium">Thinking</span>
                                  <Switch 
                                    checked={chat.isThinking} 
                                    onCheckedChange={chat.setIsThinking}
                                    className="data-[state=checked]:bg-blue-500 scale-[0.8] origin-right"
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground">Can think for more complex tasks</span>
                              </div>
                              
                              <DropdownMenuSeparator className="my-1" />
                              
                              <div className="px-2 py-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[13px] font-medium">Web Search</span>
                                  <Switch 
                                    checked={chat.isWebSearchEnabled} 
                                    onCheckedChange={chat.setIsWebSearchEnabled}
                                    className="data-[state=checked]:bg-blue-500 scale-[0.8] origin-right"
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground">Search internet for current events</span>
                              </div>
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>

                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      <EmailSettingsModal
        open={isEmailSettingsOpen}
        onOpenChange={setIsEmailSettingsOpen}
      />

      {/* File Preview Modal */}
      <Dialog open={!!previewFile} onOpenChange={(open) => {
        if (!open) {
          if (previewFile?.url) URL.revokeObjectURL(previewFile.url);
          setPreviewFile(null);
        }
      }}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden bg-white/5 border-white/10 shadow-2xl backdrop-blur-xl">
          <DialogTitle className="sr-only">
            Pratinjau dokumen {previewFile?.name}
          </DialogTitle>
          <div className="flex-1 overflow-hidden relative rounded-lg">
            {previewFile && (
              <iframe 
                src={`${previewFile.url}${previewFile.name.toLowerCase().endsWith(".pdf") ? "#toolbar=0&navpanes=0&scrollbar=0" : ""}`} 
                className="w-full h-full border-none bg-white"
                title={`Preview of ${previewFile.name}`}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});

AIQueryInput.displayName = "AIQueryInput";
