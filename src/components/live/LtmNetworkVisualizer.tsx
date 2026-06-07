import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { MemoryUpdate } from "../../types/agent.types";

interface Node extends d3.SimulationNodeDatum {
  id: string;
  group: string;
  label: string;
  radius: number;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  value: number;
}

interface LtmNetworkVisualizerProps {
  updates: MemoryUpdate[];
}

export default function LtmNetworkVisualizer({ updates }: LtmNetworkVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = 400;

    // Build graph data
    const nodes: Node[] = [
      { id: "Root", group: "core", label: "LTM Cluster", radius: 25 },
      { id: "TechStack", group: "tech_stack", label: "Tech Stack", radius: 15 },
      { id: "Architecture", group: "architecture", label: "Architecture", radius: 15 },
      { id: "Bottleneck", group: "bottleneck", label: "Bottleneck", radius: 15 },
    ];

    const links: Link[] = [
      { source: "Root", target: "TechStack", value: 3 },
      { source: "Root", target: "Architecture", value: 3 },
      { source: "Root", target: "Bottleneck", value: 3 },
    ];

    updates.forEach((u) => {
      nodes.push({
        id: u.key,
        group: u.type,
        label: u.key,
        radius: 10,
      });

      let targetGroup = "TechStack";
      if (u.type === "architecture") targetGroup = "Architecture";
      if (u.type === "bottleneck") targetGroup = "Bottleneck";

      links.push({
        source: targetGroup,
        target: u.key,
        value: 1,
      });
    });

    // Add cross-links between bottlenecks and architecture for visual flair
    const archNodes = nodes.filter(n => n.group === 'architecture' && n.id !== 'Architecture');
    const bottleNodes = nodes.filter(n => n.group === 'bottleneck' && n.id !== 'Bottleneck');
    
    bottleNodes.forEach(b => {
      if (archNodes.length > 0) {
        // Randomly link to an architecture node
        const target = archNodes[Math.floor(Math.random() * archNodes.length)];
        links.push({
          source: target.id,
          target: b.id,
          // Highlight connection between architecture and bottlenecks
          value: 2,
          isHighlight: true
        } as any);
      }
    });

    // Setup SVG
    d3.select(containerRef.current).select("svg").remove();
    const svg = d3
      .select(containerRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto; display: block;");

    // Defs for glowing effects and arrows
    const defs = svg.append("defs");
    
    // Gradient definitions
    const colors = {
      core: "#8b5cf6", // Purple
      tech_stack: "#06b6d4", // Cyan
      architecture: "#e879f9", // Fuchsia
      bottleneck: "#f43f5e" // Rose
    };

    Object.entries(colors).forEach(([key, color]) => {
      const gradient = defs.append("radialGradient")
        .attr("id", `glow-${key}`)
        .attr("cx", "50%")
        .attr("cy", "50%")
        .attr("r", "50%");
      gradient.append("stop").attr("offset", "0%").attr("stop-color", color).attr("stop-opacity", 0.8);
      gradient.append("stop").attr("offset", "100%").attr("stop-color", color).attr("stop-opacity", 0);
    });

    // Force simulation
    const simulation = d3
      .forceSimulation<Node>(nodes)
      .force("link", d3.forceLink<Node, Link>(links).id((d) => d.id).distance(60))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(d => (d as Node).radius + 10));

    // Draw Links
    const link = svg
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (d: any) => d.isHighlight ? "#f43f5e" : "#ffffff")
      .attr("stroke-opacity", (d: any) => d.isHighlight ? 0.6 : 0.15)
      .attr("stroke-width", (d) => Math.sqrt(d.value))
      .attr("stroke-dasharray", (d: any) => d.isHighlight ? "4,4" : "none")
      .attr("class", (d: any) => d.isHighlight ? "highlighted-link" : "");

    // Pulse animation for highlighted links
    function pulseLinks() {
      svg.selectAll(".highlighted-link")
        .transition()
        .duration(1200)
        .attr("stroke-opacity", 1)
        .transition()
        .duration(1200)
        .attr("stroke-opacity", 0.3)
        .on("end", pulseLinks);
    }
    pulseLinks();

    // Draw Node Groups
    const node = svg
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(drag(simulation));

    // Ambient glow behind nodes
    node.append("circle")
      .attr("r", d => d.radius * 2.5)
      .style("fill", d => `url(#glow-${d.group})`)
      .style("pointer-events", "none");

    // Core node circle
    node.append("circle")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => colors[d.group as keyof typeof colors] || "#94a3b8")
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 2)
      .attr("class", "cursor-pointer transition-transform duration-300 hover:scale-110");

    // Labels
    node.append("text")
      .text((d) => d.label)
      .attr("x", (d) => d.radius + 6)
      .attr("y", 4)
      .attr("class", "text-[10px] font-mono fill-white/60 select-none pointer-events-none")
      .style("font-family", "monospace")
      .style("font-size", "10px");

    // Simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as Node).x!)
        .attr("y1", (d) => (d.source as Node).y!)
        .attr("x2", (d) => (d.target as Node).x!)
        .attr("y2", (d) => (d.target as Node).y!);

      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    function drag(simulation: d3.Simulation<Node, undefined>) {
      function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      return d3.drag<any, Node>().on("start", dragstarted).on("drag", dragged).on("end", dragended);
    }

    return () => {
      simulation.stop();
    };
  }, [updates]);

  return (
    <div className="w-full bg-[var(--surface)] border border-black/5 rounded-sm overflow-hidden relative shadow-[inset_0_0_40px_rgba(0,0,0,0.5)]">
      <div 
        ref={containerRef} 
        className="w-full h-[400px]" 
      />
      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--surface)] shadow-[0_0_8px_#06b6d4]"></span>
          <span className="text-[10px] font-mono text-black/70">Tech Stack</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--surface)] shadow-[0_0_8px_#e879f9]"></span>
          <span className="text-[10px] font-mono text-black/70">Architecture</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--surface)] shadow-[0_0_8px_#f43f5e]"></span>
          <span className="text-[10px] font-mono text-black/70">Bottlenecks</span>
        </div>
      </div>
    </div>
  );
}
