import React from "react";
import { Network } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ChatMessage } from "@/types/chat";

interface MessageMetadataProps {
  message: ChatMessage;
}

/**
 * Component to display advanced AI metadata, processing steps, and intent analysis reasoning
 */
export const MessageMetadata = ({ message }: MessageMetadataProps) => {
  if (!message.enhanced_metadata && !message.visualization?.intent_analysis)
    return null;

  return (
    <div className="space-y-3 mt-3">
      {/* Advanced Visual Metadata */}
      {message.enhanced_metadata?.analysis_type ===
        "social_network_analysis" && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Network className="w-4 h-4 text-purple-600" />
            <span className="font-medium text-purple-800">
              Analisis Jaringan Sosial
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Langkah Pemrosesan:</strong>
              <ul className="text-xs mt-1 space-y-1">
                {message.enhanced_metadata.processing_steps?.map(
                  (step: string, index: number) => (
                    <li key={index}>• {step}</li>
                  ),
                )}
              </ul>
            </div>
            <div>
              <strong>Metrik Analisis:</strong>
              <div className="text-xs mt-1 space-y-1">
                <div>• Titik Data: {message.enhanced_metadata.data_points}</div>
                <div>
                  • Tingkat Keyakinan:{" "}
                  {message.enhanced_metadata.confidence_score}%
                </div>
                <div>
                  • Kualitas: {message.enhanced_metadata.visual_quality}
                </div>
                <div>
                  • Waktu Pemrosesan:{" "}
                  {message.enhanced_metadata.total_processing_time}ms
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Intent Analysis Reasoning */}
      {message.visualization?.intent_analysis && (
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
          <div className="font-medium text-yellow-800 mb-1">Analisis AI:</div>
          <div className="text-yellow-700">
            {message.visualization.intent_analysis.reasoning}
          </div>
          <div className="flex gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              Keyakinan:{" "}
              {Math.round(
                message.visualization.intent_analysis.confidence * 100,
              )}
              %
            </Badge>
            <Badge variant="outline" className="text-xs">
              Tipe: {message.visualization.intent_analysis.recommendedType}
            </Badge>
          </div>
        </div>
      )}

      {/* Suggestions */}
      {message.enhanced_metadata?.suggestions &&
        message.enhanced_metadata.suggestions.length > 0 && (
          <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
            <div className="font-medium text-blue-800 mb-1">Saran:</div>
            <ul className="text-blue-700 space-y-1">
              {message.enhanced_metadata.suggestions.map(
                (suggestion: string, index: number) => (
                  <li key={index}>• {suggestion}</li>
                ),
              )}
            </ul>
          </div>
        )}
    </div>
  );
};
