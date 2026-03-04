import React from "react";
import { Bot, User, Clock, Shield, Lock, Filter, Verified } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ChatMessage } from "@/types/chat";
import { MarkdownText } from "./markdown-text";
import { SourceList } from "./source-list";
import {
  VisualAnalysisContent,
  OntologyAnalysisContent,
} from "./visualization-panel";
import { MessageMetadata } from "./message-metadata";
import { AVAILABLE_MODELS, CLASSIFICATION_LEVELS } from "@/constants/ai-config";

interface ChatMessageViewProps {
  message: ChatMessage;
  isProcessing?: boolean;
}

/**
 * Helpers for chat message styling
 */
const getModelDisplayName = (model: string): string => {
  return (
    AVAILABLE_MODELS[model as keyof typeof AVAILABLE_MODELS]?.name || model
  );
};

const getModelColor = (model: string): string => {
  return (
    AVAILABLE_MODELS[model as keyof typeof AVAILABLE_MODELS]?.color ||
    "bg-gray-100 text-gray-700 border-gray-200"
  );
};

/**
 * Main component to display a single chat message (user or assistant)
 */
export const ChatMessageView = ({ message }: ChatMessageViewProps) => {
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={cn(
        "flex flex-col w-full max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 mb-10",
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
            "w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 mt-0.5 shadow-sm transition-all duration-300",
            isAssistant
              ? "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white"
              : "bg-muted text-muted-foreground border border-border/40",
          )}
        >
          {isAssistant ? (
            <Bot className="w-5 h-5" />
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
            <span>
              {isAssistant ? "ACS AI Assistant" : "User Intelligence"}
            </span>
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
            {isAssistant ? (
              <div className="prose prose-purple prose-sm max-w-none dark:prose-invert">
                <MessageContentRouter message={message} />
              </div>
            ) : (
              <MarkdownText text={message.content} />
            )}
          </div>

          {/* Assistant Visual Meta */}
          {isAssistant && message.modelUsed && (
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border/20 text-[10px] font-medium text-muted-foreground/40">
              <div className="flex items-center gap-1">
                <Badge
                  variant="outline"
                  className="text-[9px] h-4 py-0 px-1 border-muted-foreground/20 font-mono"
                >
                  {getModelDisplayName(message.modelUsed)}
                </Badge>
              </div>
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

  // Ontology Case
  if (hasOntology) {
    return (
      <div className="space-y-6">
        <OntologyAnalysisContent message={message} />
        <MessageMetadata message={message} />
        {hasSources && <SourceList sources={message.sources!} />}
      </div>
    );
  }

  // Routing by query type
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
