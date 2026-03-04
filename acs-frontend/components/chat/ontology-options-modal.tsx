import React from "react";
import { GitGraph, X, Search } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ONTOLOGY_MODES } from "@/constants/ai-config";

interface OntologyOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ontologyMode: string;
  setOntologyMode: (mode: string) => void;
  ontologyOptions: any;
  setOntologyOptions: (options: any) => void;
  getOntologyModeIcon: (mode: string) => React.ReactNode;
}

/**
 * Modal to configure ontology extraction and knowledge graph settings
 */
export const OntologyOptionsModal = ({
  isOpen,
  onClose,
  ontologyMode,
  setOntologyMode,
  ontologyOptions,
  setOntologyOptions,
  getOntologyModeIcon,
}: OntologyOptionsModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <GitGraph className="w-5 h-5 text-indigo-600" />
              Pengaturan Analisis Hubungan
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          {/* Analysis Mode */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Mode Analisis</label>
            <Select value={ontologyMode} onValueChange={setOntologyMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ONTOLOGY_MODES).map(([key, mode]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      {getOntologyModeIcon(key)}
                      <span>{mode.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {
                ONTOLOGY_MODES[ontologyMode as keyof typeof ONTOLOGY_MODES]
                  ?.description
              }
            </p>
          </div>

          {/* Output Format */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Format Output</label>
            <Select
              value={ontologyOptions.output_format}
              onValueChange={(value) =>
                setOntologyOptions((prev: any) => ({
                  ...prev,
                  output_format: value,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="complete">Analisis Lengkap</SelectItem>
                <SelectItem value="minimal">Output Minimal</SelectItem>
                <SelectItem value="graph_only">Hanya Graf</SelectItem>
                <SelectItem value="analysis_only">Hanya Analisis</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Analysis Depth */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Kedalaman Analisis</label>
            <Select
              value={ontologyOptions.analysis_depth}
              onValueChange={(value) =>
                setOntologyOptions((prev: any) => ({
                  ...prev,
                  analysis_depth: value,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quick">Analisis Cepat</SelectItem>
                <SelectItem value="standard">Analisis Standar</SelectItem>
                <SelectItem value="comprehensive">Analisis Mendalam</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Options Checkboxes */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Opsi</label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enable-visualization"
                  checked={ontologyOptions.enable_visualization}
                  onChange={(e) =>
                    setOntologyOptions((prev: any) => ({
                      ...prev,
                      enable_visualization: e.target.checked,
                    }))
                  }
                  className="rounded"
                />
                <label htmlFor="enable-visualization" className="text-sm">
                  Aktifkan Visualisasi
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Batal
            </Button>
            <Button
              onClick={onClose}
              className="flex-1 bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Terapkan Pengaturan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
