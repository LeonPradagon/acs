"use client";

import { useRef, useEffect, useState, ReactNode } from "react";
import * as d3 from "d3";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GitGraph,
  X,
  ZoomIn,
  Navigation,
  FileText,
  User,
  Link,
  Brain,
  BarChart as BarChartIcon,
  Lightbulb,
  Target,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ==================== ONTOLOGY TYPES ====================
interface OntologyNode {
  id: string;
  label: string;
  type: string;
  confidence?: number;
  categories?: string[];
  metadata?: any;
  size?: number;
  color?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface OntologyEdge {
  id: string;
  source: string | OntologyNode;
  target: string | OntologyNode;
  label?: string;
  type: string;
  confidence?: number;
  width?: number;
  color?: string;
  metadata?: any;
}

interface OntologyGraph {
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

interface OntologyResponse {
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
    ontology?: any;
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

// ==================== ONTOLOGY COLORS ====================
const ONTOLOGY_NODE_COLORS: { [key: string]: string } = {
  person: "#FF6B6B",
  organization: "#4ECDC4",
  location: "#45B7D1",
  technology: "#96CEB4",
  concept: "#FFE66D",
  event: "#FF9FF3",
  threat: "#FD79A8",
  date: "#FDCB6E",
  default: "#DFE6E9",
};

const ONTOLOGY_EDGE_COLORS: { [key: string]: string } = {
  works_for: "#00B894",
  located_in: "#0984E3",
  uses: "#E17055",
  targets: "#D63031",
  discovered_on: "#FDCB6E",
  part_of: "#6C5CE7",
  related_to: "#636E72",
  default: "#B2BEC3",
};

// ==================== HELPER FUNCTIONS ====================
const getNodeColor = (type: string): string => {
  return ONTOLOGY_NODE_COLORS[type] || ONTOLOGY_NODE_COLORS.default;
};

const getEdgeColor = (type: string): string => {
  return ONTOLOGY_EDGE_COLORS[type] || ONTOLOGY_EDGE_COLORS.default;
};

const getNodeSize = (confidence?: number): number => {
  const baseSize = 20;
  const confidenceBonus = confidence ? confidence * 15 : 0;
  return baseSize + confidenceBonus;
};

const getEdgeWidth = (confidence?: number): number => {
  const baseWidth = 2;
  const confidenceBonus = confidence ? confidence * 2 : 0;
  return baseWidth + confidenceBonus;
};

const getNodeLabel = (label: string): string => {
  if (!label) return "?";
  if (label.length <= 8) return label;
  return label.substring(0, 8) + "...";
};

const removeMarkdownBold = (text: string): string => {
  if (!text) return "";
  return text.replace(/\*\*/g, "");
};

// Helper function untuk safely render properties
const renderSafeProperty = (value: any): ReactNode => {
  if (value === null || value === undefined) return "N/A";
  if (typeof value === "object") {
    // Jika ini adalah node object, ambil label-nya
    if ("label" in value) return String(value.label);
    return JSON.stringify(value);
  }
  return String(value);
};

// ==================== D3 ONTOLOGY VISUALIZATION ====================
interface D3OntologyVisualizationProps {
  data: OntologyResponse;
}

export const D3OntologyVisualization = ({
  data,
}: D3OntologyVisualizationProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<OntologyNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<OntologyEdge | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const simulationRef = useRef<d3.Simulation<
    OntologyNode,
    OntologyEdge
  > | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  useEffect(() => {
    const updateDimensions = () => {
      const container = svgRef.current?.parentElement;
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: Math.max(400, container.clientHeight),
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    if (!data?.analysis?.graph || !svgRef.current) return;

    const graph = data.analysis.graph;
    let { nodes, edges } = graph;

    if (nodes.length === 0) return;

    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();

    // Prepare nodes dengan posisi acak
    nodes = nodes.map((node: OntologyNode) => ({
      ...node,
      x: Math.random() * dimensions.width,
      y: Math.random() * dimensions.height,
    }));

    // Prepare edges dengan referensi ke node
    const edgesWithNodes = edges.map((edge: OntologyEdge) => ({
      ...edge,
      source: nodes.find((n) => n.id === edge.source) || edge.source,
      target: nodes.find((n) => n.id === edge.target) || edge.target,
    }));

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
      .style("background", "linear-gradient(to bottom right, #f0f4ff, #faf5ff)")
      .style("border-radius", "8px");

    // Create container for zoomable content
    const g = svg.append("g");

    // Set up zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // Set up force simulation
    const simulation = d3
      .forceSimulation<OntologyNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<OntologyNode, OntologyEdge>(edgesWithNodes)
          .id((d: any) => d.id)
          .distance(100)
          .strength(0.5)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force(
        "center",
        d3.forceCenter(dimensions.width / 2, dimensions.height / 2)
      )
      .force("collision", d3.forceCollide().radius(40));

    simulationRef.current = simulation;

    // Create arrow markers for directed edges
    const defs = svg.append("defs");

    defs
      .selectAll("marker")
      .data(["arrow"])
      .enter()
      .append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 15)
      .attr("refY", -0.5)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#999");

    // Create edges
    const link = g
      .append("g")
      .selectAll("line")
      .data(edgesWithNodes)
      .enter()
      .append("line")
      .attr("stroke", (d: OntologyEdge) => getEdgeColor(d.type))
      .attr("stroke-width", (d: OntologyEdge) => getEdgeWidth(d.confidence))
      .attr("stroke-dasharray", (d: OntologyEdge) =>
        d.confidence && d.confidence < 0.5 ? "5,5" : "none"
      )
      .attr("marker-end", (d: OntologyEdge) =>
        d.type !== "related_to" ? "url(#arrow)" : null
      )
      .style("cursor", "pointer")
      .on("click", (event, d: any) => {
        event.stopPropagation();
        setSelectedEdge(d);
        setSelectedNode(null);
      });

    // Create edge labels
    const edgeLabels = g
      .append("g")
      .selectAll("text")
      .data(edgesWithNodes.filter((d: OntologyEdge) => d.label))
      .enter()
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .style("font-size", "10px")
      .style("fill", "#64748b")
      .style("pointer-events", "none")
      .style("font-weight", "500")
      .text((d: OntologyEdge) => d.label || "");

    // Create nodes
    const node = g
      .append("g")
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", (d: OntologyNode) => getNodeSize(d.confidence))
      .attr("fill", (d: OntologyNode) => getNodeColor(d.type))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))")
      .call(
        d3
          .drag<SVGCircleElement, OntologyNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on("click", (event, d: any) => {
        event.stopPropagation();
        setSelectedNode(d);
        setSelectedEdge(null);
      })
      .on("mouseover", function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", getNodeSize(d.confidence) + 3);
      })
      .on("mouseout", function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", getNodeSize(d.confidence));
      });

