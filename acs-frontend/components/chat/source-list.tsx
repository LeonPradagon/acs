import React from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Source } from "@/types/chat";

interface SourceListProps {
  sources: Source[];
}

/**
 * Component to display a list of source references as badges
 */
export const SourceList = ({ sources }: SourceListProps) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="space-y-2 mt-4">
      <div className="flex items-center gap-2">
        <Search className="w-3 h-3 text-blue-500" />
        <span className="text-xs font-medium text-blue-700">
          Sumber Referensi ({sources.length})
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {sources.map((source) => (
          <Badge
            key={source.id}
            variant="secondary"
            className="text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 cursor-pointer"
            title={`${source.metadata?.source || "Unknown"} - ${source.content?.substring(0, 100)}...`}
          >
            {source.metadata?.source || "Source"}
            {source.score && (
              <span className="text-xs opacity-70 ml-1">
                ({Math.round(source.score * 100)}%)
              </span>
            )}
          </Badge>
        ))}
      </div>
    </div>
  );
};
