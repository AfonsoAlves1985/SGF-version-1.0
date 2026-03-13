import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { AlertTriangle, CheckCircle, Clock, Package, TrendingUp, Users } from "lucide-react";

export default function Dashboard() {
  const { data: inventory = [] } = trpc.inventory.list.useQuery();
  const { data: maintenance = [] } = trpc.maintenance.list.useQuery();
  const { data: rooms = [] } = trpc.rooms.list.useQuery();
  const { data: reservations = [] } = trpc.roomReservations.list.useQuery();
  const { data: contracts = [] } = trpc.contracts.list.useQuery();
  const { data: teams = [] } = trpc.teams.list.useQuery();

  // Calcular métricas
  const metrics = {
    totalInventory: inventory.length,
    lowStockItems: inventory.filter((i: any) => i.quantity < i.minQuantity).length,
    maintenanceOpen: maintenance.filter((m: any) => m.status === "aberto").length,
    maintenanceUrgent: maintenance.filter((m: any) => m.priority === "urgente").length,
    roomsAvailable: rooms.filter((r: any) => r.status === "disponivel").length,
    roomsTotal: rooms.length,
    reservationsToday: reservations.filter((r: any) => {
      const today = new Date().toDateString();
      return new Date(r.startTime).toDateString() === today;
    }).length,
    contractsExpiring: contracts.filter((c: any) => {
      const today = new Date();
      const end = new Date(c.endDate);
      const daysUntilExpiry = Math.floor((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Executivo</h1>
        <p className="text-gray-600 mt-1">Métricas e indicadores de desempenho</p>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <CardTitle className="text-sm font-medium">Stock Crítico</CardTitle>
              <Package className="w-4 h-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{metrics.lowStockItems}</div>
            <p className="text-xs text-gray-600 mt-1">de {metrics.totalInventory} itens</p>
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

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Contratos Vencendo</CardTitle>
              <Clock className="w-4 h-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{metrics.contractsExpiring}</div>
            <p className="text-xs text-gray-600 mt-1">próximos 30 dias</p>
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

        {/* Status de Manutenção */}
        <Card>
          <CardHeader>
            <CardTitle>Status de Manutenção</CardTitle>
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

        {/* Estatísticas Gerais */}
        <Card>
          <CardHeader>
            <CardTitle>Estatísticas Gerais</CardTitle>
            <CardDescription>Resumo operacional</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="font-medium">Membros da Equipa</span>
              </div>
              <span className="text-2xl font-bold">{metrics.teamMembers}</span>
            </div>

            <div className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-green-600" />
                <span className="font-medium">Itens em Inventário</span>
              </div>
              <span className="text-2xl font-bold">{metrics.totalInventory}</span>
            </div>

            <div className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <span className="font-medium">Reservas Hoje</span>
              </div>
              <span className="text-2xl font-bold">{metrics.reservationsToday}</span>
            </div>

            <div className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <span className="font-medium">Total de Chamados</span>
              </div>
              <span className="text-2xl font-bold">{maintenance.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
