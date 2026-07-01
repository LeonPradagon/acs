"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { ZoomIn, ZoomOut, Maximize, Crosshair } from "lucide-react";

interface NodeData {
  id: string;
  name: string;
  group: string;
  val: number;
}

interface LinkData {
  source: string;
  target: string;
}

interface GraphData {
  nodes: NodeData[];
  links: LinkData[];
}

// Enterprise / Palantir-style Professional Color Palette
const GROUP_COLORS: Record<string, { main: string; border: string }> = {
  core: { main: "#818cf8", border: "#c7d2fe" }, // Indigo
  document: { main: "#10b981", border: "#6ee7b7" }, // Emerald
  concept: { main: "#f59e0b", border: "#fcd34d" }, // Amber
  user: { main: "#38bdf8", border: "#bae6fd" }, // Sky
};

const DEFAULT_COLOR = { main: "#94a3b8", border: "#cbd5e1" }; // Slate

export default function SemanticGraph({ data }: { data: GraphData }) {
  const fgRef = useRef<any>();
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight || 500,
        });
      }
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Initial fit
  useEffect(() => {
    if (fgRef.current && data.nodes.length > 0) {
      setTimeout(() => {
        fgRef.current.zoomToFit(800, 80);
      }, 500);
    }
  }, [data]);

  const handleZoomIn = useCallback(
    () => fgRef.current?.zoom(fgRef.current.zoom() * 1.4, 400),
    [],
  );
  const handleZoomOut = useCallback(
    () => fgRef.current?.zoom(fgRef.current.zoom() * 0.6, 400),
    [],
  );
  const handleFit = useCallback(() => {
    fgRef.current?.zoomToFit(600, 80);
    setSelectedNode(null);
  }, []);

  const handleNodeClick = useCallback((node: any) => {
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 600);
      fgRef.current.zoom(3.5, 600);
      setSelectedNode(node);
    }
  }, []);

  // Professional crisp node rendering
  const paintNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;

      const isHovered = hoveredNode?.id === node.id;
      const isSelected = selectedNode?.id === node.id;
      const isActive = isHovered || isSelected;
      const isCore = node.group === "core";

      const colors = GROUP_COLORS[node.group] || DEFAULT_COLOR;
      const radius = isCore ? 8 : node.val || 5;

      // Node Fill
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? colors.border : colors.main;
      ctx.fill();

      // Node Border
      ctx.lineWidth = isActive ? 2 / globalScale : 1 / globalScale;
      ctx.strokeStyle = isActive ? "#ffffff" : colors.border;
      ctx.stroke();

      // Active state ring
      if (isActive) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 4 / globalScale, 0, Math.PI * 2);
        ctx.strokeStyle = colors.main;
        ctx.lineWidth = 1.5 / globalScale;
        ctx.stroke();
      }

      // Label logic - show only on hover, select, or if zoomed in enough (globalScale > 1.5)
      const showLabel = isActive || globalScale > 1.8 || isCore;

      if (showLabel && node.name) {
        const fontSize = isActive ? 12 / globalScale : 10 / globalScale;
        ctx.font = `${isActive ? "600" : "400"} ${fontSize}px 'Inter', sans-serif`;
        const textWidth = ctx.measureText(node.name).width;

        const labelY = node.y + radius + 8 / globalScale + fontSize / 2;

        // Subtle background for readability
        ctx.fillStyle = "rgba(11, 14, 23, 0.7)"; // Match the background
        ctx.fillRect(
          node.x - textWidth / 2 - 4 / globalScale,
          labelY - fontSize / 2 - 2 / globalScale,
          textWidth + 8 / globalScale,
          fontSize + 4 / globalScale,
        );

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = isActive ? "#ffffff" : "rgba(255, 255, 255, 0.7)";
        ctx.fillText(node.name, node.x, labelY);
      }
    },
    [hoveredNode, selectedNode],
  );

  // Minimalist crisp links
  const paintLink = useCallback(
    (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const source = link.source;
      const target = link.target;
      if (
        !Number.isFinite(source?.x) ||
        !Number.isFinite(source?.y) ||
        !Number.isFinite(target?.x) ||
        !Number.isFinite(target?.y)
      )
        return;

      const isHovered =
        hoveredNode?.id === source.id || hoveredNode?.id === target.id;
      const isSelected =
        selectedNode?.id === source.id || selectedNode?.id === target.id;
      const isActive = isHovered || isSelected;

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);

      // Professional low-opacity links, highlighting only active paths
      ctx.strokeStyle = isActive
        ? "rgba(255, 255, 255, 0.4)"
        : "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = isActive ? 1.5 / globalScale : 0.8 / globalScale;
      ctx.stroke();
    },
    [hoveredNode, selectedNode],
  );

  const activeHudNode = selectedNode || hoveredNode;

  return (
    <div
      ref={containerRef}
      className="w-full h-[450px] md:h-[550px] bg-[#0b0e17] overflow-hidden relative rounded-b-xl border-t border-white/5 font-sans"
    >
      {/* Professional subtle grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0b0e17_100%)] pointer-events-none" />

      {/* Elegant Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-1 z-20">
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 flex items-center justify-center bg-[#151b2b]/90 border border-white/10 hover:border-white/30 rounded text-white/60 hover:text-white transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 flex items-center justify-center bg-[#151b2b]/90 border border-white/10 hover:border-white/30 rounded text-white/60 hover:text-white transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleFit}
          className="w-8 h-8 flex items-center justify-center bg-[#151b2b]/90 border border-white/10 hover:border-white/30 rounded text-white/60 hover:text-white transition-colors mt-1"
          title="Reset View"
        >
          <Maximize className="w-3.5 h-3.5" />
        </button>
      </div>

      {data.nodes.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-white/40 z-10 text-xs tracking-widest uppercase">
          Initializing Topology...
        </div>
      ) : (
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={data}
          nodeCanvasObject={paintNode}
          linkCanvasObject={paintLink}
          nodeRelSize={6}
          // Subtle professional particles
          linkDirectionalParticles={1}
          linkDirectionalParticleWidth={1.5}
          linkDirectionalParticleSpeed={0.003}
          linkDirectionalParticleColor={() => "rgba(255,255,255,0.6)"}
          backgroundColor="transparent"
          cooldownTicks={100}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
          onNodeHover={(node: any) => setHoveredNode(node)}
          onNodeClick={handleNodeClick}
          onBackgroundClick={() => setSelectedNode(null)}
          enablePointerInteraction={true}
        />
      )}

      {/* Enterprise HUD Panel */}
      <div
        className={`absolute bottom-5 left-5 z-20 transition-opacity duration-200 pointer-events-none ${activeHudNode ? "opacity-100" : "opacity-0"}`}
      >
        {activeHudNode && (
          <div className="bg-[#111623]/95 backdrop-blur-md border border-white/10 rounded-lg p-4 shadow-xl min-w-[260px]">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor:
                      GROUP_COLORS[activeHudNode.group]?.main || "#fff",
                  }}
                />
                <span className="text-[10px] font-semibold text-white/50 uppercase tracking-widest">
                  {activeHudNode.group}
                </span>
              </div>
              {selectedNode?.id === activeHudNode.id && (
                <span className="flex items-center gap-1 text-[9px] text-[#818cf8] border border-[#818cf8]/30 bg-[#818cf8]/10 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                  <Crosshair className="w-2.5 h-2.5" /> Target Lock
                </span>
              )}
            </div>
            <div className="text-sm font-medium text-white/90 truncate mb-1">
              {activeHudNode.name}
            </div>
            <div className="text-[10px] text-white/30 font-mono">
              ID: {activeHudNode.id}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