    // Create node labels
    const nodeLabels = g
      .append("g")
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .style("font-size", "11px")
      .style("font-weight", "600")
      .style("fill", "#fff")
      .style("pointer-events", "none")
      .style("text-shadow", "1px 1px 2px rgba(0,0,0,0.5)")
      .text((d: OntologyNode) => getNodeLabel(d.label));

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      edgeLabels
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2 - 10);

      node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);

      nodeLabels.attr("x", (d: any) => d.x).attr("y", (d: any) => d.y);
    });

    // Add tooltips
    node
      .append("title")
      .text(
        (d: any) =>
          `${d.label}\nType: ${d.type}\nConfidence: ${
            d.confidence ? (d.confidence * 100).toFixed(1) + "%" : "N/A"
          }`
      );

    link
      .append("title")
      .text(
        (d: any) =>
          `${d.type}\nFrom: ${
            typeof d.source === "object" ? d.source.label : d.source
          }\nTo: ${
            typeof d.target === "object" ? d.target.label : d.target
          }\nConfidence: ${
            d.confidence ? (d.confidence * 100).toFixed(1) + "%" : "N/A"
          }`
      );

    return () => {
      simulation.stop();
    };
  }, [data, dimensions]);

  const handleResetZoom = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(750)
        .call(zoomRef.current.transform, d3.zoomIdentity);
    }
  };

  const handleReCenter = () => {
    if (simulationRef.current) {
      simulationRef.current.force(
        "center",
        d3.forceCenter(dimensions.width / 2, dimensions.height / 2)
      );
      simulationRef.current.alpha(0.3).restart();
    }
  };

  if (!data?.analysis?.graph) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <GitGraph className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Data ontology tidak tersedia</p>
        </div>
      </div>
    );
  }

  const graph = data.analysis.graph;
  const { nodes, edges } = graph;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">D3.js Force Layout</span>
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            {nodes.length} nodes
          </Badge>
          <Badge variant="outline" className="bg-green-50 text-green-700">
            {edges.length} edges
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetZoom}
            className="h-7 text-xs flex items-center gap-1"
          >
            <ZoomIn className="w-3 h-3" />
            Reset Zoom
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReCenter}
            className="h-7 text-xs flex items-center gap-1"
          >
            <Navigation className="w-3 h-3" />
            Re-center
          </Button>
        </div>
      </div>

      {/* Visualization Container */}
      <div className="relative bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border-2 border-dashed border-indigo-200 overflow-hidden">
        <svg
          ref={svgRef}
          className="w-full h-96 cursor-move"
          onClick={() => {
            setSelectedNode(null);
            setSelectedEdge(null);
          }}
        />

        {/* Legend */}
        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg p-3 text-xs shadow-sm border">
          <div className="font-medium mb-2 text-sm">Node Types:</div>
          <div className="space-y-1">
            {Array.from(new Set(nodes.map((n: any) => n.type)))
              .slice(0, 5)
              .map((type) => (
                <div key={type} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getNodeColor(type) }}
                  ></div>
                  <span className="capitalize">{type}</span>
                  <span className="text-muted-foreground">
                    ({nodes.filter((n: any) => n.type === type).length})
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg p-2 text-xs shadow-sm border">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <span className="font-medium">Interaksi:</span>
            </div>
            <div>• Drag untuk memindahkan node</div>
            <div>• Scroll untuk zoom in/out</div>
            <div>• Klik node/edge untuk detail</div>
          </div>
        </div>
      </div>

      {/* Node Details Panel */}
      {selectedNode && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Node Details</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedNode(null)}
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <strong className="text-blue-700">Label:</strong>
                  <div className="mt-1 font-medium">
                    {renderSafeProperty(selectedNode.label)}
                  </div>
                </div>
                <div>
                  <strong className="text-blue-700">Type:</strong>
                  <div className="mt-1 capitalize">
                    {renderSafeProperty(selectedNode.type)}
                  </div>
                </div>
                <div>
                  <strong className="text-blue-700">Confidence:</strong>
                  <div className="mt-1">
                    {selectedNode.confidence
                      ? `${(selectedNode.confidence * 100).toFixed(1)}%`
                      : "N/A"}
                  </div>
                </div>
                <div>
                  <strong className="text-blue-700">ID:</strong>
                  <div className="mt-1 font-mono text-xs">
                    {renderSafeProperty(selectedNode.id)}
                  </div>
                </div>
              </div>

              {selectedNode.categories &&
                selectedNode.categories.length > 0 && (
                  <div>
                    <strong className="text-blue-700">Categories:</strong>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedNode.categories.map(
                        (cat: string, idx: number) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-xs"
                          >
                            {cat}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* Connected edges */}
              <div>
                <strong className="text-blue-700">Connections:</strong>
                <div className="mt-1 space-y-1">
                  {data.analysis?.graph?.edges
                    .filter(
                      (edge: any) =>
                        edge.source === selectedNode.id ||
                        edge.target === selectedNode.id
                    )
                    .slice(0, 5)
                    .map((edge: any, idx: number) => {
                      const otherNodeId =
                        edge.source === selectedNode.id
                          ? edge.target
                          : edge.source;
                      const otherNode = data.analysis?.graph?.nodes.find(
                        (n: any) => n.id === otherNodeId
                      );
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-xs"
                        >
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getEdgeColor(edge.type) }}
                          ></div>
                          <span className="capitalize">{edge.type}</span>
                          <span>→</span>
                          <span className="font-medium">
                            {otherNode?.label || String(otherNodeId)}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {selectedNode.metadata &&
                Object.keys(selectedNode.metadata).length > 0 && (
                  <div>
                    <strong className="text-blue-700">Metadata:</strong>
                    <pre className="text-xs mt-1 p-2 bg-white rounded border max-h-32 overflow-auto">
                      {JSON.stringify(selectedNode.metadata, null, 2)}
                    </pre>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edge Details Panel */}
      {selectedEdge && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Relationship Details</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedEdge(null)}
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <strong className="text-green-700">Type:</strong>
                  <div className="mt-1 capitalize">
                    {renderSafeProperty(selectedEdge.type)}
                  </div>
                </div>
                <div>
                  <strong className="text-green-700">Confidence:</strong>
                  <div className="mt-1">
                    {selectedEdge.confidence
                      ? `${(selectedEdge.confidence * 100).toFixed(1)}%`
                      : "N/A"}
                  </div>
                </div>
                <div>
                  <strong className="text-green-700">Source:</strong>
                  <div className="mt-1 font-medium">
                    {renderSafeProperty(selectedEdge.source)}
                  </div>
                </div>
                <div>
                  <strong className="text-green-700">Target:</strong>
                  <div className="mt-1 font-medium">
                    {renderSafeProperty(selectedEdge.target)}
                  </div>
                </div>
              </div>

              {selectedEdge.label && (
                <div>
                  <strong className="text-green-700">Label:</strong>
                  <div className="mt-1">{selectedEdge.label}</div>
                </div>
              )}

              {selectedEdge.metadata &&
                Object.keys(selectedEdge.metadata).length > 0 && (
                  <div>
                    <strong className="text-green-700">Metadata:</strong>
                    <pre className="text-xs mt-1 p-2 bg-white rounded border max-h-32 overflow-auto">
                      {JSON.stringify(selectedEdge.metadata, null, 2)}
                    </pre>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Graph Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-blue-600">
              {nodes.length}
            </div>
            <div className="text-xs text-muted-foreground">Total Nodes</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-green-600">
              {edges.length}
            </div>
            <div className="text-xs text-muted-foreground">Relationships</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-purple-600">
              {new Set(nodes.map((n: any) => n.type)).size}
            </div>
            <div className="text-xs text-muted-foreground">Node Types</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-orange-600">
              {graph.metadata?.density
                ? graph.metadata.density.toFixed(3)
                : "0.000"}
            </div>
            <div className="text-xs text-muted-foreground">Graph Density</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ==================== SIMPLE ONTOLOGY VISUALIZATION ====================
interface SimpleOntologyVisualizationProps {
  data: OntologyResponse;
}

export const SimpleOntologyVisualization = ({
  data,
}: SimpleOntologyVisualizationProps) => {
  const [selectedNode, setSelectedNode] = useState<OntologyNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<OntologyEdge | null>(null);
  const [layout, setLayout] = useState<
    "force_directed" | "hierarchical" | "circular"
  >("force_directed");

  if (!data || !data.analysis?.graph) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <GitGraph className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Data ontology tidak tersedia</p>
        </div>
      </div>
    );
  }

  const graph = data.analysis.graph;
  const { nodes, edges } = graph;

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <GitGraph className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Tidak ada nodes untuk divisualisasikan</p>
        </div>
      </div>
    );
  }

  const getNodeInitial = (label: string): string => {
    if (!label) return "?";
    return label.charAt(0).toUpperCase();
  };

  const getSimpleNodeSize = (confidence?: number): number => {
    const baseSize = 40;
    const confidenceBonus = confidence ? confidence * 20 : 0;
    return baseSize + confidenceBonus;
  };

  const getSimpleEdgeWidth = (confidence?: number): number => {
    const baseWidth = 2;
    const confidenceBonus = confidence ? confidence * 3 : 0;
    return baseWidth + confidenceBonus;
  };

  return (
    <div className="space-y-4">
      {/* Layout Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Layout:</span>
          <Select
            value={layout}
            onValueChange={(value: any) => setLayout(value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="force_directed">Force Directed</SelectItem>
              <SelectItem value="hierarchical">Hierarchical</SelectItem>
              <SelectItem value="circular">Circular</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{nodes.length} nodes</span>
          <span>{edges.length} edges</span>
          <span>{graph.metadata?.node_types?.length || 0} types</span>
        </div>
      </div>

      {/* Ontology Graph Visualization */}
      <div className="relative h-96 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border-2 border-dashed border-indigo-200 overflow-hidden">
        {/* Simple Ontology Visualization */}
        <div className="absolute inset-0">
          {nodes.map((node: OntologyNode, index: number) => {
            let x, y;

            // Calculate positions based on layout
            if (layout === "circular") {
              const angle = (index * 2 * Math.PI) / nodes.length;
              const radius = Math.min(120, 80 + nodes.length * 3);
              x = 200 + radius * Math.cos(angle);
              y = 180 + radius * Math.sin(angle);
            } else if (layout === "hierarchical") {
              const row = Math.floor(index / 5);
              const col = index % 5;
              x = 100 + col * 80;
              y = 80 + row * 80;
            } else {
              // Force directed - random positions with some clustering
              const cluster = node.type ? node.type.charCodeAt(0) % 3 : 0;
              x = 150 + Math.random() * 200 + cluster * 50;
              y = 100 + Math.random() * 200 + cluster * 50;
            }

            const nodeColor = getNodeColor(node.type);
            const nodeSize = getSimpleNodeSize(node.confidence);

            return (
              <div
                key={node.id}
                className="absolute rounded-full flex items-center justify-center text-xs font-medium cursor-pointer transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-all shadow-lg border-2 border-white"
                style={{
                  left: x,
                  top: y,
                  width: nodeSize,
                  height: nodeSize,
                  backgroundColor: nodeColor,
                  color: "white",
                  fontSize: Math.max(10, nodeSize / 3),
                }}
                onClick={() => setSelectedNode(node)}
                title={`${node.label}\nType: ${node.type}\nConfidence: ${
                  node.confidence
                    ? (node.confidence * 100).toFixed(1) + "%"
                    : "N/A"
                }`}
              >
                {getNodeInitial(node.label)}
              </div>
            );
          })}

          {/* Render edges/connections */}
          {edges.map((edge: OntologyEdge, index: number) => {
            const sourceNode = nodes.find((n) => n.id === edge.source);
            const targetNode = nodes.find((n) => n.id === edge.target);

            if (!sourceNode || !targetNode) return null;

            // Find positions (this is simplified - in real app you'd store positions)
            const sourceIndex = nodes.indexOf(sourceNode);
            const targetIndex = nodes.indexOf(targetNode);

            let sourceX, sourceY, targetX, targetY;

            if (layout === "circular") {
              const sourceAngle = (sourceIndex * 2 * Math.PI) / nodes.length;
              const targetAngle = (targetIndex * 2 * Math.PI) / nodes.length;
              const radius = Math.min(120, 80 + nodes.length * 3);

              sourceX = 200 + radius * Math.cos(sourceAngle);
              sourceY = 180 + radius * Math.sin(sourceAngle);
              targetX = 200 + radius * Math.cos(targetAngle);
              targetY = 180 + radius * Math.sin(targetAngle);
            } else {
              // Simplified positioning for other layouts
              sourceX = 150 + (sourceIndex % 10) * 40;
              sourceY = 100 + Math.floor(sourceIndex / 10) * 40;
              targetX = 150 + (targetIndex % 10) * 40;
              targetY = 100 + Math.floor(targetIndex / 10) * 40;
            }

            const edgeColor = getEdgeColor(edge.type);
            const edgeWidth = getSimpleEdgeWidth(edge.confidence);

            return (
              <svg
                key={`edge-${index}`}
                className="absolute inset-0 pointer-events-none"
              >
                <line
                  x1={sourceX}
                  y1={sourceY}
                  x2={targetX}
                  y2={targetY}
                  stroke={edgeColor}
                  strokeWidth={edgeWidth}
                  strokeDasharray={
                    edge.confidence && edge.confidence < 0.5 ? "5,5" : "none"
                  }
                />

                {/* Edge label */}
                {edge.label && (
                  <text
                    x={(sourceX + targetX) / 2}
                    y={(sourceY + targetY) / 2 - 5}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#64748b"
                    className="pointer-events-auto cursor-pointer"
                    onClick={() => setSelectedEdge(edge)}
                  >
                    {edge.label}
                  </text>
                )}
              </svg>
            );
          })}
        </div>

        {/* Legend */}
        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg p-3 text-xs shadow-sm border">
          <div className="font-medium mb-2 text-sm">Node Types:</div>
          <div className="space-y-1">
            {Array.from(new Set(nodes.map((n) => n.type)))
              .slice(0, 5)
              .map((type) => (
                <div key={type} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getNodeColor(type) }}
                  ></div>
                  <span className="capitalize">{type}</span>
                  <span className="text-muted-foreground">
                    ({nodes.filter((n) => n.type === type).length})
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Node Details */}
      {selectedNode && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Node Details</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedNode(null)}
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <strong className="text-blue-700">Label:</strong>
                  <div className="mt-1">{selectedNode.label}</div>
                </div>
                <div>
                  <strong className="text-blue-700">Type:</strong>
                  <div className="mt-1 capitalize">{selectedNode.type}</div>
                </div>
                <div>
                  <strong className="text-blue-700">Confidence:</strong>
                  <div className="mt-1">
                    {selectedNode.confidence
                      ? `${(selectedNode.confidence * 100).toFixed(1)}%`
                      : "N/A"}
                  </div>
                </div>
                <div>
                  <strong className="text-blue-700">ID:</strong>
                  <div className="mt-1 font-mono text-xs">
                    {selectedNode.id}
                  </div>
                </div>
              </div>

              {selectedNode.categories &&
                selectedNode.categories.length > 0 && (
                  <div>
                    <strong className="text-blue-700">Categories:</strong>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedNode.categories.map((cat, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-xs"
                        >
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

              {selectedNode.metadata &&
                Object.keys(selectedNode.metadata).length > 0 && (
                  <div>
                    <strong className="text-blue-700">Metadata:</strong>
                    <pre className="text-xs mt-1 p-2 bg-white rounded border max-h-32 overflow-auto">
                      {JSON.stringify(selectedNode.metadata, null, 2)}
                    </pre>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edge Details */}
      {selectedEdge && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Edge Details</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedEdge(null)}
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <strong className="text-green-700">Type:</strong>
                  <div className="mt-1 capitalize">{selectedEdge.type}</div>
                </div>
                <div>
                  <strong className="text-green-700">Confidence:</strong>
                  <div className="mt-1">
                    {selectedEdge.confidence
                      ? `${(selectedEdge.confidence * 100).toFixed(1)}%`
                      : "N/A"}
                  </div>
                </div>
                <div>
                  <strong className="text-green-700">Source:</strong>
                  <div className="mt-1 font-mono text-xs">
                    {selectedEdge.source as string}
                  </div>
                </div>
                <div>
                  <strong className="text-green-700">Target:</strong>
                  <div className="mt-1 font-mono text-xs">
                    {selectedEdge.target as string}
                  </div>
                </div>
              </div>

              {selectedEdge.label && (
                <div>
                  <strong className="text-green-700">Label:</strong>
                  <div className="mt-1">{selectedEdge.label}</div>
                </div>
              )}

              {selectedEdge.metadata &&
                Object.keys(selectedEdge.metadata).length > 0 && (
                  <div>
                    <strong className="text-green-700">Metadata:</strong>
                    <pre className="text-xs mt-1 p-2 bg-white rounded border max-h-32 overflow-auto">
                      {JSON.stringify(selectedEdge.metadata, null, 2)}
                    </pre>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ontology Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-blue-600">
              {nodes.length}
            </div>
            <div className="text-xs text-muted-foreground">Total Nodes</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-green-600">
              {edges.length}
            </div>
            <div className="text-xs text-muted-foreground">Relationships</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-purple-600">
              {graph.metadata?.node_types?.length || 0}
            </div>
            <div className="text-xs text-muted-foreground">Node Types</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-orange-600">
              {graph.metadata?.density
                ? graph.metadata.density.toFixed(3)
                : "0.000"}
            </div>
            <div className="text-xs text-muted-foreground">Graph Density</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ==================== ENHANCED ONTOLOGY CONTENT ====================
interface EnhancedOntologyContentProps {
  data: OntologyResponse;
}

// Arrow component untuk relations tab
const ArrowRight = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M14 5l7 7m0 0l-7 7m7-7H3"
    />
  </svg>
);

export const EnhancedOntologyContent = ({
  data,
}: EnhancedOntologyContentProps) => {
  const [activeTab, setActiveTab] = useState<
    "d3_graph" | "simple_graph" | "entities" | "relations" | "analysis"
  >("d3_graph");

  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <GitGraph className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Data ontology tidak tersedia</p>
      </div>
    );
  }

  const analysis = data.analysis;
  const graph = analysis?.graph;
  const ontology = analysis?.ontology;
  const statistics = analysis?.statistics;
  const narrative = analysis?.narrative || data.narrative;

  return (
    <div className="space-y-6">
      {/* Mode and Metadata */}
      <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg border border-indigo-200">
        <div className="flex items-center gap-4">
          <Badge
            variant="default"
            className="bg-indigo-100 text-indigo-700 border-indigo-200"
          >
            <GitGraph className="w-3 h-3 mr-1" />
            {data.mode} Mode
          </Badge>
          <div className="text-sm text-indigo-700">
            <span className="font-medium">Processing Time:</span>{" "}
            {data.metadata.processing_time}ms
          </div>
          <div className="text-sm text-indigo-700">
            <span className="font-medium">Output Format:</span>{" "}
            {data.metadata.output_format}
          </div>
        </div>
        <div className="text-sm text-indigo-700">
          <span className="font-medium">Analysis Depth:</span>{" "}
          {data.metadata.analysis_depth}
        </div>
      </div>

      {/* Narrative */}
      {narrative && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Analysis Narrative
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {removeMarkdownBold(narrative)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="border-b">
        <div className="flex space-x-8">
          {[
            // { id: "d3_graph" as const, label: "D3 Graph", icon: GitGraph }, //sudah bisa jalan tinggal hapus commentnya jika pengen digunakan
            // {
            //   id: "simple_graph" as const,
            //   label: "Simple Graph",
            //   icon: GitGraph,
            // },
            { id: "entities" as const, label: "Entities", icon: User },
            { id: "relations" as const, label: "Relations", icon: Link },
            { id: "analysis" as const, label: "Analysis", icon: Brain },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors",
                activeTab === tab.id
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === "d3_graph" && (
          <div className="space-y-4">
            {graph ? (
              <D3OntologyVisualization data={data} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <GitGraph className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Graph visualization tidak tersedia</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "simple_graph" && (
          <div className="space-y-4">
            {graph ? (
              <SimpleOntologyVisualization data={data} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <GitGraph className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Graph visualization tidak tersedia</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "entities" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Extracted Entities ({ontology?.entities?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ontology?.entities && ontology.entities.length > 0 ? (
                  <div className="space-y-3">
                    {ontology.entities
                      .slice(0, 20)
                      .map((entity: any, index: number) => (
                        <div
                          key={entity.id || index}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor:
                                  ONTOLOGY_NODE_COLORS[entity.type] ||
                                  ONTOLOGY_NODE_COLORS.default,
                              }}
                            ></div>
                            <div>
                              <div className="font-medium">
                                {entity.text || entity.label}
                              </div>
                              <div className="text-sm text-muted-foreground capitalize">
                                {entity.type} • Confidence:{" "}
                                {entity.confidence
                                  ? (entity.confidence * 100).toFixed(1) + "%"
                                  : "N/A"}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {entity.type}
                          </Badge>
                        </div>
                      ))}
                    {ontology.entities.length > 20 && (
                      <div className="text-center text-sm text-muted-foreground pt-2">
                        ... dan {ontology.entities.length - 20} entitas lainnya
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Tidak ada entities yang diekstrak</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "relations" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Link className="w-4 h-4" />
                  Extracted Relations ({ontology?.relations?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ontology?.relations && ontology.relations.length > 0 ? (
                  <div className="space-y-3">
                    {ontology.relations
                      .slice(0, 15)
                      .map((relation: any, index: number) => {
                        // Helper function untuk extract label yang lebih readable dari ID
                        const getReadableLabel = (id: string) => {
                          if (!id) return "Unknown";

                          // Coba extract dari format person_tingkat_kerja_sama_1761625571530_guemr
                          const parts = id.split("_");
                          if (parts.length >= 3) {
                            // Ambil bagian tengah (exclude prefix dan timestamp/suffix)
                            const meaningfulParts = parts.slice(1, -2); // Exclude type prefix dan timestamp/suffix
                            if (meaningfulParts.length > 0) {
                              return meaningfulParts
                                .join(" ")
                                .replace(/([A-Z])/g, " $1")
                                .replace(/_/g, " ")
                                .trim()
                                .split(" ")
                                .map(
                                  (word) =>
                                    word.charAt(0).toUpperCase() + word.slice(1)
                                )
                                .join(" ");
                            }
                          }

                          // Fallback: remove underscores and capitalize
                          return id
                            .replace(/_/g, " ")
                            .replace(/([A-Z])/g, " $1")
                            .trim()
                            .split(" ")
                            .map(
                              (word) =>
                                word.charAt(0).toUpperCase() + word.slice(1)
                            )
                            .join(" ");
                        };

                        // Extract source dan target yang readable
                        const sourceLabel = getReadableLabel(
                          relation.source || relation.source_entity || ""
                        );
                        const targetLabel = getReadableLabel(
                          relation.target || relation.target_entity || ""
                        );

                        // Buat relation description yang lebih natural
                        const getRelationDescription = () => {
                          const relationType = relation.type || "related";
                          const readableType = relationType
                            .replace(/_/g, " ")
                            .split(" ")
                            .map(
                              (word: string) =>
                                word.charAt(0).toUpperCase() + word.slice(1)
                            )
                            .join(" ");

                          return `${readableType}: ${sourceLabel} → ${targetLabel}`;
                        };

                        return (
                          <div
                            key={relation.id || index}
                            className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{
                                    backgroundColor:
                                      ONTOLOGY_EDGE_COLORS[relation.type] ||
                                      ONTOLOGY_EDGE_COLORS.default,
                                  }}
                                ></div>
                                <span className="font-medium text-sm">
                                  {getRelationDescription()}
                                </span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {relation.confidence
                                  ? (relation.confidence * 100).toFixed(0) + "%"
                                  : "N/A"}
                              </Badge>
                            </div>

                            <div className="text-sm grid grid-cols-3 gap-4 items-center">
                              <div className="text-center p-2 bg-blue-50 rounded border">
                                <div className="font-semibold text-blue-700">
                                  {sourceLabel}
                                </div>
                                <div className="text-xs text-blue-600 mt-1 capitalize">
                                  {relation.source_type || "entity"}
                                </div>
                              </div>

                              <div className="flex flex-col items-center justify-center">
                                <ArrowRight className="w-4 h-4 text-gray-500 mb-1" />
                                <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded capitalize">
                                  {relation.type?.replace(/_/g, " ") ||
                                    "related"}
                                </span>
                              </div>

                              <div className="text-center p-2 bg-green-50 rounded border">
                                <div className="font-semibold text-green-700">
                                  {targetLabel}
                                </div>
                                <div className="text-xs text-green-600 mt-1 capitalize">
                                  {relation.target_type || "entity"}
                                </div>
                              </div>
                            </div>

                            {/* Relation context/evidence */}
                            {relation.text && (
                              <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600 border">
                                <span className="font-medium">Context: </span>"
                                {relation.text}"
                              </div>
                            )}

                            {/* Metadata tambahan */}
                            {(relation.metadata || relation.evidence) && (
                              <div className="mt-2 flex gap-2">
                                {relation.metadata && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    Metadata
                                  </Badge>
                                )}
                                {relation.evidence && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    Evidence
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    {ontology.relations.length > 15 && (
                      <div className="text-center text-sm text-muted-foreground pt-2">
                        ... dan {ontology.relations.length - 15} relations
                        lainnya
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Link className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Tidak ada relations yang diekstrak</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "analysis" && (
          <div className="space-y-4">
            {/* Statistics */}
            {statistics && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChartIcon className="w-4 h-4" />
                    Analysis Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {statistics.total_entities ||
                          ontology?.metadata?.total_entities ||
                          0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total Entities
                      </div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {statistics.total_relations ||
                          ontology?.metadata?.total_relations ||
                          0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total Relations
                      </div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {statistics.total_events || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Events
                      </div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {statistics.average_confidence?.entities
                          ? (
                              statistics.average_confidence.entities * 100
                            ).toFixed(1) + "%"
                          : "N/A"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Avg Confidence
                      </div>
                    </div>
                  </div>

                  {/* Entity Type Distribution */}
                  {statistics.entity_type_distribution && (
                    <div className="mt-6">
                      <h4 className="font-medium mb-3">
                        Entity Type Distribution
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(
                          statistics.entity_type_distribution
                        ).map(([type, count]: [string, any]) => (
                          <div
                            key={type}
                            className="flex items-center justify-between"
                          >
                            <span className="text-sm capitalize">{type}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-indigo-600 h-2 rounded-full"
                                  style={{
                                    width: `${
                                      (count / statistics.total_entities) * 100
                                    }%`,
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium w-8">
                                {count}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Insights and Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.insights && data.insights.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-yellow-600" />
                      Key Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {data.insights.map((insight: any, index: number) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm"
                        >
                          <Sparkles className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>
                            {removeMarkdownBold(
                              insight.title || insight.description || insight
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {data.recommendations && data.recommendations.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-600" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {data.recommendations.map((rec: any, index: number) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm"
                        >
                          <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span>
                            {removeMarkdownBold(
                              rec.title || rec.description || rec
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
