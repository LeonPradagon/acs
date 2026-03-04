import React, { useState } from "react";
import {
  FileBarChart,
  Lightbulb,
  Sparkles,
  Target,
  CheckCircle2,
  GitGraph,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UniversalD3Visualization } from "@/components/visualisasi/universal-d3-visualization";
import { EnhancedOntologyContent } from "../ontology/ontology-visualizations";
import { MarkdownText } from "./markdown-text";
import { validateAndFixAnalysisData } from "@/lib/ai-query.service";
import { ChatMessage } from "@/types/chat";
import { VISUALIZATION_TYPES } from "@/constants/ai-config";

const safeArray = <T,>(arr: any): T[] => (Array.isArray(arr) ? arr : []);

const getVisualizationIcon = (type: string) => {
  const Icon =
    VISUALIZATION_TYPES[type as keyof typeof VISUALIZATION_TYPES]?.icon ||
    FileBarChart;
  return <Icon className="w-4 h-4" />;
};

/**
 * Component to handle and display visual analysis (charts, etc.)
 */
export const VisualAnalysisContent = ({
  message,
}: {
  message: ChatMessage;
}) => {
  const analyses =
    message.analysis_results ||
    (message.visualization ? [message.visualization] : []);
  const [selectedVizIndex, setSelectedVizIndex] = useState(0);

  if (!analyses || analyses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileBarChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Belum ada data analisis visual untuk ditampilkan</p>
      </div>
    );
  }

  const currentAnalysis = analyses[selectedVizIndex];
  const processedData = validateAndFixAnalysisData(currentAnalysis.data);
  const narrative = currentAnalysis.narrative;
  const description = currentAnalysis.description || narrative;
  const insights = currentAnalysis.insights || [];
  const recommendations = currentAnalysis.recommendations || [];

  return (
    <div className="space-y-6">
      {analyses.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {analyses.map((analysis: any, index: number) => (
            <Button
              key={index}
              variant={selectedVizIndex === index ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedVizIndex(index)}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              {getVisualizationIcon(analysis.type)}
              {analysis.title || `Visualisasi ${index + 1}`}
            </Button>
          ))}
        </div>
      )}

      <UniversalD3Visualization
        data={processedData.items || []}
        type={currentAnalysis.type || "chart"}
        title={currentAnalysis.title || "Analisis Visual"}
        description={description}
        narrative={narrative}
        insights={insights}
        recommendations={recommendations}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {insights.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-600" />
                Insight Utama
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {safeArray<string>(insights).map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <MarkdownText text={insight} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {recommendations.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                Rekomendasi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {safeArray<string>(recommendations).map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <MarkdownText text={rec} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

/**
 * Component to handle and display ontology/knowledge graph analysis
 */
export const OntologyAnalysisContent = ({
  message,
}: {
  message: ChatMessage;
}) => {
  if (!message.ontology_data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <GitGraph className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Data analisis hubungan belum tersedia</p>
      </div>
    );
  }

  return <EnhancedOntologyContent data={message.ontology_data} />;
};
