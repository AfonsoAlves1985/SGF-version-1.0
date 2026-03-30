import { trpc } from "@/lib/trpc";
import { MiniStockTrendChart } from "./MiniStockTrendChart";
import { Loader2 } from "lucide-react";

interface ConsumableChartRowProps {
  consumable: any;
  selectedSpace: number | null;
}

export function ConsumableChartRow({ consumable, selectedSpace }: ConsumableChartRowProps) {
  const { data: stockHistory = [], isLoading } = trpc.consumableWeeklyMovements.getHistory.useQuery(
    {
      consumableId: consumable.id,
      spaceId: selectedSpace || 0,
      weeks: 8,
    },
    { enabled: !!selectedSpace && !!consumable.id }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Carregando gráfico...
      </div>
    );
  }

  if (!stockHistory || stockHistory.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        Sem histórico de estoque disponível para {consumable.name}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-white">Tendência de Estoque</h4>
          <p className="text-sm text-gray-400">Últimas {stockHistory.length} semanas</p>
        </div>
      </div>
      <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
        <MiniStockTrendChart data={stockHistory} height={200} showTooltip={true} />
      </div>
      <div className="grid grid-cols-4 gap-2 text-sm">
        <div className="bg-slate-700/30 p-3 rounded">
          <div className="text-gray-400">Estoque Atual</div>
          <div className="text-lg font-semibold text-white">{consumable.currentStock}</div>
        </div>
        <div className="bg-slate-700/30 p-3 rounded">
          <div className="text-gray-400">Mínimo</div>
          <div className="text-lg font-semibold text-white">{consumable.minStock}</div>
        </div>
        <div className="bg-slate-700/30 p-3 rounded">
          <div className="text-gray-400">Máximo</div>
          <div className="text-lg font-semibold text-white">{consumable.maxStock}</div>
        </div>
        <div className="bg-slate-700/30 p-3 rounded">
          <div className="text-gray-400">A Repor</div>
          <div className={`text-lg font-semibold ${(consumable.maxStock - consumable.currentStock) > 0 ? 'text-orange-400' : 'text-green-400'}`}>
            {Math.max(0, consumable.maxStock - consumable.currentStock)}
          </div>
        </div>
      </div>
    </div>
  );
}
