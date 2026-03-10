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

// Config
import { AVAILABLE_MODELS } from "@/constants/ai-config";
import { ChatMessage } from "@/types/chat";

// ============================================================
// Welcome Screen Component
// ============================================================

const SUGGESTED_PROMPTS = [
  {
    icon: Lightbulb,
    label: "Jelaskan Konsep",
    prompt: "Jelaskan cara kerja sistem RAG dalam asisten AI ini",
  },
  {
    icon: Code,
    label: "Bantu Coding",
    prompt:
      "Bagaimana cara mengamankan API di Node.js dari serangan SQL injection?",
  },
  {
    icon: Brain,
    label: "Analisis Data",
    prompt: "Apa saja langkah efektif untuk menganalisis laporan tahunan PDF?",
  },
  {
    icon: MessageSquare,
    label: "Diskusi Strategis",
    prompt: "Bagaimana tren implementasi AI di Indonesia tahun ini?",
  },
];

function WelcomeScreen({
  onPromptClick,
  userName,
}: {
  onPromptClick: (prompt: string) => void;
  userName: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center max-w-2xl mx-auto px-6 py-10 animate-in fade-in duration-700">
      {/* Compact Header Area */}
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

      {/* Tighter Greeting Section */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-foreground tracking-tight leading-tight">
          Hi, {userName.split(" ")[0]}.
          <br />
          Where should we start?
        </h2>
        <p className="mt-3 text-xs text-muted-foreground/60 max-w-sm mx-auto leading-relaxed">
          Silahkan Ketik pesan untuk memulai analisis dengan ACS AI Assistant.
        </p>
      </div>

      {/* Minimal Footer */}
      <div className="flex flex-col items-center gap-2 opacity-20">
        <div className="w-px h-6 bg-foreground" />
        <span className="text-[8px] font-bold tracking-[0.4em] uppercase">
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
}

export const AIQueryInput = forwardRef<any, AIQueryInputProps>((props, ref) => {
  const chat = useChat({
    onProcessComplete: props.onProcessComplete,
  });

  const rag = useRAG();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userName, setUserName] = useState<string>("User");
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userObj = JSON.parse(userStr);
        if (userObj && userObj.name) {
          setUserName(userObj.name);
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
      if (chat.selectedModel !== "llama-3.2-90b-vision-preview") {
        chat.setSelectedModel("llama-3.2-90b-vision-preview");
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
        base64Images.length > 0 ? "llama-3.2-90b-vision-preview" : undefined,
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
          {props.workspaceHeader}

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
                      <div className="flex items-center gap-3 text-indigo-600/60 mb-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          {chat.streamingContent
                            ? "Streaming..."
                            : "Thinking..."}
                        </span>
                      </div>

                      {/* Processing Steps */}
                      {chat.processingSteps.length > 0 && (
                        <div className="ml-6 space-y-1.5 border-l border-indigo-100 pl-4 py-1">
                          {chat.processingSteps.map((step, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                "text-[11px] flex items-center gap-2",
                                idx === chat.processingSteps.length - 1
                                  ? "text-indigo-600 font-medium animate-pulse"
                                  : "text-muted-foreground/60",
                              )}
                            >
                              <div
                                className={cn(
                                  "w-1 h-1 rounded-full",
                                  idx === chat.processingSteps.length - 1
                                    ? "bg-indigo-600"
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
                className="pointer-events-auto gap-2 rounded-full bg-card/90 backdrop-blur-sm shadow-lg border-border/80 hover:bg-muted transition-all"
              >
                <Square className="w-3 h-3 fill-current" />
                <span className="text-xs font-medium">Hentikan Generasi</span>
              </Button>
            </div>
          )}

          {/* Floating Pill Input */}
          <div className="absolute bottom-6 left-0 right-0 px-6 flex justify-center pointer-events-none">
            <div className="w-full max-w-3xl bg-card border border-border/80 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-[2.5rem] p-2 flex flex-col gap-2 pointer-events-auto backdrop-blur-md">
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
                <div className="px-4 pt-3 pb-1">
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                    {imageFiles.map((file, idx) => (
                      <div
                        key={`img-${file.name}-${idx}`}
                        className="flex items-center gap-2 bg-muted/50 border border-border/50 rounded-full px-3 py-1 text-sm group"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                        <span className="max-w-[150px] truncate text-xs font-medium">
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
                <div className="px-4 pt-3 pb-1">
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                    {rag.uploadedFiles.map((file, idx) => (
                      <div
                        key={`${file.name}-${idx}`}
                        className="flex items-center gap-2 bg-muted/50 border border-border/50 rounded-full px-3 py-1 text-sm group"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="max-w-[150px] truncate text-xs font-medium">
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
                    <div className="mt-3 flex items-center gap-3 w-full">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        Mengupload... {rag.uploadProgress}%
                      </span>
                      <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 transition-all duration-300"
                          style={{ width: `${rag.uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {rag.uploadError && (
                    <div className="mt-2 text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {rag.uploadError}
                    </div>
                  )}
                  {rag.showUploadSuccess && (
                    <div className="mt-2 text-xs text-green-500 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> {rag.uploadSuccess}
                    </div>
                  )}
                </div>
              )}

              {/* Chat Input */}
              <div className="flex items-end gap-2 px-2">
                <Textarea
                  ref={chat.textareaRef}
                  placeholder="Message ACS AI Assistant..."
                  value={chat.query}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyPress}
                  className="flex-1 min-h-[50px] max-h-[200px] py-3.5 resize-none border-0 focus-visible:ring-0 text-sm bg-transparent placeholder:text-muted-foreground/40"
                  disabled={chat.isProcessing || rag.isUploading}
                  style={{ overflow: "hidden" }}
                />
                <div className="flex items-center gap-1 mb-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={chat.isProcessing || rag.isUploading}
                    className="h-9 w-9 bg-[#33345c]/5 border border-[#33345c]/10 text-[#33345c] hover:bg-[#33345c]/15 hover:scale-105 active:scale-95 transition-all rounded-full"
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={handleSendMessage}
                    disabled={
                      (!chat.query.trim() &&
                        rag.uploadedFiles.length === 0 &&
                        imageFiles.length === 0) ||
                      chat.isProcessing ||
                      rag.isUploading
                    }
                    className="h-9 w-9 rounded-full bg-[#33345c] text-white hover:bg-[#33345c]/95 hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-[#33345c]/20"
                  >
                    {chat.isProcessing || rag.isUploading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="px-3 pb-1 flex items-center justify-between border-t border-border/5 flex-shrink-0">
                <div className="flex items-center gap-2 cursor-default">
                  <span className="text-[10px] font-medium text-muted-foreground/40">
                    ACS AI Assistant
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Select
                    value={chat.selectedModel}
                    onValueChange={chat.setSelectedModel}
                    disabled={false}
                  >
                    <SelectTrigger className="h-6 w-auto min-w-[100px] text-[8px] border-muted-foreground/20 text-muted-foreground/70 font-mono bg-transparent">
                      <SelectValue placeholder="Pilih Model" />
                    </SelectTrigger>
                    <SelectContent
                      align="end"
                      className="text-[10px] font-mono"
                    >
                      {Object.entries(AVAILABLE_MODELS).map(([id, model]) => (
                        <SelectItem key={id} value={id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={chat.exportToMarkdown}
                    title="Export ke Markdown"
                    className="h-6 w-6 bg-[#33345c]/5 border border-[#33345c]/10 text-[#33345c] hover:bg-[#33345c]/15 hover:scale-105 active:scale-95 transition-all"
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={chat.copyConversation}
                    title="Copy percakapan"
                    className="h-6 w-6 bg-[#33345c]/5 border border-[#33345c]/10 text-[#33345c] hover:bg-[#33345c]/15 hover:scale-105 active:scale-95 transition-all"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

AIQueryInput.displayName = "AIQueryInput";
