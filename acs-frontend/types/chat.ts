// ==================== VISUALIZATION TYPES ====================

export type VisualizationType =
  | "heatmap"
  | "timeline"
  | "network"
  | "chart"
  | "bar_chart"
  | "line_chart"
  | "pie_chart"
  | "area_chart"
  | "scatter_chart"
  | "radar_chart"
  | "quadrant"
  | "swot"
  | "fishbone"
  | "causality"
  | "threat_matrix"
  | string;

export interface IntentAnalysis {
  recommendedType: string;
  suggestedTitle: string;
  needsComparison: boolean;
  metrics: string[];
  confidence: number;
  reasoning: string;
}

export interface DataSummary {
  data_points: number;
  data_type: string;
  generated_data: boolean;
  confidence?: number;
}

export interface VisualizationData {
  type: VisualizationType;
  data: any;
  title: string;
  description?: string;
  narrative?: string;
  insights?: string[];
  recommendations?: string[];
  intent_analysis?: IntentAnalysis;
  data_summary?: DataSummary;
  suggestions?: string[];
}

export interface EnhancedVisualizationData extends VisualizationData {
  intent_analysis?: IntentAnalysis;
  data_summary?: DataSummary;
  suggestions?: string[];
  metadata?: {
    data_source: string;
    is_real_data: boolean;
    generated_at: string;
    real_data_sources?: any[];
  };
}

// ==================== ENTITY & SOURCE TYPES ====================

export interface Source {
  id: string;
  content: string;
  metadata: {
    source: string;
    category: string;
    classification?: string;
    date?: string;
    author?: string;
  };
  score: number;
  type?: string;
  relevance?: string;
}

export interface Entity {
  id: string;
  name: string;
  type:
    | "person"
    | "organization"
    | "location"
    | "date"
    | "event"
    | "threat"
    | "technology"
    | "issue"
    | "trend";
  confidence: number;
  metadata?: {
    description?: string;
    relevance?: string;
    count?: number;
  };
}

// ==================== ONTOLOGY TYPES ====================

export interface OntologyNode {
  id: string;
  label: string;
  type: string;
  confidence?: number;
  categories?: string[];
  metadata?: any;
  size?: number;
  color?: string;
}

export interface OntologyEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type: string;
  confidence?: number;
  width?: number;
  color?: string;
  metadata?: any;
}

export interface OntologyGraph {
  nodes: OntologyNode[];
  edges: OntologyEdge[];
  metadata?: {
    total_nodes: number;
    total_edges: number;
    node_types: string[];
    edge_types: string[];
    density: number;
    generation_method?: string;
  };
}

export interface OntologyExtractionResults {
  entities: any[];
  relations: any[];
  events: any[];
  metadata?: {
    extraction_method: string;
    total_entities: number;
    total_relations: number;
    total_events: number;
  };
}

export interface OntologyResponse {
  success: boolean;
  question: string;
  mode: string;
  timestamp: string;
  metadata: {
    processing_time: number;
    user_role: string;
    model: string;
    output_format: string;
    analysis_depth: string;
  };
  analysis?: {
    narrative: string;
    rag_context?: any;
    ontology?: OntologyExtractionResults;
    visualization?: any;
    statistics?: any;
    graph?: OntologyGraph;
  };
  narrative?: string;
  key_findings?: any;
  graph_summary?: any;
  visualization?: any;
  graph_info?: any;
  insights?: any[];
  recommendations?: any[];
}

// ==================== ANALYSIS & CHAT TYPES ====================

export interface AnalysisResult {
  type: string;
  title: string;
  data: any;
  narrative?: string;
  description?: string;
  insights?: string[];
  recommendations?: string[];
  structure?: {
    nodes: any[];
    links: any[];
    groups: any[];
  };
  analysis?: {
    centrality: any;
    density: number;
    diameter: number;
    key_players: any[];
  };
  metadata?: any;
}

export interface ChatMessage {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  sources?: Source[];
  entities?: Entity[];
  visualization?: VisualizationData;
  modelUsed?: string;
  confidence?: number;
  processingTime?: number;
  enhanced_metadata?: any;
  recommendations?: any[];
  advanced_reasoning?: any;
  retrieval_metadata?: any;
  security_level?: string;
  analysis_results?: AnalysisResult[];
  ontology_data?: OntologyResponse;
}

export interface AdvancedVisualResponse {
  success: boolean;
  question: string;
  answer: string;
  analysis_results: AnalysisResult[];
  visualization: VisualizationData;
  visual_narrative: string;
  sources: Source[];
  query_analysis: any;
  retrieval_metadata: any;
  enhanced_metadata: {
    processing_steps: string[];
    total_processing_time: number;
    confidence_score: number;
    analysis_type: string;
    visualization_ready: boolean;
    data_points: number;
    visual_quality: string;
  };
  timestamp: string;
}

export interface SmartQueryResponse {
  type:
    | "visual_analysis"
    | "text_response"
    | "swot_analysis"
    | "trend_analysis"
    | "advanced_visual_analysis"
    | "ontology_analysis";
  visualization?: EnhancedVisualizationData;
  narrative?: string;
  data_summary?: DataSummary;
  intent_analysis?: IntentAnalysis;
  answer?: string;
  sources?: Source[];
  model?: string;
  analysis?: any;
  data_source?: "real_data" | "generated_data";
  is_real_data?: boolean;
  suggestions?: string[];
  metadata?: {
    question: string;
    visualization_type: string;
    data_source: string;
    generated_at: string;
    model: string;
    real_data_sources?: any[];
  };
  analysis_results?: AnalysisResult[];
  enhanced_metadata?: any;
  ontology_data?: OntologyResponse;
}
