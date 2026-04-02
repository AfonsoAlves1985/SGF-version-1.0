import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { AlertTriangle, CheckCircle, Clock, Package, TrendingUp, Users, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Dashboard() {
  const [isCriticalDialogOpen, setIsCriticalDialogOpen] = useState(false);

  const { data: maintenance = [] } = trpc.maintenance.list.useQuery();
  const { data: rooms = [] } = trpc.rooms.list.useQuery();
  const { data: reservations = [] } = trpc.roomReservations.list.useQuery();

  const { data: teams = [] } = trpc.teams.list.useQuery();
  const { data: stockAlerts = [] } = trpc.dashboard.getStockAlerts.useQuery();

  // Calcular métricas
  const criticalAlerts = stockAlerts.filter(
    (a: any) => a.alertType === "critical" || a.currentStock < a.minStock,
  );

  const metrics = {
    lowStockItems: criticalAlerts.length,
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

  return (
    <div className="space-y-6">
      <Dialog open={isCriticalDialogOpen} onOpenChange={setIsCriticalDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-orange-700">Itens Críticos de Consumíveis</DialogTitle>
            <DialogDescription className="text-orange-600">
              Lista de itens abaixo do estoque mínimo com quantidade atual e unidade.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto">
            {criticalAlerts.length === 0 ? (
              <p className="text-sm text-orange-600">
                Nenhum item crítico no momento.
              </p>
            ) : (
              <div className="space-y-2">
                {criticalAlerts.map((alert: any) => (
                  <div
                    key={`${alert.spaceId ?? "sem-espaco"}-${alert.id}`}
                    className="rounded-lg border border-orange-200 p-3"
                  >
                    <div className="font-medium text-orange-700">{alert.name}</div>
                    <div className="text-sm text-orange-600">
                      Quantidade atual: {alert.currentStock} {alert.unit}
                    </div>
                    <div className="text-sm text-orange-600">
                      Unidade: {alert.spaceName || "Sem unidade"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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

        <button
          type="button"
          onClick={() => setIsCriticalDialogOpen(true)}
          className="w-full text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <Card className="cursor-pointer transition hover:border-red-300 hover:shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Alertas Críticos</CardTitle>
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{metrics.criticalAlerts}</div>
              <p className="text-xs text-gray-600 mt-1">itens abaixo do estoque minimo</p>
            </CardContent>
          </Card>
        </button>

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
