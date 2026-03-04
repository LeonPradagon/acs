import {
  Brain,
  Cpu,
  Lightbulb,
  AlertOctagon,
  Target,
  GitGraph,
  Rocket,
  Lock,
  Shield,
  Filter,
  Verified,
  Network,
  LineChart as LineChartIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  AreaChart as AreaChartIcon,
  ScatterChart as ScatterChartIcon,
  Radar as RadarIcon,
  GitMerge,
  FishSymbol,
  Workflow,
  MessageSquare,
  FileText,
  Database,
  Zap,
} from "lucide-react";

export const AI_PERSONAS = {
  analyst: {
    name: "Analis Intelijen",
    description: "Ahli analisis ancaman dan pattern recognition",
    icon: Brain,
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  technical: {
    name: "Analis Teknis",
    description: "Spesialis analisis teknis dan forensik",
    icon: Cpu,
    color: "bg-green-100 text-green-700 border-green-200",
  },
  innovator: {
    name: "Innovator",
    description: "Spesialis generasi ide dan solusi inovatif",
    icon: Lightbulb,
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  risk: {
    name: "Risk Monitor",
    description: "Ahli monitoring dan analisis risiko keamanan",
    icon: AlertOctagon,
    color: "bg-red-100 text-red-700 border-red-200",
  },
  strategist: {
    name: "Strategist",
    description: "Ahli analisis strategis dan perencanaan",
    icon: Target,
    color: "bg-purple-100 text-purple-700 border-purple-200",
  },
  ontologist: {
    name: "Ontology Expert",
    description: "Spesialis analisis hubungan dan knowledge graph",
    icon: GitGraph,
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
  },
};

export const AVAILABLE_MODELS = {
  "openai/gpt-oss-120b": {
    name: "GPT OSS 120B",
    description:
      "Model open source dengan kecepatan tinggi dan reasoning yang excellent",
    icon: Rocket,
    color: "bg-purple-100 text-purple-700 border-purple-200",
  },
};

export const CLASSIFICATION_LEVELS = {
  Rahasia: {
    name: "Rahasia",
    description: "Informasi sangat rahasia",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: Lock,
  },
  Terbatas: {
    name: "Terbatas",
    description: "Informasi terbatas untuk kalangan tertentu",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: Shield,
  },
  Internal: {
    name: "Internal",
    description: "Informasi internal organisasi",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: Filter,
  },
  Publik: {
    name: "Publik",
    description: "Informasi dapat diakses publik",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: Verified,
  },
};

export const VISUALIZATION_TYPES = {
  network: {
    icon: Network,
    color: "bg-purple-100 text-purple-700 border-purple-200",
    label: "Analisis Jaringan",
  },
  timeline: {
    icon: LineChartIcon,
    color: "bg-blue-100 text-blue-700 border-blue-200",
    label: "Analisis Timeline",
  },
  bar_chart: {
    icon: BarChartIcon,
    color: "bg-green-100 text-green-700 border-green-200",
    label: "Analisis Perbandingan",
  },
  pie_chart: {
    icon: PieChartIcon,
    color: "bg-pink-100 text-pink-700 border-pink-200",
    label: "Analisis Distribusi",
  },
  area_chart: {
    icon: AreaChartIcon,
    color: "bg-teal-100 text-teal-700 border-teal-200",
    label: "Analisis Tren",
  },
  scatter_chart: {
    icon: ScatterChartIcon,
    color: "bg-orange-100 text-orange-700 border-orange-200",
    label: "Analisis Korelasi",
  },
  radar_chart: {
    icon: RadarIcon,
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
    label: "Analisis Radar",
  },
  quadrant: {
    icon: GitMerge,
    color: "bg-orange-100 text-orange-700 border-orange-200",
    label: "Analisis Kuadran",
  },
  swot: {
    icon: Target,
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    label: "Analisis SWOT",
  },
  fishbone: {
    icon: FishSymbol,
    color: "bg-red-100 text-red-700 border-red-200",
    label: "Analisis Akar Masalah",
  },
  causality: {
    icon: Workflow,
    color: "bg-cyan-100 text-cyan-700 border-cyan-200",
    label: "Analisis Sebab-Akibat",
  },
  threat_matrix: {
    icon: AlertOctagon,
    color: "bg-gray-100 text-gray-700 border-gray-200",
    label: "Matriks Ancaman",
  },
  knowledge_graph: {
    icon: GitGraph,
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
    label: "Graf Pengetahuan",
  },
  entity_network: {
    icon: Network,
    color: "bg-purple-100 text-purple-700 border-purple-200",
    label: "Jaringan Entitas",
  },
};

export const MODE_CONFIG: {
  [key: string]: {
    name: string;
    description: string;
    icon: any;
    color: string;
    persona: keyof typeof AI_PERSONAS;
    endpoint?: string;
  };
} = {
  qa: {
    name: "Q&A",
    description: "Tanya jawab langsung dengan sistem",
    icon: MessageSquare,
    color: "bg-blue-100 text-blue-700 border-blue-200",
    persona: "analyst",
  },
  summary: {
    name: "Summary",
    description: "Ringkasan dan ekstraksi informasi",
    icon: FileText,
    color: "bg-green-100 text-green-700 border-green-200",
    persona: "analyst",
  },
  ide: {
    name: "Ide Generator",
    description: "Generasi ide kreatif dan solusi inovatif",
    icon: Lightbulb,
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    persona: "innovator",
  },
  risk: {
    name: "Risk Monitoring",
    description: "Monitoring dan analisis risiko keamanan",
    icon: AlertOctagon,
    color: "bg-red-100 text-red-700 border-red-200",
    persona: "risk",
  },
  enhanced_visual: {
    name: "Enhanced Visual",
    description: "Visualisasi dengan pencarian data real terlebih dahulu",
    icon: Database,
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
    persona: "analyst",
    endpoint: "enhanced-visual-request",
  },
  ontology: {
    name: "Ontology Analysis",
    description: "Analisis knowledge graph dan hubungan entitas",
    icon: GitGraph,
    color: "bg-purple-100 text-purple-700 border-purple-200",
    persona: "ontologist",
    endpoint: "ontology",
  },
};

export const ONTOLOGY_MODES = {
  auto: {
    name: "Deteksi Otomatis",
    description: "Sistem akan memilih mode terbaik secara otomatis",
    icon: Zap,
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  extraction: {
    name: "Ekstraksi Entitas",
    description: "Mengidentifikasi entitas dan hubungannya",
    icon: Network,
    color: "bg-green-100 text-green-700 border-green-200",
  },
  knowledge_graph: {
    name: "Graf Pengetahuan",
    description: "Membuat visualisasi hubungan pengetahuan",
    icon: GitGraph,
    color: "bg-purple-100 text-purple-700 border-purple-200",
  },
  comprehensive: {
    name: "Analisis Menyeluruh",
    description: "Analisis lengkap dengan berbagai perspektif",
    icon: Brain,
    color: "bg-orange-100 text-orange-700 border-orange-200",
  },
  quick: {
    name: "Analisis Cepat",
    description: "Analisis cepat untuk insight langsung",
    icon: Rocket,
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
};
