import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Tooltip } from "recharts";

interface StockTrendData {
  weekStartDate: string;
  weekNumber: number;
  year: number;
  stock: number;
  consumption: number;
  status: string;
  label: string;
}

interface MiniStockTrendChartProps {
  data: StockTrendData[];
  height?: number;
  width?: string;
  showTooltip?: boolean;
}

export function MiniStockTrendChart({
  data,
  height = 60,
  width = "100%",
  showTooltip = true,
}: MiniStockTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ width, height }} className="flex items-center justify-center text-xs text-gray-400">
        Sem dados
      </div>
    );
  }

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          {showTooltip && (
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                border: "1px solid #ccc",
                borderRadius: "4px",
                color: "#fff",
                fontSize: "11px",
                padding: "4px 8px",
              }}
              formatter={(value: any) => [value.toFixed(0), "Estoque"]}
              labelFormatter={(label) => `Semana ${label}`}
            />
          )}
          <Line
            type="monotone"
            dataKey="stock"
            stroke="#3b82f6"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
