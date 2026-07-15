import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
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
  Brain,
  Loader2,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { DownloadAttachmentCard } from "../ui/download-attachment-card";
import { AVAILABLE_MODELS } from "@/constants/ai-config";
import { AgentProgressViewer } from "./agent-progress";
import { ApprovalActionCard } from "./approval-card";

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
  isProcessing = false,
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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

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
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 2000);
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
        "flex flex-col w-full max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 mb-12 group/msg",
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
            "w-10 h-10 flex items-center justify-center rounded-[14px] flex-shrink-0 mt-0.5 transition-all duration-500 overflow-hidden shadow-sm",
            isAssistant
              ? "bg-white/80 dark:bg-[var(--surface-container-lowest)] border border-border/50 p-1 rounded-full dark:shadow-[0_0_15px_rgba(255,145,89,0.1)]"
              : "bg-gradient-to-br from-primary/80 to-primary text-primary-foreground shadow-[0_4px_10px_rgba(255,145,89,0.2)]",
          )}
        >
          {isAssistant ? (
            <Image
              src="/images/Asisgo.png"
              alt="AI"
              width={40}
              height={40}
              className="w-full h-full object-contain drop-shadow-sm scale-110"
            />
          ) : (
            <User className="w-5 h-5 text-white" />
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
                : "justify-start text-primary/80",
            )}
          >
            <span>{isAssistant ? "ACS AI Assistant" : userName}</span>
            {isAssistant && message.usedMemory && (
              <div className="group relative flex items-center">
                <Brain className="w-3.5 h-3.5 text-purple-400 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block w-max bg-black/80 text-white text-[10px] px-2 py-1 rounded shadow-lg z-50 normal-case tracking-normal">
                  Jawaban disesuaikan dengan preferensi Anda
                </div>
              </div>
            )}
            <span className="opacity-30">•</span>
            <div className="flex items-center gap-1.5 font-mono opacity-60">
              <Clock className="w-2.5 h-2.5" />
              {message.timestamp instanceof Date
                ? message.timestamp.toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Just now"}
              
              {/* Confidence Score Badge */}
              {isAssistant && message.confidence && (
                <div className="ml-2 flex items-center gap-1 opacity-100">
                  {message.confidence.level === "HIGH" ? (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200 gap-1 px-1.5 py-0 h-4 text-[9px] cursor-default">
                      <Check className="w-2.5 h-2.5" /> High Confidence
                    </Badge>
                  ) : message.confidence.level === "MEDIUM" ? (
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-200 gap-1 px-1.5 py-0 h-4 text-[9px] cursor-default">
                      <AlertCircle className="w-2.5 h-2.5" /> Medium Confidence
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200 gap-1 px-1.5 py-0 h-4 text-[9px] cursor-default">
                      <XCircle className="w-2.5 h-2.5" /> Low Confidence
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Message Content Area */}
          <div
            className={cn(
              "text-[15px] leading-[1.7] text-foreground font-light tracking-tight",
              isAssistant
                ? "bg-transparent py-1"
                : "inline-block text-left w-fit max-w-full bg-[var(--surface-container-highest)] dark:bg-[var(--surface-variant)] py-3 px-5 rounded-[1.5rem] rounded-tr-sm shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)]",
            )}
          >
            {isEditing ? (
              /* Edit Mode */
              <div className="space-y-2 min-w-[250px] sm:min-w-[350px]">
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
                    className="h-7 text-xs bg-primary hover:bg-primary/80 text-primary-foreground"
                  >
                    Kirim Ulang
                  </Button>
                </div>
              </div>
            ) : isAssistant ? (
              <div className="prose prose-purple prose-sm max-w-none dark:prose-invert">
                {message.agentSteps && <AgentProgressViewer steps={message.agentSteps} />}
                
                {isProcessing && (!message.content || message.content === "") ? (
                  <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground bg-[var(--surface-variant)]/50 px-3 py-1.5 rounded-full w-max">
                    <span className="animate-spin w-3 h-3 border-2 border-primary border-t-transparent rounded-full"></span>
                    Analyzing...
                  </div>
                ) : (
                  <MessageContentRouter message={message} isProcessing={isProcessing} />
                )}

                {message.pendingAction && (
                  <ApprovalActionCard 
                    actionId={message.pendingAction.id} 
                    summary={message.pendingAction.summary} 
                    initialStatus={message.pendingAction.status} 
                  />
                )}
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
                {message.images && message.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {message.images.map((imgBase64, idx) => (
                      <div
                        key={idx}
                        className="relative w-32 h-32 rounded-lg overflow-hidden border border-border/50 shadow-sm cursor-pointer group bg-black/5"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imgBase64}
                          alt={`Uploaded attachment ${idx}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
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
              {message.confidence && (
                <div className="flex items-center gap-1">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    message.confidence.level === "HIGH" ? "bg-green-500" :
                    message.confidence.level === "MEDIUM" ? "bg-yellow-500" : "bg-red-500"
                  )} />
                  <span className="font-mono">{Math.round(message.confidence.overall * 100)}% Confidence</span>
                </div>
              )}
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
 * Strip <EXPORT_DATA>...</EXPORT_DATA> blocks from displayed content
 */
const cleanExportBlocks = (text: string) =>
  text.replace(/<EXPORT_DATA>[\s\S]*?<\/EXPORT_DATA>/g, "").trim();

/**
 * Render attachment download cards if message has attachments
 */
const AttachmentCards = ({ message }: { message: ChatMessage }) => {
  if (!message.attachments || message.attachments.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      {message.attachments.map((att, idx) => (
        <DownloadAttachmentCard
          key={`${att.filename}-${idx}`}
          format={att.format}
          filename={att.filename}
          base64Payload={att.payload}
        />
      ))}
    </div>
  );
};

const ThinkingBlock = ({ thinkContent, isThinkingComplete }: { thinkContent: string, isThinkingComplete: boolean }) => {
  const [isOpen, setIsOpen] = useState(!isThinkingComplete);
  
  // Auto-close when thinking is complete
  useEffect(() => {
    if (isThinkingComplete) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
    }
  }, [isThinkingComplete]);

  if (!thinkContent) return null;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="w-full mb-4 bg-[var(--surface-variant)]/20 border border-border/40 rounded-xl overflow-hidden transition-all duration-300"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between p-3 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          {isThinkingComplete ? (
            <Brain className="w-4 h-4 text-blue-500/70" />
          ) : (
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          )}
          <span className={isThinkingComplete ? "text-foreground/70" : "text-blue-500 font-semibold"}>
            {isThinkingComplete ? "Thinking Process" : "Thinking..."}
          </span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 opacity-50" /> : <ChevronDown className="w-4 h-4 opacity-50" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="p-4 pt-1 border-t border-border/30 bg-background/30 text-xs font-mono text-muted-foreground">
        <MarkdownText text={thinkContent} />
      </CollapsibleContent>
    </Collapsible>
  );
};

/**
 * Internal component to route different types of assistant content
 */
const MessageContentRouter = ({ message, isProcessing }: { message: ChatMessage; isProcessing?: boolean }) => {
  const hasSources = message.sources && message.sources.length > 0;
  const hasVisualization = message.analysis_results || message.visualization;
  const hasOntology = message.ontology_data;
  const hasAttachments = message.attachments && message.attachments.length > 0;
  const queryType = message.enhanced_metadata?.query_type;
  const displayContentRaw = cleanExportBlocks(message.content);
  
  let thinkContent = "";
  let displayContent = displayContentRaw;
  let isThinkingComplete = false;
  
  // Extract completed think blocks
  const thinkMatch = displayContent.match(/<think>([\s\S]*?)<\/think>/);
  if (thinkMatch) {
    thinkContent = thinkMatch[1].trim();
    displayContent = displayContent.replace(/<think>[\s\S]*?<\/think>/, "").trim();
    isThinkingComplete = true;
  } else if (displayContent.includes("<think>")) {
    // Extract streaming/incomplete think blocks
    const parts = displayContent.split("<think>");
    displayContent = parts[0].trim();
    thinkContent = parts[1].trim();
    isThinkingComplete = false;
  }

  if (hasOntology) {
    return (
      <div className="space-y-6">
        <OntologyAnalysisContent message={message} />
        {hasAttachments && <AttachmentCards message={message} />}
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
          {hasAttachments && <AttachmentCards message={message} />}
          <MessageMetadata message={message} />
          {hasSources && <SourceList sources={message.sources!} />}
        </div>
      );
    case "text_response":
      return (
        <div className="space-y-6">
          <ThinkingBlock thinkContent={thinkContent} isThinkingComplete={isThinkingComplete} />
          
          {isProcessing && !displayContent && (isThinkingComplete || !thinkContent) ? (
            <div className="flex items-center gap-2 font-semibold text-primary py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Menyusun jawaban...</span>
            </div>
          ) : (
            displayContent && <MarkdownText text={displayContent} />
          )}
          {hasAttachments && <AttachmentCards message={message} />}
          <MessageMetadata message={message} />
          {hasSources && <SourceList sources={message.sources!} />}
        </div>
      );
    default:
      return (
        <div className="space-y-6">
          <ThinkingBlock thinkContent={thinkContent} isThinkingComplete={isThinkingComplete} />
          {hasVisualization && <VisualAnalysisContent message={message} />}
          
          {isProcessing && !displayContent && (isThinkingComplete || !thinkContent) ? (
            <div className="flex items-center gap-2 font-semibold text-primary py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Menyusun jawaban...</span>
            </div>
          ) : (
            displayContent && <MarkdownText text={displayContent} />
          )}
          {hasAttachments && <AttachmentCards message={message} />}
          <MessageMetadata message={message} />
          {hasSources && <SourceList sources={message.sources!} />}
        </div>
      );
  }
};
