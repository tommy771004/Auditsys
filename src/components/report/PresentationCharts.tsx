import { ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Sector } from "recharts";
import type { SlideChartData, AuditSlide } from "../../types/presentation";
import { CHART_COLORS, SEMANTIC_COLORS } from "../../lib/chartColors";

interface PresentationChartProps {
  slide: AuditSlide;
}

const AnimatedSector = (props: any) => {
  const { cx, cy, index } = props;
  return (
    <motion.g
      initial={{ scale: 0, opacity: 0, rotate: -25 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{
        type: "spring",
        stiffness: 80,
        damping: 14,
        delay: (index || 0) * 0.12,
      }}
      style={{ originX: cx, originY: cy }}
    >
      <Sector {...props} />
    </motion.g>
  );
};

function ConversionChart({ data }: { data: SlideChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
        <XAxis dataKey="name" stroke="#94A3B8" style={{ fontSize: 11 }} />
        <YAxis
          yAxisId="left"
          orientation="left"
          stroke="#06B6D4"
          label={{ value: "Conversion Rate (%)", angle: -90, position: "insideLeft", fill: "#06B6D4", style: { fontSize: 11, textAnchor: "middle" } }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="#F43F5E"
          label={{ value: "Bounce Rate (%)", angle: 90, position: "insideRight", fill: "#F43F5E", style: { fontSize: 11, textAnchor: "middle" } }}
        />
        <Tooltip contentStyle={{ backgroundColor: "#0F172A", border: "1px solid #1E293B", borderRadius: "8px", fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
        <Line yAxisId="left" type="monotone" dataKey="conversion" name="訂單轉換率" stroke={CHART_COLORS[0]} strokeWidth={2.5} activeDot={{ r: 8 }} />
        <Line yAxisId="right" type="monotone" dataKey="bounce" name="行動端跳出率" stroke={CHART_COLORS[2]} strokeWidth={2.5} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function CvwChart({ data }: { data: SlideChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
        <XAxis type="number" stroke="#94A3B8" style={{ fontSize: 11 }} />
        <YAxis dataKey="name" type="category" stroke="#94A3B8" style={{ fontSize: 11, width: 120 }} width={120} />
        <Tooltip contentStyle={{ backgroundColor: "#0F172A", border: "1px solid #1E293B", borderRadius: "8px", fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
        <Bar dataKey="current" name="當前系統實測" fill={CHART_COLORS[3]}>
          {data.map((entry, index) => (
            <Cell key={`cell-curr-${index}`} fill={entry.current > entry.good ? SEMANTIC_COLORS.danger : SEMANTIC_COLORS.good} />
          ))}
        </Bar>
        <Bar dataKey="good" name="Google 綠色標準臨界值" fill={SEMANTIC_COLORS.good} stroke={CHART_COLORS[0]} strokeDasharray="2" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function BackendChart({ data }: { data: SlideChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
        <XAxis dataKey="name" stroke="#94A3B8" style={{ fontSize: 10 }} />
        <YAxis
          stroke="#94A3B8"
          label={{ value: "延遲時間 (毫秒)", angle: -90, position: "insideLeft", stroke: "#94A3B8", style: { fontSize: 11 } }}
          style={{ fontSize: 11 }}
        />
        <Tooltip contentStyle={{ backgroundColor: "#0F172A", border: "1px solid #1E293B", borderRadius: "8px", fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
        <Bar dataKey="current" name="優化前" fill={SEMANTIC_COLORS.danger} radius={[4, 4, 0, 0]} />
        <Bar dataKey="target" name="優化後目標" fill={SEMANTIC_COLORS.good} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function NetworkChart({ data }: { data: SlideChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 10, bottom: 10 }}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={5}
          dataKey="value"
          nameKey="name"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-pie-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ backgroundColor: "#0F172A", border: "1px solid #1E293B", borderRadius: "8px", fontSize: 12 }} />
        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function ActionChart({ data }: { data: SlideChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
        <XAxis dataKey="name" stroke="#94A3B8" style={{ fontSize: 10 }} />
        <YAxis stroke="#94A3B8" domain={[0, 100]} style={{ fontSize: 11 }} />
        <Tooltip contentStyle={{ backgroundColor: "#0F172A", border: "1px solid #1E293B", borderRadius: "8px", fontSize: 11 }} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
        <Bar dataKey="impact" name="優化效益 (0-100)" fill={SEMANTIC_COLORS.good} radius={[4, 4, 0, 0]} />
        <Bar dataKey="effort" name="開發難度 (0-100)" fill={SEMANTIC_COLORS.danger} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

import { motion } from "framer-motion";

export function PresentationChart({ slide }: PresentationChartProps) {
  switch (slide.chartType) {
    case "conversion":
      return <ConversionChart data={slide.chartData} />;
    case "cvw":
      return <CvwChart data={slide.chartData} />;
    case "backend":
      return <BackendChart data={slide.chartData} />;
    case "network":
      return <NetworkChart data={slide.chartData} />;
    case "action":
      return <ActionChart data={slide.chartData} />;
    default:
      return null;
  }
}