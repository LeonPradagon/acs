import React from "react";
import {
  Target,
  Copy,
  Save,
  ChevronDown,
  ChevronRight,
  FileText,
  Download,
  FileBarChart,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { MODE_CONFIG } from "@/constants/ai-config";

interface AnalysisCardsProps {
  workspaceData: any;
  selectedMode: string;
  expandedCards: any;
  toggleCard: (cardName: any) => void;
  handleCopyContent: (content: string) => void;
  handleSaveAnalysis: () => void;
  handleExportReport: () => void;
  isProcessing: boolean;
}

/**
 * Component to render the main analysis cards in the workspace
 */
export const AnalysisCards = ({
  workspaceData,
  selectedMode,
  expandedCards,
  toggleCard,
  handleCopyContent,
  handleSaveAnalysis,
  handleExportReport,
  isProcessing,
}: AnalysisCardsProps) => {
  return (
    <div className="grid gap-4">
      {/* Analisis Utama Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Analisis Utama -{" "}
              {MODE_CONFIG[selectedMode as keyof typeof MODE_CONFIG]?.name ||
                selectedMode}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleCopyContent(workspaceData.mainAnalysis.content)
                }
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveAnalysis}
                disabled={isProcessing}
              >
                <Save className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleCard("analisis")}
              >
                {expandedCards.analisis ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <Collapsible open={expandedCards.analisis}>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-4">
                <div className="prose prose-sm max-w-none">
                  <h4 className="text-base font-semibold mb-2">
                    {workspaceData.mainAnalysis.title}
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {workspaceData.mainAnalysis.content}
                  </p>
                  <h5 className="text-sm font-medium mt-4 mb-2">
                    Temuan Utama:
                  </h5>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {workspaceData.mainAnalysis.findings.map(
                      (finding: string, index: number) => (
                        <li key={index}>• {finding}</li>
                      ),
                    )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Laporan Otomatis Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Laporan Otomatis
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-accent hover:text-accent"
                onClick={handleExportReport}
                disabled={isProcessing}
              >
                <Download className="w-4 h-4 mr-1" />
                Export PDF
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleCard("laporan")}
              >
                {expandedCards.laporan ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <Collapsible open={expandedCards.laporan}>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h5 className="text-sm font-medium mb-2">
                    {workspaceData.autoReport.title}
                  </h5>
                  <p className="text-xs text-muted-foreground mb-3">
                    {workspaceData.autoReport.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {workspaceData.autoReport.pages} halaman
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {workspaceData.autoReport.classification}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {workspaceData.autoReport.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Ringkasan Otomatis Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileBarChart className="w-5 h-5" />
              Ringkasan Otomatis
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleCopyContent(workspaceData.autoSummary.join("\n"))
                }
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleCard("ringkasan")}
              >
                {expandedCards.ringkasan ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <Collapsible open={expandedCards.ringkasan}>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-3">
                {workspaceData.autoSummary.map(
                  (summary: string, index: number) => (
                    <div key={index} className="flex items-start gap-3">
                      <div
                        className={`w-2 h-2 rounded-full mt-2 ${
                          index === 0
                            ? "bg-destructive"
                            : index === 1
                              ? "bg-accent"
                              : index === 2
                                ? "bg-primary"
                                : "bg-accent"
                        }`}
                      ></div>
                      <p className="text-sm">{summary}</p>
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
};
