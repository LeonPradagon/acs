import React, { useState } from "react";
import { Search, FileText, Globe, ExternalLink, Network } from "lucide-react";
import { Source } from "@/types/chat";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarkdownText } from "./markdown-text";
import { cn } from "@/lib/utils";

interface SourceListProps {
  sources: Source[];
}

/**
 * Component to display a list of source references as modern cards with Citation Preview
 */
export const SourceList = ({ sources }: SourceListProps) => {
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);

  if (!sources || sources.length === 0) return null;

  // Deduplicate sources by ID or URL/Source name to avoid clutter
  const uniqueSources = Array.from(new Map(sources.map(s => [s.metadata?.url || s.metadata?.source || s.id, s])).values());

  const getSourceIcon = (source: Source) => {
    if (source.metadata?.type === "web") {
      try {
        const url = new URL(source.metadata.url || "");
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={`https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`} 
            alt="favicon" 
            className="w-3.5 h-3.5 rounded-sm object-contain bg-white"
          />
        );
      } catch (e) {
        return <Globe className="w-3.5 h-3.5 text-blue-500" />;
      }
    }
    if (source.metadata?.type === "knowledge_graph" || source.metadata?.source === "Knowledge Graph") {
      return <Network className="w-3.5 h-3.5 text-purple-500" />;
    }
    return <FileText className="w-3.5 h-3.5 text-indigo-500" />;
  };

  const getSourceDomain = (source: Source) => {
    if (source.metadata?.type === "web" && source.metadata?.url) {
      try {
        return new URL(source.metadata.url).hostname.replace('www.', '');
      } catch (e) {
        return "Web Search";
      }
    }
    if (source.metadata?.type === "knowledge_graph" || source.metadata?.source === "Knowledge Graph") {
      return "Knowledge Graph";
    }
    return "Internal Document";
  };

  return (
    <>
      <div className="space-y-3 mt-5 border-t border-border/40 pt-4">
        <div className="flex items-center gap-2 mb-1">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Sumber Referensi ({uniqueSources.length})
          </span>
        </div>
        
        {/* Horizontal scroll container for source cards */}
        <div className="flex overflow-x-auto gap-3 pb-2 -mx-1 px-1 custom-scrollbar snap-x">
          {uniqueSources.map((source) => (
            <div
              key={source.id}
              onClick={() => setSelectedSource(source)}
              className={cn(
                "group relative flex flex-col gap-1 min-w-[200px] max-w-[240px] p-3 rounded-xl border cursor-pointer snap-start transition-all",
                "bg-[var(--surface-container-highest)] hover:bg-[var(--surface-variant)] border-border/50 hover:border-primary/30",
                "shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_15px_rgba(0,0,0,0.05)]"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <div className="flex items-center justify-center w-5 h-5 rounded bg-background shadow-sm shrink-0">
                    {getSourceIcon(source)}
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground truncate">
                    {getSourceDomain(source)}
                  </span>
                </div>
                {source.score && (
                  <span className="text-[9px] font-mono font-medium text-muted-foreground/60 shrink-0">
                    {Math.round(source.score * 100)}%
                  </span>
                )}
              </div>
              
              <div className="text-xs font-semibold text-foreground line-clamp-2 mt-1 leading-snug">
                {source.metadata?.source || "Referensi Tanpa Judul"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Dialog for Citation Preview */}
      <Dialog open={!!selectedSource} onOpenChange={(open) => !open && setSelectedSource(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-background border-border shadow-2xl">
          <DialogHeader className="p-5 pb-4 border-b border-border/40 bg-[var(--surface-container-highest)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1.5 w-full">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-7 h-7 rounded-md bg-background shadow-sm shrink-0">
                    {selectedSource && getSourceIcon(selectedSource)}
                  </div>
                  <DialogTitle className="text-base sm:text-lg leading-tight font-semibold line-clamp-2">
                    {selectedSource?.metadata?.source || "Dokumen Referensi"}
                  </DialogTitle>
                </div>
                
                <DialogDescription className="flex items-center gap-2 flex-wrap mt-1">
                  {selectedSource?.metadata?.url ? (
                    <a 
                      href={selectedSource.metadata.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:text-blue-600 hover:underline flex items-center gap-1"
                    >
                      Buka Tautan
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <>
                      {selectedSource?.metadata?.heading && (
                        <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                          Bagian: {selectedSource.metadata.heading}
                        </span>
                      )}
                      {selectedSource?.metadata?.pageNumber && (
                        <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                          Hal. {selectedSource.metadata.pageNumber}
                        </span>
                      )}
                    </>
                  )}
                  {selectedSource?.score && (
                    <span className="text-xs font-mono font-medium text-muted-foreground/70">
                      Relevansi: {Math.round(selectedSource.score * 100)}%
                    </span>
                  )}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <ScrollArea className="flex-1 p-5">
            <div className="max-w-none">
              {selectedSource?.metadata?.highlight && (
                <div className="mb-5 p-4 bg-primary/5 border-l-4 border-primary rounded-r-lg text-sm italic text-foreground/80">
                  &quot;{selectedSource.metadata.highlight}&quot;
                </div>
              )}
              {selectedSource?.content ? (
                <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed max-w-none">
                  <MarkdownText text={selectedSource.content} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-3">
                  <FileText className="w-10 h-10 opacity-20" />
                  <p className="text-sm italic">Konten detail tidak tersedia untuk referensi ini.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
