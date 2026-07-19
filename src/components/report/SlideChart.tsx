import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { CHART_COLORS } from "../../lib/chartColors";

interface SlideChartProps {
  slide: {
    chartType: "conversion" | "cvw" | "backend" | "network" | "action";
    chartData: Array<Record<string, unknown>>;
  };
}

export function SlideChart({ slide }: SlideChartProps) {
  const { chartType, chartData } = slide;

  switch (chartType) {
    case "conversion":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
            <XAxis dataKey="name" stroke="#94A3B8" style={{ fontSize: 11 }} />
            <YAxis
              yAxisId="left"
              orientation="left"
              stroke="#06B6D4"
              label={{ value: "轉換率 (%)", angle: -90, position: "insideLeft", fill: "#06B6D4", style: { fontSize: 11, textAnchor: "middle" } }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#F43F5E"
              label={{ value: "跳出率 (%)", angle: 90, position: "insideRight", fill: "#F43F5E", style: { fontSize: 11, textAnchor: "middle" } }}
            />
            <Tooltip contentStyle={{ backgroundColor: "#0F172A", border: "1px solid #1E293B", borderRadius: "8px", fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
            <Line yAxisId="left" type="monotone" dataKey="conversion" name="訂單轉換率" stroke="#06B6D4" strokeWidth={2.5} activeDot={{ r: 8 }} />
            <Line yAxisId="right" type="monotone" dataKey="bounce" name="行動端跳出率" stroke="#F43F5E" strokeWidth={2.5} />
          </LineChart>
        </ResponsiveContainer>
      );
    case "cvw":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
            <XAxis type="number" stroke="#94A3B8" style={{ fontSize: 11 }} />
            <YAxis dataKey="name" type="category" stroke="#94A3B8" style={{ fontSize: 11, width: 120 }} width={120} />
            <Tooltip contentStyle={{ backgroundColor: "#0F172A", border: "1px solid #1E293B", borderRadius: "8px", fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
            <Bar dataKey="current" name="當前系統實測" fill="#F59E0B">
              {chartData.map((entry, index) => (
                <Cell key={`cell-curr-${index}`} fill={(entry.current as number) > (entry.good as number) ? "#F43F5E" : "#05FFC4"} />
              ))}
            </Bar>
            <Bar dataKey="good" name="Google 綠色標準臨界值" fill="#05FFC4" stroke="#06B6D4" strokeDasharray="2" />
          </BarChart>
        </ResponsiveContainer>
      );
    case "backend":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
            <XAxis dataKey="name" stroke="#94A3B8" style={{ fontSize: 10 }} />
            <YAxis stroke="#94A3B8" label={{ value: "延遲時間 (毫秒)", angle: -90, position: "insideLeft", stroke: "#94A3B8", style: { fontSize: 11 } }} style={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: "#0F172A", border: "1px solid #1E293B", borderRadius: "8px", fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
            <Bar dataKey="current" name="優化前" fill="#F43F5E" radius={[4, 4, 0, 0]} />
            <Bar dataKey="target" name="優化後目標" fill="#05FFC4" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    case "network":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 10, bottom: 10 }}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={5}
              dataKey="value"
              nameKey="name"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-pie-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: "#0F172A", border: "1px solid #1E293B", borderRadius: "8px", fontSize: 12 }} />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      );
    case "action":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
            <XAxis dataKey="name" stroke="#94A3B8" style={{ fontSize: 10 }} />
            <YAxis stroke="#94A3B8" domain={[0, 100]} style={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: "#0F172A", border: "1px solid #1E293B", borderRadius: "8px", fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
            <Bar dataKey="impact" name="優化效益 (0-100)" fill="#05FFC4" radius={[4, 4, 0, 0]} />
            <Bar dataKey="effort" name="開發難度 (0-100)" fill="#F43F5E" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    default:
      return null;
  }
}