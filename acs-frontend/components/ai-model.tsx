"use client";

import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  Brain,
  Send,
  RefreshCw,
  Trash2,
  Copy,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Custom Hooks
import { useChat } from "@/hooks/useChat";
import { useRAG } from "@/hooks/useRAG";

// Sub-components
import { ChatMessageView } from "./chat/chat-message-view";
import { DocumentUploadModal } from "./workspace/DocumentUploadModal";
import { ChatSidebar } from "./workspace/chat-sidebar";

// Config
import { AVAILABLE_MODELS } from "@/constants/ai-config";
import { ChatMessage } from "@/types/chat";

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

  const [selectedModel] = useState<string>("openai/gpt-oss-120b");

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    setQuery: (newQuery: string) => {
      chat.setQuery(newQuery);
    },
  }));

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      chat.handleProcess(chat.query, "universal", "universal", "auto", {});
    }
  };

  const getModelDisplayName = (model: string): string => {
    return (
      AVAILABLE_MODELS[model as keyof typeof AVAILABLE_MODELS]?.name || model
    );
  };

  return (
    <>
      <div className="flex h-full w-full overflow-hidden">
        {/* Chat Sidebar */}
        <ChatSidebar
          sessions={chat.sessions}
          currentSessionId={chat.currentSessionId}
          isOpen={chat.isSidebarOpen}
          onToggle={() => chat.setIsSidebarOpen(!chat.isSidebarOpen)}
          onNewSession={chat.handleNewSession}
          onSelectSession={chat.handleSelectSession}
          onDeleteSession={chat.handleDeleteSession}
        />

        {/* Main Chat Area */}
        <div className="flex flex-col flex-1 h-full bg-background relative min-w-0">
          {/* Inject Global Workspace Header here so Sidebar can take full height on the left */}
          {props.workspaceHeader}

          {/* Chat History */}
          <div className="flex-1 overflow-hidden relative">
            <ScrollArea className="h-full">
              <div className="py-10 space-y-2">
                {chat.chatHistory.map((message) => (
                  <ChatMessageView key={message.id} message={message} />
                ))}

                {/* Streaming — shows tokens as they arrive */}
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

                {/* Loading indicator before streaming starts */}
                {chat.isProcessing && !chat.streamingContent && (
                  <div className="flex flex-col w-full max-w-3xl mx-auto px-1 animate-in fade-in duration-500">
                    <div className="flex items-center gap-3 text-indigo-600/60 mb-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        Thinking...
                      </span>
                    </div>
                    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>
                  </div>
                )}
                <div ref={chat.messagesEndRef} className="h-40" />
              </div>
            </ScrollArea>
          </div>

          {/* Floating Pill Input */}
          <div className="absolute bottom-6 left-0 right-0 px-6 flex justify-center pointer-events-none">
            <div className="w-full max-w-3xl bg-card border border-border/80 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-[2.5rem] p-2 flex flex-col gap-2 pointer-events-auto backdrop-blur-md">
              <div className="flex items-end gap-2 px-2">
                <Textarea
                  ref={chat.textareaRef}
                  placeholder="Message ACS AI Assistant..."
                  value={chat.query}
                  onChange={(e) => chat.setQuery(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="flex-1 min-h-[50px] max-h-[200px] py-3.5 resize-none border-0 focus-visible:ring-0 text-sm bg-transparent placeholder:text-muted-foreground/40"
                  disabled={chat.isProcessing}
                />
                <div className="flex items-center gap-1 mb-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => rag.setShowUploadModal(true)}
                    disabled={chat.isProcessing}
                    className="h-9 w-9 text-muted-foreground/40 hover:bg-muted rounded-full"
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() =>
                      chat.handleProcess(
                        chat.query,
                        "universal",
                        "universal",
                        "auto",
                        {},
                      )
                    }
                    disabled={!chat.query.trim() || chat.isProcessing}
                    className="h-9 w-9 rounded-full bg-foreground text-background hover:opacity-90 transition-all flex items-center justify-center shadow-lg"
                  >
                    {chat.isProcessing ? (
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
                  <Badge
                    variant="outline"
                    className="text-[8px] h-4 border-muted-foreground/10 text-muted-foreground/40 font-mono"
                  >
                    {getModelDisplayName(selectedModel)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={chat.copyConversation}
                    className="h-6 w-6 text-muted-foreground/20 hover:text-muted-foreground"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shared Upload Modal — no more duplication */}
      <DocumentUploadModal
        isOpen={rag.showUploadModal}
        onClose={() => rag.setShowUploadModal(false)}
      />
    </>
  );
});

AIQueryInput.displayName = "AIQueryInput";
