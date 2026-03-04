// components/universal-d3-visualization.tsx
"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import * as d3 from "d3";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Filter,
  Network,
  Link,
  GitGraph,
  BarChart3,
  LineChart,
  PieChart,
  LayoutGrid,
  Target,
  FishSymbol,
  Workflow,
  AlertTriangle,
  Map,
} from "lucide-react";

// ==================== TYPE DEFINITIONS ====================
interface BaseVisualizationData {
  items?: any[];
  nodes?: any[];
  links?: any[];
  groups?: any[];
  quadrants?: any;
  strengths?: any[];
  weaknesses?: any[];
  opportunities?: any[];
  threats?: any[];
  problem?: string;
  categories?: any[];
  causes?: any[];
  dimensions?: any;
}

interface UniversalD3VisualizationProps {
  data: any[] | BaseVisualizationData;
  type: string;
  title: string;
  description?: string;
  className?: string;
  narrative?: string;
  insights?: string[];
  recommendations?: string[];
}

// Type configurations dengan icon dan warna
const VISUALIZATION_CONFIGS = {
  network: {
    icon: Network,
    color: "bg-purple-100 text-purple-700",
    label: "Social Network Analysis",
  },
  link_analysis: {
    icon: Link,
    color: "bg-blue-100 text-blue-700",
    label: "Link Analysis",
  },
  mesh_mapping: {
    icon: Map,
    color: "bg-green-100 text-green-700",
    label: "Mesh Mapping",
  },
  bar_chart: {
    icon: BarChart3,
    color: "bg-orange-100 text-orange-700",
    label: "Bar Chart",
  },
  line_chart: {
    icon: LineChart,
    color: "bg-red-100 text-red-700",
    label: "Line Chart",
  },
  pie_chart: {
    icon: PieChart,
    color: "bg-pink-100 text-pink-700",
    label: "Pie Chart",
  },
  quadrant: {
    icon: LayoutGrid,
    color: "bg-indigo-100 text-indigo-700",
    label: "Quadrant Analysis",
  },
  swot: {
    icon: Target,
    color: "bg-yellow-100 text-yellow-700",
    label: "SWOT Analysis",
  },
  fishbone: {
    icon: FishSymbol,
    color: "bg-cyan-100 text-cyan-700",
    label: "Fishbone Analysis",
  },
  causality: {
    icon: Workflow,
    color: "bg-teal-100 text-teal-700",
    label: "Causality Analysis",
  },
  threat_matrix: {
    icon: AlertTriangle,
    color: "bg-rose-100 text-rose-700",
    label: "Threat Matrix",
  },
};

// ==================== TYPE GUARDS ====================
const isArrayData = (data: any): data is any[] => {
  return Array.isArray(data);
};

const isNetworkData = (data: any): data is BaseVisualizationData => {
  return data && (data.nodes !== undefined || data.items !== undefined);
};

const isQuadrantData = (data: any): data is BaseVisualizationData => {
  return data && data.quadrants !== undefined;
};

const isSWOTData = (data: any): data is BaseVisualizationData => {
  return (
    data &&
    (data.strengths !== undefined ||
      data.weaknesses !== undefined ||
      data.opportunities !== undefined ||
      data.threats !== undefined)
  );
};

const isFishboneData = (data: any): data is BaseVisualizationData => {
  return data && data.problem !== undefined;
};

const isThreatMatrixData = (data: any): data is BaseVisualizationData => {
  return data && data.dimensions !== undefined;
};

