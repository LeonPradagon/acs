import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  User,
  Clock,
  Copy,
  Check,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Pencil,
  X,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChatMessage } from "@/types/chat";
import { MarkdownText } from "./markdown-text";
import { SourceList } from "./source-list";
import {
  VisualAnalysisContent,
  OntologyAnalysisContent,
} from "./visualization-panel";
import { MessageMetadata } from "./message-metadata";
import { AVAILABLE_MODELS } from "@/constants/ai-config";

interface ChatMessageViewProps {
  message: ChatMessage;
  messageIndex?: number;
  isProcessing?: boolean;
  onRegenerate?: () => void;
  onFeedback?: (
    messageId: string,
    rating: "thumbs_up" | "thumbs_down",
  ) => Promise<boolean>;
  onEditAndResubmit?: (index: number, newContent: string) => void;
  userName?: string;
}

const getModelDisplayName = (model: string): string => {
  return (
    AVAILABLE_MODELS[model as keyof typeof AVAILABLE_MODELS]?.name || model
  );
};

export const ChatMessageView = ({
  message,
  messageIndex,
  onRegenerate,
  onFeedback,
  onEditAndResubmit,
  userName = "User",
}: ChatMessageViewProps) => {
  const isAssistant = message.role === "assistant";
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [feedbackState, setFeedbackState] = useState<
    "none" | "thumbs_up" | "thumbs_down"
  >("none");

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const editRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      // Auto-resize
      editRef.current.style.height = "auto";
      editRef.current.style.height = editRef.current.scrollHeight + "px";
    }
  }, [isEditing]);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = async (rating: "thumbs_up" | "thumbs_down") => {
    if (!onFeedback) return;
    const success = await onFeedback(message.id, rating);
    if (success) {
      setFeedbackState(rating);
    }
  };

  const startEditing = () => {
    setEditContent(message.content);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const confirmEdit = () => {
    if (editContent.trim() && onEditAndResubmit && messageIndex !== undefined) {
      onEditAndResubmit(messageIndex, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      confirmEdit();
    }
    if (e.key === "Escape") {
      cancelEditing();
    }
  };

  const canEdit =
    isUser &&
    message.id !== "welcome" &&
    message.id !== "cleared" &&
    onEditAndResubmit &&
    messageIndex !== undefined;

  return (
    <div
      className={cn(
        "flex flex-col w-full max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 mb-10 group/msg",
        message.role === "user" ? "items-end" : "items-start",
      )}
    >
      <div
        className={cn(
          "flex items-start gap-4 w-full",
          message.role === "user" ? "flex-row-reverse" : "flex-row",
        )}
      >
        <div
          className={cn(
            "w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 mt-0.5 transition-all duration-300 overflow-hidden",
            isAssistant
              ? "bg-transparent"
              : "bg-muted text-muted-foreground border border-border/40 shadow-sm",
          )}
        >
          {isAssistant ? (
            <img
              src="/images/Asisgo.png"
              alt="AI"
              className="w-full h-full object-contain"
            />
          ) : (
            <User className="w-5 h-5" />
          )}
        </div>

        <div
          className={cn(
            "flex-1 space-y-2.5 min-w-0 px-1",
            message.role === "user" ? "text-right" : "text-left",
          )}
        >
          {/* Metadata */}
          <div
            className={cn(
              "flex items-center gap-2.5 text-[10px] uppercase font-bold tracking-[0.1em]",
              message.role === "user"
                ? "justify-end text-muted-foreground/60"
                : "justify-start text-indigo-600/80",
            )}
          >
            <span>{isAssistant ? "ACS AI Assistant" : userName}</span>
            <span className="opacity-30">•</span>
            <div className="flex items-center gap-1.5 font-mono opacity-60">
              <Clock className="w-2.5 h-2.5" />
              {message.timestamp instanceof Date
                ? message.timestamp.toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Just now"}
            </div>
          </div>

          {/* Message Content Area */}
          <div
            className={cn(
              "text-[15px] leading-[1.7] text-foreground font-light tracking-tight",
              isAssistant
                ? "bg-transparent"
                : "bg-card border border-border/50 p-4 rounded-2xl rounded-tr-none shadow-sm",
            )}
          >
            {isEditing ? (
              /* Edit Mode */
              <div className="space-y-2">
                <Textarea
                  ref={editRef}
                  value={editContent}
                  onChange={(e) => {
                    setEditContent(e.target.value);
                    // Auto-resize
                    e.target.style.height = "auto";
                    e.target.style.height = e.target.scrollHeight + "px";
                  }}
                  onKeyDown={handleEditKeyDown}
                  className="min-h-[60px] resize-none text-sm bg-background border-border focus-visible:ring-1 focus-visible:ring-indigo-500"
                />
                <div className="flex items-center gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelEditing}
                    className="h-7 text-xs text-muted-foreground"
                  >
                    Batal
                  </Button>
                  <Button
                    size="sm"
                    onClick={confirmEdit}
                    disabled={!editContent.trim()}
                    className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Kirim Ulang
                  </Button>
                </div>
              </div>
            ) : isAssistant ? (
              <div className="prose prose-purple prose-sm max-w-none dark:prose-invert">
                <MessageContentRouter message={message} />
              </div>
            ) : (
              <div className="space-y-3">
                <MarkdownText text={message.content} />
                {message.files && message.files.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {message.files.map((file, idx) => (
                      <div
                        key={`${file.name}-${idx}`}
                        className="flex items-center gap-2 bg-muted/50 border border-border/50 rounded-xl px-3 py-2 text-sm hover:bg-muted/80 transition-colors shadow-sm"
                      >
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-indigo-500" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="max-w-[150px] truncate text-xs font-semibold">
                            {file.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Edit Button */}
          {canEdit && !isEditing && (
            <div className="flex items-center gap-1 mt-1 justify-end">
              <Button
                variant="ghost"
                size="icon"
                onClick={startEditing}
                className="h-7 w-7 text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted/50 rounded-lg transition-all opacity-0 group-hover/msg:opacity-100"
                title="Edit pesan"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {/* Assistant Action Bar */}
          {isAssistant &&
            message.id !== "welcome" &&
            message.id !== "cleared" &&
            message.id !== "streaming" && (
              <div className="flex items-center gap-1 mt-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopyMessage}
                  className="h-7 w-7 bg-[#33345c]/5 border border-[#33345c]/10 text-[#33345c] hover:bg-[#33345c]/15 hover:scale-105 active:scale-95 rounded-lg transition-all"
                  title="Copy"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </Button>

                {onRegenerate && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onRegenerate}
                    className="h-7 w-7 text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted/50 rounded-lg transition-all"
                    title="Regenerate"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                )}

                {onFeedback && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleFeedback("thumbs_up")}
                      className={cn(
                        "h-7 w-7 rounded-lg transition-all",
                        feedbackState === "thumbs_up"
                          ? "text-green-500 bg-green-500/10"
                          : "text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted/50",
                      )}
                      title="Jawaban bagus"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleFeedback("thumbs_down")}
                      className={cn(
                        "h-7 w-7 rounded-lg transition-all",
                        feedbackState === "thumbs_down"
                          ? "text-red-500 bg-red-500/10"
                          : "text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted/50",
                      )}
                      title="Jawaban kurang bagus"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </div>
            )}

          {/* Assistant Visual Meta */}
          {isAssistant && message.modelUsed && (
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border/20 text-[10px] font-medium text-muted-foreground/40">
              <Badge
                variant="outline"
                className="text-[9px] h-4 py-0 px-1 border-muted-foreground/20 font-mono"
              >
                {getModelDisplayName(message.modelUsed)}
              </Badge>
              {message.processingTime && (
                <span className="font-mono">
                  {message.processingTime}ms processing time
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Internal component to route different types of assistant content
 */
const MessageContentRouter = ({ message }: { message: ChatMessage }) => {
  const hasSources = message.sources && message.sources.length > 0;
  const hasVisualization = message.analysis_results || message.visualization;
  const hasOntology = message.ontology_data;
  const queryType = message.enhanced_metadata?.query_type;

  if (hasOntology) {
    return (
      <div className="space-y-6">
        <OntologyAnalysisContent message={message} />
        <MessageMetadata message={message} />
        {hasSources && <SourceList sources={message.sources!} />}
      </div>
    );
  }

  switch (queryType) {
    case "visual_analysis":
      return (
        <div className="space-y-6">
          {hasVisualization && <VisualAnalysisContent message={message} />}
          <MessageMetadata message={message} />
          {hasSources && <SourceList sources={message.sources!} />}
        </div>
      );
    case "text_response":
      return (
        <div className="space-y-6">
          <MarkdownText text={message.content} />
          <MessageMetadata message={message} />
          {hasSources && <SourceList sources={message.sources!} />}
        </div>
      );
    default:
      return (
        <div className="space-y-6">
          {hasVisualization && <VisualAnalysisContent message={message} />}
          <MarkdownText text={message.content} />
          <MessageMetadata message={message} />
          {hasSources && <SourceList sources={message.sources!} />}
        </div>
      );
  }
};
