import { trpc } from "@/lib/trpc";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";

interface InlineStockChartProps {
  consumableId: number;
  spaceId: number | null;
}

export function InlineStockChart({ consumableId, spaceId }: InlineStockChartProps) {
  const { data: stockHistory = [], isLoading } = trpc.consumableWeeklyMovements.getHistory.useQuery(
    {
      consumableId,
      spaceId: spaceId || 0,
      weeks: 6,
    },
    { enabled: !!spaceId && !!consumableId }
  );

  if (!spaceId || !consumableId) {
    return <div className="text-xs text-gray-500">—</div>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
      </div>
    );
  }

  if (!stockHistory || stockHistory.length === 0) {
    return <div className="text-xs text-gray-500">Sem dados</div>;
  }

  return (
    <div style={{ width: "120px", height: "40px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={stockHistory} margin={{ top: 2, right: 2, left: -20, bottom: 2 }}>
          <Line
            type="monotone"
            dataKey="stock"
            stroke="#3b82f6"
            strokeWidth={1}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
