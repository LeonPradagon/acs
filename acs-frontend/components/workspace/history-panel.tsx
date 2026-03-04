import React from "react";
import { MODE_CONFIG } from "@/constants/ai-config";

interface HistoryItem {
  id: string;
  query: string;
  response: string;
  mode: string;
  persona: string;
  model: string;
  timestamp: Date;
}

interface HistoryPanelProps {
  history: HistoryItem[];
  onItemClick: (query: string) => void;
}

/**
 * Component to display the recent analysis history
 */
export const HistoryPanel = ({ history, onItemClick }: HistoryPanelProps) => {
  if (history.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <span className="w-1.5 h-6 bg-purple-600 rounded-full"></span>
        Recent Analysis History
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {history.map((item) => (
          <div
            key={item.id}
            className="p-4 border rounded-xl bg-card hover:border-purple-300 transition-all cursor-pointer shadow-sm group"
            onClick={() => onItemClick(item.query)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                {MODE_CONFIG[item.mode as keyof typeof MODE_CONFIG]?.name ||
                  item.mode}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(item.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-sm font-semibold truncate group-hover:text-purple-600 transition-colors">
              {item.query}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
