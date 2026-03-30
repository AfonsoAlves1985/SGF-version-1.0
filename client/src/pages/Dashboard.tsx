import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { AlertTriangle, CheckCircle, Clock, Package, TrendingUp, Users, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Dashboard() {
  const [selectedSpace, setSelectedSpace] = useState<number | null>(null);

  const { data: maintenance = [] } = trpc.maintenance.list.useQuery();
  const { data: rooms = [] } = trpc.rooms.list.useQuery();
  const { data: reservations = [] } = trpc.roomReservations.list.useQuery();

  const { data: teams = [] } = trpc.teams.list.useQuery();
  const { data: consumables = [] } = trpc.consumablesWithSpace.list.useQuery();
  const { data: spaces = [] } = trpc.consumableSpaces.list.useQuery();
  const { data: stockAlerts = [] } = trpc.dashboard.getStockAlerts.useQuery();

  // Calcular métricas
  const criticalConsumables = consumables.filter((c: any) => c.status === "REPOR_ESTOQUE");
  const criticalAlerts = stockAlerts.filter((a: any) => a.alertType === "critical");

  const metrics = {
    lowStockItems: criticalConsumables.length,
    criticalAlerts: criticalAlerts.length,
    maintenanceOpen: maintenance.filter((m: any) => m.status === "aberto").length,
    maintenanceUrgent: maintenance.filter((m: any) => m.priority === "urgente").length,
    roomsAvailable: rooms.filter((r: any) => r.status === "disponivel").length,
    roomsTotal: rooms.length,
    reservationsToday: reservations.filter((r: any) => {
      const today = new Date().toDateString();
      return new Date(r.startTime).toDateString() === today;
    }).length,

    teamMembers: teams.length,
  };

  // Dados para gráficos
  const maintenanceByPriority = [
    { name: "Urgente", value: maintenance.filter((m: any) => m.priority === "urgente").length },
    { name: "Alta", value: maintenance.filter((m: any) => m.priority === "alta").length },
    { name: "Média", value: maintenance.filter((m: any) => m.priority === "media").length },
    { name: "Baixa", value: maintenance.filter((m: any) => m.priority === "baixa").length },
  ];

  const maintenanceByStatus = [
    { name: "Aberto", value: maintenance.filter((m: any) => m.status === "aberto").length },
    { name: "Em Progresso", value: maintenance.filter((m: any) => m.status === "em_progresso").length },
    { name: "Concluído", value: maintenance.filter((m: any) => m.status === "concluido").length },
  ];

  const roomOccupancy = [
    { name: "Disponível", value: rooms.filter((r: any) => r.status === "disponivel").length },
    { name: "Ocupada", value: rooms.filter((r: any) => r.status === "ocupada").length },
    { name: "Manutenção", value: rooms.filter((r: any) => r.status === "manutencao").length },
  ];

  const COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6"];

  // Filtrar apenas alertas críticos por espaço se selecionado
  const filteredAlerts = selectedSpace 
    ? criticalAlerts.filter((a: any) => a.spaceId === selectedSpace)
    : criticalAlerts;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Executivo</h1>
        <p className="text-gray-600 mt-1">Métricas e indicadores de desempenho</p>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Chamados Abertos</CardTitle>
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{metrics.maintenanceOpen}</div>
            <p className="text-xs text-gray-600 mt-1">{metrics.maintenanceUrgent} urgentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Alertas Críticos</CardTitle>
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{metrics.criticalAlerts}</div>
            <p className="text-xs text-gray-600 mt-1">estoque muito baixo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Salas Disponíveis</CardTitle>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{metrics.roomsAvailable}</div>
            <p className="text-xs text-gray-600 mt-1">de {metrics.roomsTotal} salas</p>
          </CardContent>
        </Card>


      </div>

      {/* Alertas de Estoque Detalhados */}
      {stockAlerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-red-900">🔴 Alertas Críticos de Estoque</CardTitle>
                <CardDescription className="text-red-700">
                  {criticalAlerts.length} itens com estoque muito baixo
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedSpace(null)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  selectedSpace === null
                    ? "bg-red-600 text-white"
                    : "bg-white text-red-600 border border-red-300 hover:bg-red-100"
                }`}
              >
                Todas as Unidades
              </button>
              {spaces.map((space: any) => (
                <button
                  key={space.id}
                  onClick={() => setSelectedSpace(space.id)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    selectedSpace === space.id
                      ? "bg-red-600 text-white"
                      : "bg-white text-red-600 border border-red-300 hover:bg-red-100"
                  }`}
                >
                  {space.name}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {filteredAlerts.length === 0 ? (
                <p className="text-center py-4 text-gray-600">Nenhum alerta para esta unidade</p>
              ) : (
                filteredAlerts.map((alert: any) => (
                  <div
                    key={alert.id}
                    className="p-4 rounded-lg border-l-4 bg-red-100 border-l-red-600"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900">{alert.name}</p>
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-600 text-white">
                            CRÍTICO
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">
                          <strong>Unidade:</strong> {alert.spaceName}
                        </p>
                        <p className="text-sm text-gray-700">
                          <strong>Categoria:</strong> {alert.category}
                        </p>
                        <div className="mt-2 p-2 bg-white rounded border border-gray-300">
                          <p className="text-sm font-mono">
                            <strong>Quantidade Atual:</strong> {alert.currentStock} {alert.unit}
                          </p>
                          <p className="text-sm font-mono">
                            <strong>Nível Mínimo:</strong> {alert.minStock} {alert.unit}
                          </p>
                          {alert.alertType === "critical" && (
                            <p className="text-sm font-mono text-red-600">
                              <strong>Nível Crítico:</strong> {alert.criticalLevel} {alert.unit}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        <div className="text-2xl font-bold text-red-600">
                          {alert.currentStock}
                        </div>
                        <p className="text-xs text-gray-600">{alert.unit}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Consumíveis Críticos por Unidade (antigo) */}
      {criticalConsumables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Consumíveis com Estoque Crítico (Legado)</CardTitle>
            <CardDescription>Itens que necessitam reposição imediata por unidade</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {criticalConsumables.slice(0, 10).map((item: any) => {
                const space = spaces.find((s: any) => s.id === item.spaceId);
                return (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded bg-red-50">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">
                        Unidade: {space?.name || "N/A"} | Categoria: {item.category}
                      </p>
                      <p className="text-sm text-red-600 mt-1">
                        Estoque: {item.currentStock} {item.unit} | Mínimo: {item.minStock} | Máximo: {item.maxStock}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-3 py-1 bg-red-600 text-white text-xs font-semibold rounded">
                        REPOR
                      </span>
                    </div>
                  </div>
                );
              })}
              {criticalConsumables.length > 10 && (
                <p className="text-sm text-gray-600 text-center pt-2">
                  +{criticalConsumables.length - 10} itens adicionais com estoque crítico
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manutenção por Prioridade */}
        <Card>
          <CardHeader>
            <CardTitle>Chamados por Prioridade</CardTitle>
            <CardDescription>Distribuição de chamados abertos</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={maintenanceByPriority}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {maintenanceByPriority.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Ocupação de Salas */}
        <Card>
          <CardHeader>
            <CardTitle>Ocupação de Salas</CardTitle>
            <CardDescription>Status atual das salas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={roomOccupancy}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {roomOccupancy.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Status de Manutenção */}
      <Card>
        <CardHeader>
          <CardTitle>Status de Chamados</CardTitle>
          <CardDescription>Distribuição por status</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={maintenanceByStatus}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
