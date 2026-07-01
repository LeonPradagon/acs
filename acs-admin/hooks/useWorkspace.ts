import { useState, useRef, useCallback } from "react";
import { MODE_CONFIG, AI_PERSONAS } from "@/constants/ai-config";

interface HistoryItem {
  id: string;
  query: string;
  response: string;
  mode: string;
  persona: string;
  model: string;
  timestamp: Date;
  sources?: any[];
  entities?: any[];
}

interface WorkspaceData {
  mainAnalysis: {
    title: string;
    content: string;
    findings: string[];
  };
  autoReport: {
    title: string;
    description: string;
    pages: number;
    classification: string;
    status: string;
  };
  autoSummary: string[];
  repeatedEntities: {
    organizations: any[];
    locations: any[];
    technologies: any[];
  };
  topicHeatmap: any[];
  riskNotifications: any[];
  metadata: {
    keywords: string[];
    confidenceScores: any[];
  };
}

/**
 * Hook to manage analyst workspace state and operations
 */
export const useWorkspace = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedCards, setExpandedCards] = useState({
    analisis: true,
    laporan: true,
    ringkasan: true,
    entitas: true,
    heatmap: true,
    risiko: true,
  });

  const [workspaceData, setWorkspaceData] = useState<WorkspaceData>({
    mainAnalysis: {
      title: "Analisis Ancaman Siber Q4 2024",
      content:
        "Berdasarkan data intelijen terkini, terdapat peningkatan signifikan aktivitas siber yang menargetkan infrastruktur kritis nasional. Analisis menunjukkan pola serangan yang terkoordinasi dengan menggunakan teknik advanced persistent threat (APT).",
      findings: [
        "Peningkatan 45% serangan terhadap sektor energi",
        "Identifikasi 12 kelompok APT baru dengan taktik yang berkembang",
        "Korelasi dengan aktivitas geopolitik regional",
      ],
    },
    autoReport: {
      title: "Executive Summary",
      description:
        "Laporan briefing komprehensif mengenai situasi ancaman siber terkini dan rekomendasi tindakan strategis.",
      pages: 12,
      classification: "Terbatas",
      status: "Siap Export",
    },
    autoSummary: [
      "Peningkatan aktivitas APT dengan target infrastruktur energi nasional",
      "Identifikasi 12 kelompok baru menggunakan teknik lateral movement canggih",
      "Korelasi temporal dengan eskalasi ketegangan geopolitik regional",
      "Rekomendasi penguatan monitoring real-time dan koordinasi antar lembaga",
    ],
    repeatedEntities: {
      organizations: [
        { name: "APT29", count: 47 },
        { name: "Lazarus Group", count: 32 },
        { name: "Equation Group", count: 18 },
      ],
      locations: [
        { name: "Jakarta", count: 89 },
        { name: "Surabaya", count: 34 },
        { name: "Medan", count: 21 },
      ],
      technologies: [
        { name: "SCADA", count: 56 },
        { name: "ICS", count: 43 },
        { name: "IoT", count: 29 },
      ],
    },
    topicHeatmap: [
      { topic: "Siber", intensity: 95, color: "bg-destructive" },
      { topic: "APT", intensity: 87, color: "bg-accent" },
      { topic: "Infrastruktur", intensity: 76, color: "bg-primary" },
      { topic: "Energi", intensity: 68, color: "bg-chart-4" },
      { topic: "Malware", intensity: 54, color: "bg-muted" },
      { topic: "Forensik", intensity: 43, color: "bg-muted" },
      { topic: "Monitoring", intensity: 32, color: "bg-muted" },
      { topic: "Koordinasi", intensity: 28, color: "bg-muted" },
    ],
    riskNotifications: [
      {
        level: "kritis",
        title: "Anomali Kritis Terdeteksi",
        description:
          "Pola akses tidak normal pada sistem SCADA sektor energi - memerlukan investigasi segera",
        time: "Real-time",
        icon: "AlertTriangle",
      },
      {
        level: "tinggi",
        title: "Peningkatan Aktivitas Mencurigakan",
        description:
          "Volume traffic anomali pada infrastruktur telekomunikasi - monitoring diperlukan",
        time: "2 jam lalu",
        icon: "Activity",
      },
    ],
    metadata: {
      keywords: [
        "siber",
        "ancaman",
        "infrastruktur",
        "APT",
        "malware",
        "forensik",
      ],
      confidenceScores: [
        { label: "Akurasi Analisis", score: 85 },
        { label: "Relevansi Sumber", score: 92 },
        { label: "Kredibilitas Data", score: 78 },
      ],
    },
  });

  const toggleCard = useCallback((cardName: keyof typeof expandedCards) => {
    setExpandedCards((prev) => ({
      ...prev,
      [cardName]: !prev[cardName],
    }));
  }, []);

  const updateWorkspaceData = useCallback(
    (
      aiResponse: any,
      selectedMode: string,
      selectedPersona: string,
      selectedModel: string,
    ) => {
      if (!aiResponse) return;

      // Add to history
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        query: aiResponse.userQuery || "Unknown query",
        response: aiResponse.content,
        mode: selectedMode,
        persona: selectedPersona,
        model: selectedModel,
        timestamp: new Date(),
        sources: aiResponse.sources,
        entities: aiResponse.entities,
      };

      setHistory((prev) => [newHistoryItem, ...prev.slice(0, 9)]);

      // Update main analysis
      if (aiResponse.content) {
        setWorkspaceData((prev) => ({
          ...prev,
          mainAnalysis: {
            title: `Analisis ${MODE_CONFIG[selectedMode as keyof typeof MODE_CONFIG]?.name || selectedMode}`,
            content: aiResponse.content,
            findings: [
              "Analisis real-time berdasarkan data terkini",
              "Identifikasi pola dan tren otomatis",
              "Rekomendasi aksi berdasarkan prioritas risiko",
            ],
          },
        }));
      }

      // Update entities
      if (aiResponse.entities && aiResponse.entities.length > 0) {
        const getTopEntities = (type: string) =>
          aiResponse.entities
            .filter((e: any) => e.type === type)
            .slice(0, 3)
            .map((e: any) => ({
              name: e.name,
              count: Math.floor(Math.random() * 50) + 10,
            }));

        const organizations = getTopEntities("organization");
        const locations = getTopEntities("location");
        const technologies = getTopEntities("technology");

        setWorkspaceData((prev) => ({
          ...prev,
          repeatedEntities: {
            organizations:
              organizations.length > 0
                ? organizations
                : prev.repeatedEntities.organizations,
            locations:
              locations.length > 0
                ? locations
                : prev.repeatedEntities.locations,
            technologies:
              technologies.length > 0
                ? technologies
                : prev.repeatedEntities.technologies,
          },
        }));
      }

      // Update summary
      if (aiResponse.content) {
        const summary = aiResponse.content
          .split(". ")
          .filter((s: string) => s.length > 10)
          .slice(0, 4)
          .map((s: string) => s.trim());

        setWorkspaceData((prev) => ({
          ...prev,
          autoSummary: summary.length > 0 ? summary : prev.autoSummary,
        }));
      }

      // Update metadata
      if (aiResponse.confidence) {
        setWorkspaceData((prev) => ({
          ...prev,
          metadata: {
            ...prev.metadata,
            confidenceScores: [
              { label: "Akurasi Analisis", score: aiResponse.confidence },
              {
                label: "Relevansi Sumber",
                score: Math.min(95, aiResponse.confidence + 7),
              },
              {
                label: "Kredibilitas Data",
                score: Math.min(85, aiResponse.confidence - 5),
              },
            ],
          },
        }));
      }
    },
    [],
  );

  const handleExportReport = useCallback(() => {
    setIsProcessing(true);
    setTimeout(() => {
      alert("Laporan berhasil diexport sebagai PDF!");
      setIsProcessing(false);
    }, 1500);
  }, []);

  const handleSaveAnalysis = useCallback(() => {
    setIsProcessing(true);
    setTimeout(() => {
      alert("Analisis berhasil disimpan!");
      setIsProcessing(false);
    }, 1000);
  }, []);

  return {
    history,
    workspaceData,
    isProcessing,
    expandedCards,
    toggleCard,
    updateWorkspaceData,
    handleExportReport,
    handleSaveAnalysis,
  };
};
