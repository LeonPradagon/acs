"use client";

import React, {
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

// Custom Hooks
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

const SUGGESTED_PROMPTS: any[] = [
  {
    icon: Sparkles,
    title: "Kebijakan DDoS",
    desc: "Bagaimana cara melakukan mitigasi serangan siber DDoS?",
    prompt: "Bagaimana cara melakukan mitigasi serangan siber DDoS?",
    color: "from-blue-500/5 to-indigo-500/5 border-blue-500/10 hover:border-blue-500/30 text-blue-500"
  },
  {
    icon: Brain,
    title: "Karyawan IT",
    desc: "Berapa total karyawan di divisi IT saat ini?",
    prompt: "Berapa total karyawan di divisi IT saat ini?",
    color: "from-purple-500/5 to-pink-500/5 border-purple-500/10 hover:border-purple-500/30 text-purple-500"
  },
  {
    icon: Code,
    title: "Gaji HRD",
    desc: "Tampilkan data gaji karyawan di divisi HRD",
    prompt: "Tampilkan data gaji karyawan di divisi HRD",
    color: "from-emerald-500/5 to-teal-500/5 border-emerald-500/10 hover:border-emerald-500/30 text-emerald-500"
  },
  {
    icon: FileText,
    title: "Ringkasan Kebijakan",
    desc: "Ringkas dokumen kebijakan keamanan yang baru diunggah",
    prompt: "Ringkas dokumen kebijakan keamanan yang baru diunggah",
    color: "from-orange-500/5 to-amber-500/5 border-orange-500/10 hover:border-orange-500/30 text-orange-500"
  }
];

function WelcomeScreen({
  onPromptClick,
  userName,
}: {
  onPromptClick: (prompt: string) => void;
  userName: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center h-full max-w-2xl mx-auto px-6 transition-all duration-1000 ease-out pb-[12vh]",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}
    >
      {/* Header Area */}
      <div className="flex flex-col items-center mb-6 text-center">
        <img
          src="/images/Asisgo.png"
          alt="Logo"
          className="w-16 h-16 object-contain mb-3"
        />
        <div className="flex flex-col leading-tight">
          <span className="text-2xl font-black text-foreground uppercase tracking-tight">
            ACS
          </span>
          <span className="text-[10px] font-bold tracking-[0.3em] text-muted-foreground/40 uppercase">
            Assistant
          </span>
        </div>
      </div>

      {/* Greeting Section */}
      <div className="text-center mb-8">
        <h2 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight leading-tight">
          Hi, {userName.split(" ")[0]}.
          <br />
          Apa yang bisa saya bantu hari ini?
        </h2>
      </div>

      {/* Suggested Prompts Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-8">
        {SUGGESTED_PROMPTS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => onPromptClick(item.prompt)}
              className={cn(
                "flex flex-col items-start text-left p-4 rounded-2xl border bg-gradient-to-br transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/20",
                item.color || "from-muted/50 to-muted border-border/50"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-xl bg-white/50 dark:bg-black/30 backdrop-blur-sm border border-black/5 dark:border-white/5">
                  <Icon className="w-4 h-4 text-inherit" />
                </div>
                <span className="text-xs font-bold tracking-wide uppercase text-foreground/80">
                  {item.title}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {item.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Minimal Footer */}
      <div className="flex flex-col items-center gap-2 opacity-30 mt-4">
        <div className="w-px h-6 bg-foreground" />
        <span className="text-[8px] font-bold tracking-[0.4em] uppercase text-foreground">
          Asisgo Core Sovereign
        </span>
      </div>
    </div>
  );
}

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
  const [userName, setUserName] = useState<string>("User");
  const [userRole, setUserRole] = useState<string>("user");
  const [isEmailSettingsOpen, setIsEmailSettingsOpen] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  useEffect(() => {
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
    } catch (e) {
      console.error("Failed to parse user from local storage", e);
    }
  }, []);

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
  }, [chat.isProcessing, chat.isSidebarOpen]);

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
        const success = await rag.uploadDocuments();
        if (!success) return; // Stop if upload failed

        // Minor sync delay to ensure the backend DB commit/ES refresh is complete
        // before the first query attempts retrieval.
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
    }

    let base64Images: string[] = [];
    if (imageFiles.length > 0) {
      if (chat.selectedModel !== "meta-llama/llama-4-scout-17b-16e-instruct") {
        chat.setSelectedModel("meta-llama/llama-4-scout-17b-16e-instruct");
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
          ? "meta-llama/llama-4-scout-17b-16e-instruct"
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
                onMenuToggle: () => chat.setIsSidebarOpen(!chat.isSidebarOpen) 
              })
            : props.workspaceHeader}

          {/* Chat History */}
          <div className="flex-1 overflow-hidden relative">
            {showWelcome ? (
              <WelcomeScreen
                onPromptClick={handlePromptClick}
                userName={userName}
              />
            ) : (
              <ScrollArea className="h-full">
                <div className="py-10 space-y-2">
                  {chat.chatHistory.map((message, index) => (
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
                  ))}

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
                    />
                  )}

                  {/* Thinking Indicator */}
                  {chat.isProcessing && (
                    <div className="flex flex-col w-full max-w-3xl mx-auto px-1 animate-in fade-in duration-500">
                      <div className="flex items-center gap-3 text-primary/60 mb-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          {chat.streamingContent
                            ? "Streaming..."
                            : "Thinking..."}
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
              </ScrollArea>
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

          {/* Floating Pill Input */}
          <div className="absolute bottom-6 left-0 right-0 px-6 flex justify-center pointer-events-none">
            <div className="w-full max-w-3xl bg-white dark:bg-[var(--surface-container-low)] shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-black/5 dark:border-white/5 rounded-[2rem] p-3 flex flex-col gap-1 pointer-events-auto transition-all duration-300 focus-within:ring-4 focus-within:ring-primary/10 hover:border-border dark:hover:border-white/10 relative">
              
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

              {imageFiles.length > 0 && (
                <div className="px-3 pt-2 pb-1">
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                    {imageFiles.map((file, idx) => (
                      <div
                        key={`img-${file.name}-${idx}`}
                        className="flex items-center gap-2 bg-muted/50 border border-border/50 rounded-xl px-3 py-1.5 text-sm group"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                        <span className="max-w-[150px] truncate text-[11px] font-medium">
                          {file.name}
                        </span>
                        <button
                          onClick={() =>
                            setImageFiles((prev) =>
                              prev.filter((_, i) => i !== idx),
                            )
                          }
                          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {rag.uploadedFiles.length > 0 && (
                <div className="px-3 pt-2 pb-1">
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                    {rag.uploadedFiles.map((file, idx) => (
                      <div
                        key={`${file.name}-${idx}`}
                        className="flex items-center gap-2 bg-muted/50 border border-border/50 rounded-xl px-3 py-1.5 text-sm group"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="max-w-[150px] truncate text-[11px] font-medium">
                          {file.name}
                        </span>
                        <button
                          onClick={() => rag.removeFile(idx)}
                          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Upload Status / Progress */}
                  {rag.isUploading && (
                    <div className="mt-3 flex items-center gap-3 w-full px-1">
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
                    <div className="mt-2 text-[10px] text-destructive flex items-center gap-1 font-medium bg-destructive/10 px-2 py-1 rounded-md w-max">
                      <AlertCircle className="w-3 h-3" /> {rag.uploadError}
                    </div>
                  )}
                  {rag.showUploadSuccess && (
                    <div className="mt-2 text-[10px] text-emerald-500 flex items-center gap-1 font-medium bg-emerald-500/10 px-2 py-1 rounded-md w-max">
                      <CheckCircle className="w-3 h-3" /> {rag.uploadSuccess}
                    </div>
                  )}
                </div>
              )}

              {/* Chat Input */}
              <div className="w-full relative">
                <Textarea
                  ref={chat.textareaRef}
                  placeholder="Message ACS AI Assistant..."
                  value={chat.query}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyPress}
                  className="w-full min-h-[56px] max-h-[250px] py-3.5 pl-4 pr-12 resize-none border-0 focus-visible:ring-0 text-[15px] bg-transparent text-foreground placeholder:text-muted-foreground/40 leading-relaxed shadow-none custom-scrollbar"
                  disabled={chat.isProcessing || rag.isUploading}
                  style={{ overflow: "hidden" }}
                />
                
                {/* Embedded Upload Button */}
                <div className="absolute right-2 top-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={chat.isProcessing || rag.isUploading}
                    className="h-9 w-9 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all rounded-full flex items-center justify-center"
                    title="Upload context file"
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Action Bar */}
              <div className="px-2 pt-1 pb-1 flex items-center justify-between">
                {/* Left Utilities */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 opacity-60 px-1 py-1 cursor-default">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] font-bold text-foreground uppercase tracking-widest hidden sm:inline-block">
                      ACS AI Assistant
                    </span>
                  </div>
                </div>

                {/* Right Utilities */}
                <div className="flex items-center gap-1 sm:gap-2">
                  <Select
                    value={chat.selectedModel}
                    onValueChange={chat.setSelectedModel}
                    disabled={false}
                  >
                    <SelectTrigger className="h-8 min-w-[120px] border-0 text-[11px] hover:bg-muted/40 font-mono bg-transparent shadow-none rounded-xl transition-colors">
                      <SelectValue placeholder="Model" />
                    </SelectTrigger>
                    <SelectContent
                      align="end"
                      className="text-[11px] font-mono rounded-xl border-border/50 shadow-xl backdrop-blur-xl"
                    >
                      {Object.entries(AVAILABLE_MODELS).map(([id, model]) => (
                        <SelectItem key={id} value={id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex gap-1 hidden sm:flex">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={chat.exportToMarkdown}
                      title="Export ke Markdown"
                      className="h-8 w-8 hover:bg-muted/40 text-muted-foreground hover:text-foreground rounded-full transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={chat.copyConversation}
                      title="Copy percakapan"
                      className="h-8 w-8 hover:bg-muted/40 text-muted-foreground hover:text-foreground rounded-full transition-all"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <Button
                    onClick={handleSendMessage}
                    disabled={
                      (!chat.query.trim() &&
                        rag.uploadedFiles.length === 0 &&
                        imageFiles.length === 0) ||
                      chat.isProcessing ||
                      rag.isUploading
                    }
                    className={cn(
                      "h-9 w-9 xl:w-10 xl:h-10 rounded-full text-foreground flex items-center justify-center transition-all ml-1",
                      (chat.query.trim() || rag.uploadedFiles.length > 0 || imageFiles.length > 0)
                        ? "bg-primary text-primary-foreground shadow-md hover:scale-105 active:scale-95"
                        : "bg-muted/40 text-muted-foreground/50 pointer-events-none"
                    )}
                  >
                    {chat.isProcessing || rag.isUploading ? (
                      <RefreshCw className="w-4 h-4 xl:w-5 xl:h-5 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 xl:w-4 xl:h-4 ml-0.5" />
                    )}
                  </Button>
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
    </>
  );
});

AIQueryInput.displayName = "AIQueryInput";