export const UniversalD3Visualization = ({
  data,
  type,
  title,
  description,
  className = "",
  narrative,
  insights = [],
  recommendations = [],
}: UniversalD3VisualizationProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [selectedData, setSelectedData] = useState<any[]>([]);
  const [transform, setTransform] = useState(d3.zoomIdentity);
  const [activeTab, setActiveTab] = useState<
    "visualization" | "narrative" | "insights" | "recommendations"
  >("visualization");

  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const simulationRef = useRef<d3.Simulation<any, any> | null>(null);

  const config = VISUALIZATION_CONFIGS[
    type as keyof typeof VISUALIZATION_CONFIGS
  ] || { icon: BarChart3, color: "bg-gray-100 text-gray-700", label: type };

  // Update dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const container = containerRef.current;
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

  // Process data berdasarkan tipe visualisasi
  const processData = useCallback(() => {
    if (!data) return null;

    // Handle array data
    if (isArrayData(data)) {
      const items = data;

      switch (type) {
        case "network":
        case "link_analysis":
          return {
            nodes: Array.isArray(items) ? items : [],
            links: [],
          };

        case "mesh_mapping":
          return {
            nodes: Array.isArray(items) ? items : [],
            links: [],
            groups: [],
          };

        case "bar_chart":
        case "line_chart":
        case "pie_chart":
          return Array.isArray(items)
            ? items.map((item: any, index: number) => ({
                id: item.id || `item-${index}`,
                label:
                  item.name || item.label || item.title || `Item ${index + 1}`,
                value:
                  typeof item.value === "number"
                    ? item.value
                    : typeof item.count === "number"
                    ? item.count
                    : typeof item.size === "number"
                    ? item.size
                    : 1,
                category: item.category || item.type || "default",
                color: item.color || undefined,
                ...item,
              }))
            : [];

        default:
          return Array.isArray(items) ? items : [];
      }
    }

    // Handle object data
    if (typeof data === "object" && data !== null) {
      const items = (data as BaseVisualizationData).items || [];

      switch (type) {
        case "network":
        case "link_analysis":
          return {
            nodes: (data as BaseVisualizationData).nodes || items,
            links: (data as BaseVisualizationData).links || [],
          };

        case "mesh_mapping":
          return {
            nodes: (data as BaseVisualizationData).nodes || items,
            links: (data as BaseVisualizationData).links || [],
            groups: (data as BaseVisualizationData).groups || [],
          };

        case "bar_chart":
        case "line_chart":
        case "pie_chart":
          return Array.isArray(items)
            ? items.map((item: any, index: number) => ({
                id: item.id || `item-${index}`,
                label:
                  item.name || item.label || item.title || `Item ${index + 1}`,
                value:
                  typeof item.value === "number"
                    ? item.value
                    : typeof item.count === "number"
                    ? item.count
                    : typeof item.size === "number"
                    ? item.size
                    : 1,
                category: item.category || item.type || "default",
                color: item.color || undefined,
                ...item,
              }))
            : [];

        case "quadrant":
          return {
            quadrants: (data as BaseVisualizationData).quadrants || {
              q1: { label: "High Impact / High Probability", items: [] },
              q2: { label: "High Impact / Low Probability", items: [] },
              q3: { label: "Low Impact / Low Probability", items: [] },
              q4: { label: "Low Impact / High Probability", items: [] },
            },
            items: Array.isArray(items) ? items : [],
          };

        case "swot":
          return {
            strengths: (data as BaseVisualizationData).strengths || [],
            weaknesses: (data as BaseVisualizationData).weaknesses || [],
            opportunities: (data as BaseVisualizationData).opportunities || [],
            threats: (data as BaseVisualizationData).threats || [],
          };

        case "fishbone":
          return {
            problem: (data as BaseVisualizationData).problem || "Root Problem",
            categories: (data as BaseVisualizationData).categories || [
              { name: "People", causes: [] },
              { name: "Process", causes: [] },
              { name: "Technology", causes: [] },
              { name: "Environment", causes: [] },
            ],
            causes: (data as BaseVisualizationData).causes || [],
          };

        case "causality":
          return {
            nodes: (data as BaseVisualizationData).nodes || items,
            links: (data as BaseVisualizationData).links || [],
          };

        case "threat_matrix":
          return {
            threats: (data as BaseVisualizationData).threats || items,
            dimensions: (data as BaseVisualizationData).dimensions || {
              x: { label: "Probability", range: ["Low", "High"] },
              y: { label: "Impact", range: ["Low", "High"] },
            },
          };

        default:
          return Array.isArray(items) ? items : [];
      }
    }

    return null;
  }, [data, type]);

  // Main visualization renderer
  useEffect(() => {
    if (!svgRef.current) return;

    const processedData = processData();
    if (!processedData) return;

    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
      .style("background", "white")
      .style("border-radius", "8px");

    const g = svg.append("g");

    // Set up zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on("zoom", (event) => {
        setTransform(event.transform);
        g.attr("transform", event.transform);
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // Render berdasarkan tipe
    switch (type) {
      case "network":
      case "link_analysis":
        if (isNetworkData(processedData)) {
          renderNetworkAnalysis(g, processedData);
        }
        break;
      case "mesh_mapping":
        if (isNetworkData(processedData)) {
          renderMeshMapping(g, processedData);
        }
        break;
      case "bar_chart":
        if (isArrayData(processedData)) {
          renderBarChart(g, processedData);
        }
        break;
      case "line_chart":
        if (isArrayData(processedData)) {
          renderLineChart(g, processedData);
        }
        break;
      case "pie_chart":
        if (isArrayData(processedData)) {
          renderPieChart(g, processedData);
        }
        break;
      case "quadrant":
        if (isQuadrantData(processedData)) {
          renderQuadrantAnalysis(g, processedData);
        }
        break;
      case "swot":
        if (isSWOTData(processedData)) {
          renderSWOTAnalysis(g, processedData);
        }
        break;
      case "fishbone":
        if (isFishboneData(processedData)) {
          renderFishboneAnalysis(g, processedData);
        }
        break;
      case "causality":
        if (isNetworkData(processedData)) {
          renderCausalityAnalysis(g, processedData);
        }
        break;
      case "threat_matrix":
        if (isThreatMatrixData(processedData)) {
          renderThreatMatrix(g, processedData);
        }
        break;
      default:
        if (isArrayData(processedData)) {
          renderDefaultChart(g, processedData);
        }
    }
  }, [data, type, dimensions, processData]);

  // ==================== RENDER FUNCTIONS ====================

  const renderNetworkAnalysis = (
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    graphData: BaseVisualizationData
  ) => {
    const { nodes, links } = graphData;
    const nodeArray = nodes || [];
    const linkArray = links || [];

    if (!nodeArray || !Array.isArray(nodeArray)) return;

    // Force simulation
    const simulation = d3
      .forceSimulation(nodeArray)
      .force(
        "link",
        d3
          .forceLink(linkArray)
          .id((d: any) => d.id)
          .distance(100)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force(
        "center",
        d3.forceCenter(dimensions.width / 2, dimensions.height / 2)
      )
      .force("collision", d3.forceCollide().radius(30));

    simulationRef.current = simulation;

    // Create links
    const link = g
      .append("g")
      .selectAll("line")
      .data(linkArray)
      .enter()
      .append("line")
      .attr("stroke", "#999")
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.6);

    // Create nodes
    const node = g
      .append("g")
      .selectAll("circle")
      .data(nodeArray)
      .enter()
      .append("circle")
      .attr("r", (d: any) => d.size || Math.sqrt(d.value || 1) * 5 + 5)
      .attr(
        "fill",
        (d: any) =>
          d.color || d3.schemeCategory10[parseInt(d.id) % 10] || "#4f46e5"
      )
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .call(
        d3
          .drag<SVGCircleElement, any>()
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
        setSelectedData([d]);
      });

    // Node labels
    const label = g
      .append("g")
      .selectAll("text")
      .data(nodeArray)
      .enter()
      .append("text")
      .text((d: any) => d.label || d.name || d.id)
      .attr("font-size", "10px")
      .attr("dx", 12)
      .attr("dy", 4);

    // Update positions
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);

      label.attr("x", (d: any) => d.x).attr("y", (d: any) => d.y);
    });
  };

  const renderMeshMapping = (
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    meshData: BaseVisualizationData
  ) => {
    const { nodes, links, groups } = meshData;
    const nodeArray = nodes || [];
    const groupArray = groups || [];

    if (!nodeArray || !Array.isArray(nodeArray)) return;

    // Create convex hull untuk groups
    groupArray?.forEach((group: any, index: number) => {
      const groupNodes = nodeArray.filter((n: any) => n.group === group.id);
      if (groupNodes.length > 2) {
        const hull = d3.polygonHull(groupNodes.map((n: any) => [n.x, n.y])) as [
          number,
          number
        ][];
        if (hull) {
          g.append("path")
            .datum(hull)
            .attr("d", d3.line().curve(d3.curveCardinalClosed))
            .attr("fill", group.color || d3.schemeCategory10[index])
            .attr("fill-opacity", 0.1)
            .attr("stroke", group.color || d3.schemeCategory10[index])
            .attr("stroke-width", 1);
        }
      }
    });

    // Continue dengan network rendering yang sama
    renderNetworkAnalysis(g, meshData);
  };

  const renderBarChart = (
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: any[]
  ) => {
    const margin = { top: 40, right: 30, bottom: 80, left: 60 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    const chartGroup = g
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3
      .scaleBand()
      .domain(data.map((d) => d.label))
      .range([0, width])
      .padding(0.2);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.value) || 1])
      .range([height, 0])
      .nice();

    // Axes
    chartGroup
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)");

    chartGroup.append("g").call(d3.axisLeft(yScale));

    // Bars
    chartGroup
      .selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => xScale(d.label) || 0)
      .attr("y", (d) => yScale(d.value))
      .attr("width", xScale.bandwidth())
      .attr("height", (d) => height - yScale(d.value))
      .attr("fill", (d) => d.color || "#3b82f6")
      .attr("rx", 2)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        setSelectedData([d]);
      });

    // Title
    chartGroup
      .append("text")
      .attr("x", width / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .text(title);
  };

  const renderLineChart = (
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: any[]
  ) => {
    const margin = { top: 40, right: 30, bottom: 60, left: 60 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    const chartGroup = g
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3
      .scalePoint()
      .domain(data.map((d) => d.label))
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.value) || 1])
      .range([height, 0])
      .nice();

    // Line generator
    const line = d3
      .line<any>()
      .x((d) => xScale(d.label) || 0)
      .y((d) => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Axes
    chartGroup
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale));

    chartGroup.append("g").call(d3.axisLeft(yScale));

    // Line path
    chartGroup
      .append("path")
      .datum(data)
      .attr("class", "line")
      .attr("d", line)
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 3);

    // Data points
    chartGroup
      .selectAll(".dot")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", (d) => xScale(d.label) || 0)
      .attr("cy", (d) => yScale(d.value))
      .attr("r", 5)
      .attr("fill", "#3b82f6")
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        setSelectedData([d]);
      });
  };

  const renderPieChart = (
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: any[]
  ) => {
    const radius = Math.min(dimensions.width, dimensions.height) / 2 - 50;

    const pie = d3
      .pie<any>()
      .value((d) => Math.max(1, d.value))
      .sort(null);

    const arc = d3.arc<any>().innerRadius(0).outerRadius(radius);

    const labelArc = d3
      .arc<any>()
      .innerRadius(radius * 0.6)
      .outerRadius(radius * 0.6);

    const chartGroup = g
      .append("g")
      .attr(
        "transform",
        `translate(${dimensions.width / 2},${dimensions.height / 2})`
      );

    const arcs = chartGroup
      .selectAll(".arc")
      .data(pie(data))
      .enter()
      .append("g")
      .attr("class", "arc");

    // Slices
    arcs
      .append("path")
      .attr("d", arc)
      .attr("fill", (d, i) => d.data.color || d3.schemeCategory10[i])
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        setSelectedData([d.data]);
      });

    // Labels
    arcs
      .append("text")
      .attr("transform", (d) => `translate(${labelArc.centroid(d)})`)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .text((d) => {
        const percentage = (
          (d.data.value / d3.sum(data, (x) => x.value)) *
          100
        ).toFixed(1);
        return `${percentage}%`;
      });
  };

  const renderQuadrantAnalysis = (
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: BaseVisualizationData
  ) => {
    const margin = 80;
    const width = dimensions.width - margin * 2;
    const height = dimensions.height - margin * 2;

    const chartGroup = g
      .append("g")
      .attr("transform", `translate(${margin},${margin})`);

    // Draw quadrant lines
    chartGroup
      .append("line")
      .attr("x1", width / 2)
      .attr("y1", 0)
      .attr("x2", width / 2)
      .attr("y2", height)
      .attr("stroke", "#ccc")
      .attr("stroke-width", 1);

    chartGroup
      .append("line")
      .attr("x1", 0)
      .attr("y1", height / 2)
      .attr("x2", width)
      .attr("y2", height / 2)
      .attr("stroke", "#ccc")
      .attr("stroke-width", 1);

    // Quadrant labels
    const quadrantLabels = [
      { x: width / 4, y: height / 4, text: "Q1: High/High", color: "#ef4444" },
      {
        x: (width * 3) / 4,
        y: height / 4,
        text: "Q2: Low/High",
        color: "#f59e0b",
      },
      {
        x: width / 4,
        y: (height * 3) / 4,
        text: "Q3: Low/Low",
        color: "#10b981",
      },
      {
        x: (width * 3) / 4,
        y: (height * 3) / 4,
        text: "Q4: High/Low",
        color: "#3b82f6",
      },
    ];

    quadrantLabels.forEach((label) => {
      chartGroup
        .append("text")
        .attr("x", label.x)
        .attr("y", label.y)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", label.color)
        .text(label.text);
    });

    // Plot items
    data.items?.forEach((item: any) => {
      const x = (item.x || Math.random()) * width;
      const y = (item.y || Math.random()) * height;

      chartGroup
        .append("circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", 6)
        .attr("fill", item.color || "#6b7280")
        .style("cursor", "pointer")
        .on("click", () => setSelectedData([item]));

      chartGroup
        .append("text")
        .attr("x", x + 10)
        .attr("y", y)
        .attr("font-size", "10px")
        .text(item.label);
    });
  };

  const renderSWOTAnalysis = (
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: BaseVisualizationData
  ) => {
    const width = dimensions.width;
    const height = dimensions.height;
    const cellWidth = width / 2;
    const cellHeight = height / 2;

    const swotData = [
      {
        type: "strengths",
        data: data.strengths || [],
        color: "#10b981",
        position: [0, 0],
      },
      {
        type: "weaknesses",
        data: data.weaknesses || [],
        color: "#ef4444",
        position: [cellWidth, 0],
      },
      {
        type: "opportunities",
        data: data.opportunities || [],
        color: "#3b82f6",
        position: [0, cellHeight],
      },
      {
        type: "threats",
        data: data.threats || [],
        color: "#f59e0b",
        position: [cellWidth, cellHeight],
      },
    ];

    swotData.forEach((section, index) => {
      const [x, y] = section.position;

      // Background
      g.append("rect")
        .attr("x", x)
        .attr("y", y)
        .attr("width", cellWidth)
        .attr("height", cellHeight)
        .attr("fill", section.color)
        .attr("fill-opacity", 0.1)
        .attr("stroke", section.color);

      // Title
      g.append("text")
        .attr("x", x + cellWidth / 2)
        .attr("y", y + 25)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("fill", section.color)
        .text(section.type.toUpperCase());

      // Items
      section.data?.slice(0, 5).forEach((item: any, i: number) => {
        g.append("text")
          .attr("x", x + 20)
          .attr("y", y + 50 + i * 20)
          .style("font-size", "11px")
          .text(
            `• ${typeof item === "string" ? item : item.text || item.label}`
          );
      });
    });
  };

  const renderFishboneAnalysis = (
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: BaseVisualizationData
  ) => {
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    // Main bone (horizontal line)
    g.append("line")
      .attr("x1", 50)
      .attr("y1", centerY)
      .attr("x2", dimensions.width - 50)
      .attr("y2", centerY)
      .attr("stroke", "#000")
      .attr("stroke-width", 2);

    // Problem statement
    g.append("text")
      .attr("x", centerX)
      .attr("y", centerY - 20)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text(data.problem || "Root Problem");

    // Categories (bones)
    data.categories?.forEach((category: any, index: number) => {
      const angle =
        (index / (data.categories?.length || 1)) * Math.PI - Math.PI / 2;
      const boneLength = 150;

      const x2 = centerX + Math.cos(angle) * boneLength;
      const y2 = centerY + Math.sin(angle) * boneLength;

      // Category bone
      g.append("line")
        .attr("x1", centerX)
        .attr("y1", centerY)
        .attr("x2", x2)
        .attr("y2", y2)
        .attr("stroke", "#666")
        .attr("stroke-width", 1);

      // Category label
      g.append("text")
        .attr("x", x2 + Math.cos(angle) * 20)
        .attr("y", y2 + Math.sin(angle) * 20)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text(category.name);

      // Causes
      category.causes?.forEach((cause: any, causeIndex: number) => {
        const causeX =
          centerX + Math.cos(angle) * (boneLength * 0.3 + causeIndex * 30);
        const causeY =
          centerY + Math.sin(angle) * (boneLength * 0.3 + causeIndex * 30);

        g.append("circle")
          .attr("cx", causeX)
          .attr("cy", causeY)
          .attr("r", 3)
          .attr("fill", "#ef4444");

        g.append("text")
          .attr("x", causeX + Math.cos(angle) * 10)
          .attr("y", causeY + Math.sin(angle) * 10)
          .attr("font-size", "10px")
          .text(typeof cause === "string" ? cause : cause.text);
      });
    });
  };

  const renderCausalityAnalysis = (
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: BaseVisualizationData
  ) => {
    // Similar to network but with directional emphasis
    const { nodes, links } = data;
    const nodeArray = nodes || [];
    const linkArray = links || [];

    const simulation = d3
      .forceSimulation(nodeArray)
      .force(
        "link",
        d3
          .forceLink(linkArray)
          .id((d: any) => d.id)
          .distance(150)
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force(
        "center",
        d3.forceCenter(dimensions.width / 2, dimensions.height / 2)
      );

    // Links with arrows
    const link = g
      .append("g")
      .selectAll("line")
      .data(linkArray)
      .enter()
      .append("line")
      .attr("stroke", "#999")
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#arrow)");

    // Arrow marker definition
    const defs = g.append("defs");
    defs
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

    // Nodes
    const node = g
      .append("g")
      .selectAll("circle")
      .data(nodeArray)
      .enter()
      .append("circle")
      .attr("r", 8)
      .attr("fill", "#3b82f6")
      .style("cursor", "pointer")
      .on("click", (event, d: any) => setSelectedData([d]));

    // Labels
    const label = g
      .append("g")
      .selectAll("text")
      .data(nodeArray)
      .enter()
      .append("text")
      .text((d: any) => d.label)
      .attr("font-size", "10px")
      .attr("dx", 12)
      .attr("dy", 4);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);

      label.attr("x", (d: any) => d.x).attr("y", (d: any) => d.y);
    });
  };

  const renderThreatMatrix = (
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: BaseVisualizationData
  ) => {
    const margin = 80;
    const width = dimensions.width - margin * 2;
    const height = dimensions.height - margin * 2;

    const chartGroup = g
      .append("g")
      .attr("transform", `translate(${margin},${margin})`);

    // Draw grid
    chartGroup
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "none")
      .attr("stroke", "#ccc");

    // Axes labels
    chartGroup
      .append("text")
      .attr("x", width / 2)
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text(data.dimensions?.x?.label || "Probability");

    chartGroup
      .append("text")
      .attr("x", -40)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90,-40," + height / 2 + ")")
      .style("font-size", "12px")
      .text(data.dimensions?.y?.label || "Impact");

    // Plot threats
    data.threats?.forEach((threat: any) => {
      const x = (threat.probability || threat.x || Math.random()) * width;
      const y = (1 - (threat.impact || threat.y || Math.random())) * height; // Invert y-axis

      const riskLevel = (threat.probability || 0.5) * (threat.impact || 0.5);
      const radius = Math.max(5, riskLevel * 20);
      const color =
        riskLevel > 0.6 ? "#ef4444" : riskLevel > 0.3 ? "#f59e0b" : "#10b981";

      chartGroup
        .append("circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", radius)
        .attr("fill", color)
        .attr("fill-opacity", 0.7)
        .style("cursor", "pointer")
        .on("click", () => setSelectedData([threat]));

      chartGroup
        .append("text")
        .attr("x", x)
        .attr("y", y - radius - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .text(threat.label || threat.name);
    });
  };

  const renderDefaultChart = (
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: any[]
  ) => {
    // Fallback to bar chart
    renderBarChart(g, Array.isArray(data) ? data : []);
  };

  // Control functions
  const handleResetZoom = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(750)
        .call(zoomRef.current.transform, d3.zoomIdentity);
    }
  };

  const handleZoomIn = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(250)
        .call(zoomRef.current.scaleBy, 1.5);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(250)
        .call(zoomRef.current.scaleBy, 0.75);
    }
  };

  const handleExport = () => {
    if (svgRef.current) {
      const svgData = new XMLSerializer().serializeToString(svgRef.current);
      const blob = new Blob([svgData], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${title.toLowerCase().replace(/\s+/g, "-")}.svg`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const processedData = processData();

  // Calculate data count safely
  const dataCount = isArrayData(processedData)
    ? processedData.length
    : (processedData as BaseVisualizationData)?.nodes?.length
    ? (processedData as BaseVisualizationData).nodes!.length
    : (processedData as BaseVisualizationData)?.items?.length
    ? (processedData as BaseVisualizationData).items!.length
    : 0;

  const IconComponent = config.icon;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IconComponent className="w-5 h-5 text-purple-600" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={config.color}>
              {config.label}
            </Badge>
            <Badge variant="outline">{dataCount} items</Badge>
          </div>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-2">{description}</p>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {/* Tabs untuk multiple content */}
        {(narrative || insights.length > 0 || recommendations.length > 0) && (
          <div className="border-b px-6">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab("visualization")}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "visualization"
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Visualization
              </button>
              {narrative && (
                <button
                  onClick={() => setActiveTab("narrative")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === "narrative"
                      ? "border-purple-500 text-purple-600"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Narrative
                </button>
              )}
              {insights.length > 0 && (
                <button
                  onClick={() => setActiveTab("insights")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === "insights"
                      ? "border-purple-500 text-purple-600"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Insights ({insights.length})
                </button>
              )}
              {recommendations.length > 0 && (
                <button
                  onClick={() => setActiveTab("recommendations")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === "recommendations"
                      ? "border-purple-500 text-purple-600"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Recommendations ({recommendations.length})
                </button>
              )}
            </div>
          </div>
        )}

        <div className="p-6">
          {activeTab === "visualization" && (
            <div className="space-y-4">
              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    Interactive D3 Visualization
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomIn}
                    className="h-7 w-7 p-0"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomOut}
                    className="h-7 w-7 p-0"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetZoom}
                    className="h-7 text-xs flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    className="h-7 text-xs flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    Export
                  </Button>
                </div>
              </div>

              {/* Visualization Container */}
              <div
                ref={containerRef}
                className="relative bg-white rounded-lg border overflow-hidden"
                style={{ height: "500px" }}
              >
                <svg ref={svgRef} className="w-full h-full cursor-move" />

                {/* Loading/Empty State */}
                {(!processedData || dataCount === 0) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                    <div className="text-center text-muted-foreground">
                      <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-muted flex items-center justify-center">
                        <Filter className="w-6 h-6" />
                      </div>
                      <p>No data available for visualization</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Data Panel */}
              {selectedData.length > 0 && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Selected Data</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedData([])}
                        className="h-6 w-6 p-0"
                      >
                        <Filter className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-32">
                      <div className="space-y-2 text-sm">
                        {selectedData.map((item, index) => (
                          <div key={index} className="p-2 border rounded">
                            {Object.entries(item)
                              .slice(0, 8)
                              .map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                  <span className="font-medium capitalize">
                                    {key}:
                                  </span>
                                  <span className="text-muted-foreground">
                                    {String(value)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Narrative Tab */}
          {activeTab === "narrative" && narrative && (
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed p-4 bg-muted rounded-lg">
                {narrative}
              </div>
            </div>
          )}

          {/* Insights Tab */}
          {activeTab === "insights" && insights.length > 0 && (
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 border rounded-lg"
                >
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm">{insight}</p>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations Tab */}
          {activeTab === "recommendations" && recommendations.length > 0 && (
            <div className="space-y-3">
              {recommendations.map((recommendation, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 border rounded-lg bg-blue-50"
                >
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm">{recommendation}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
