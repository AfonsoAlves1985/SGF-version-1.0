import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInputWithCalendar } from "@/components/DateInputWithCalendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle,
  Package,
  TrendingUp,
  Users,
  AlertCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

function normalizeDateToMask(value?: string) {
  if (!value) return "";
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) return value;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}-${month}-${year}`;
  }

  return value;
}

function parseMaskedDate(value?: string) {
  if (!value || !/^\d{2}-\d{2}-\d{4}$/.test(value)) return null;

  const [day, month, year] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function isDateRangeValid(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return false;

  const start = parseMaskedDate(startDate);
  const end = parseMaskedDate(endDate);

  if (!start || !end) return false;

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return end.getTime() >= start.getTime();
}

function parseRoomDateTime(dateValue?: string, timeValue?: string, end = false) {
  if (!dateValue) return null;

  const normalizedDate = normalizeDateToMask(dateValue);
  const maskedDate = parseMaskedDate(normalizedDate);
  if (!maskedDate) return null;

  const parsed = new Date(maskedDate);

  if (timeValue) {
    const [h, m] = timeValue.split(":").map(Number);
    if (!Number.isNaN(h) && !Number.isNaN(m)) {
      parsed.setHours(h, m, 0, 0);
      return parsed;
    }
  }

  if (end) {
    parsed.setHours(23, 59, 59, 999);
  } else {
    parsed.setHours(0, 0, 0, 0);
  }

  return parsed;
}

function parseReservationDate(value?: string | Date | null) {
  if (!value) return null;
  const parsed = value instanceof Date ? new Date(value) : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export default function Dashboard() {
  const [isCriticalDialogOpen, setIsCriticalDialogOpen] = useState(false);
  const [isUrgentMaintenanceDialogOpen, setIsUrgentMaintenanceDialogOpen] =
    useState(false);
  const [isRoomsDialogOpen, setIsRoomsDialogOpen] = useState(false);
  const [isUseRoomDialogOpen, setIsUseRoomDialogOpen] = useState(false);
  const [selectedRoomForUse, setSelectedRoomForUse] = useState<any>(null);
  const [useRoomForm, setUseRoomForm] = useState({
    responsibleUserName: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
  });

  const { data: maintenance = [] } = trpc.maintenance.list.useQuery();
  const { data: rooms = [], refetch: refetchRooms } =
    trpc.rooms.list.useQuery();
  const { data: reservations = [] } = trpc.roomReservations.list.useQuery();

  const { data: teams = [] } = trpc.teams.list.useQuery();
  const { data: stockAlerts = [] } = trpc.dashboard.getStockAlerts.useQuery();

  const now = new Date();

  const activeReservationRoomIds = new Set<number>();
  for (const reservation of reservations as any[]) {
    if (reservation.status === "cancelada") continue;
    const start = parseReservationDate(reservation.startTime);
    const end = parseReservationDate(reservation.endTime);
    if (!start || !end) continue;
    if (now >= start && now <= end) {
      activeReservationRoomIds.add(Number(reservation.roomId));
    }
  }

  const roomStatusByCurrentDate = new Map<
    number,
    "disponivel" | "ocupada" | "manutencao"
  >();

  for (const room of rooms as any[]) {
    if (room.status === "manutencao") {
      roomStatusByCurrentDate.set(room.id, "manutencao");
      continue;
    }

    const roomStart = parseRoomDateTime(room.startDate, room.startTime);
    const roomEnd = parseRoomDateTime(room.endDate, room.endTime, true);
    const roomUsageActiveNow =
      !!roomStart && !!roomEnd && now >= roomStart && now <= roomEnd;

    const occupiedNow =
      roomUsageActiveNow || activeReservationRoomIds.has(Number(room.id));

    roomStatusByCurrentDate.set(room.id, occupiedNow ? "ocupada" : "disponivel");
  }

  const roomHasFutureScheduleById = new Map<number, boolean>();
  for (const room of rooms as any[]) {
    roomHasFutureScheduleById.set(room.id, false);
  }

  for (const reservation of reservations as any[]) {
    if (reservation.status === "cancelada") continue;
    const start = parseReservationDate(reservation.startTime);
    if (!start) continue;
    if (start.getTime() > now.getTime()) {
      roomHasFutureScheduleById.set(Number(reservation.roomId), true);
    }
  }

  for (const room of rooms as any[]) {
    const roomStart = parseRoomDateTime(room.startDate, room.startTime);
    if (!roomStart) continue;
    if (roomStart.getTime() > now.getTime()) {
      roomHasFutureScheduleById.set(room.id, true);
    }
  }

  const updateRoomMutation = trpc.rooms.update.useMutation({
    onSuccess: () => {
      toast.success("Sala reservada com sucesso!");
      refetchRooms();
      setIsUseRoomDialogOpen(false);
      setSelectedRoomForUse(null);
      setUseRoomForm({
        responsibleUserName: "",
        startDate: "",
        endDate: "",
        startTime: "",
        endTime: "",
      });
    },
    onError: error => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Calcular métricas
  const criticalAlerts = stockAlerts.filter(
    (a: any) => a.alertType === "critical" || a.currentStock < a.minStock
  );

  const urgentMaintenancePending = maintenance.filter(
    (request: any) =>
      request.priority === "urgente" &&
      (request.status === "aberto" || request.status === "em_progresso")
  );

  const metrics = {
    lowStockItems: criticalAlerts.length,
    criticalAlerts: criticalAlerts.length,
    maintenanceOpen: maintenance.filter(
      (m: any) => m.status === "aberto" || m.status === "em_progresso"
    ).length,
    maintenanceUrgent: urgentMaintenancePending.length,
    roomsAvailable: (rooms as any[]).filter(
      (r: any) => roomStatusByCurrentDate.get(r.id) === "disponivel"
    ).length,
    roomsTotal: rooms.length,
    reservationsToday: reservations.filter((r: any) => {
      const today = new Date().toDateString();
      return new Date(r.startTime).toDateString() === today;
    }).length,

    teamMembers: teams.length,
  };

  const availableRooms = (rooms as any[]).filter(
    (room: any) => roomStatusByCurrentDate.get(room.id) === "disponivel"
  );

  const handleOpenUseRoom = (room: any) => {
    setSelectedRoomForUse(room);
    setUseRoomForm({
      responsibleUserName: "",
      startDate: "",
      endDate: "",
      startTime: "",
      endTime: "",
    });
    setIsRoomsDialogOpen(false);
    setIsUseRoomDialogOpen(true);
  };

  const handleConfirmUseRoom = () => {
    if (!selectedRoomForUse) return;

    if (!useRoomForm.responsibleUserName.trim()) {
      toast.error("Informe o nome do solicitante.");
      return;
    }

    if (!useRoomForm.startDate || !useRoomForm.endDate) {
      toast.error("Informe as datas de uso.");
      return;
    }

    if (
      !parseMaskedDate(useRoomForm.startDate) ||
      !parseMaskedDate(useRoomForm.endDate)
    ) {
      toast.error("Use o formato DD-MM-YYYY para as datas.");
      return;
    }

    if (!isDateRangeValid(useRoomForm.startDate, useRoomForm.endDate)) {
      toast.error("A data de término não pode ser anterior à data de início.");
      return;
    }

    updateRoomMutation.mutate({
      id: selectedRoomForUse.id,
      name: selectedRoomForUse.name,
      capacity: selectedRoomForUse.capacity,
      location: selectedRoomForUse.location,
      type: selectedRoomForUse.type,
      status: "ocupada",
      responsibleUserName: useRoomForm.responsibleUserName,
      startDate: useRoomForm.startDate,
      endDate: useRoomForm.endDate,
      startTime: useRoomForm.startTime,
      endTime: useRoomForm.endTime,
    });
  };

  // Dados para gráficos
  const maintenanceByPriority = [
    {
      name: "Urgente",
      value: maintenance.filter((m: any) => m.priority === "urgente").length,
    },
    {
      name: "Alta",
      value: maintenance.filter((m: any) => m.priority === "alta").length,
    },
    {
      name: "Média",
      value: maintenance.filter((m: any) => m.priority === "media").length,
    },
    {
      name: "Baixa",
      value: maintenance.filter((m: any) => m.priority === "baixa").length,
    },
  ];

  const maintenanceByStatus = [
    {
      name: "Aberto",
      value: maintenance.filter((m: any) => m.status === "aberto").length,
    },
    {
      name: "Em Progresso",
      value: maintenance.filter((m: any) => m.status === "em_progresso").length,
    },
    {
      name: "Concluído",
      value: maintenance.filter((m: any) => m.status === "concluido").length,
    },
  ];

  const roomOccupancy = [
    {
      name: "Disponível",
      value: (rooms as any[]).filter(
        (r: any) => roomStatusByCurrentDate.get(r.id) === "disponivel"
      ).length,
    },
    {
      name: "Ocupada",
      value: (rooms as any[]).filter(
        (r: any) => roomStatusByCurrentDate.get(r.id) === "ocupada"
      ).length,
    },
    {
      name: "Manutenção",
      value: (rooms as any[]).filter(
        (r: any) => roomStatusByCurrentDate.get(r.id) === "manutencao"
      ).length,
    },
  ];

  const COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6"];

  return (
    <div className="space-y-6">
      <Dialog
        open={isCriticalDialogOpen}
        onOpenChange={setIsCriticalDialogOpen}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sky-700">
              Itens Críticos de Consumíveis
            </DialogTitle>
            <DialogDescription className="text-sky-600">
              Lista de itens abaixo do estoque mínimo com quantidade atual e
              unidade.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto">
            {criticalAlerts.length === 0 ? (
              <p className="text-sm text-sky-600">
                Nenhum item crítico no momento.
              </p>
            ) : (
              <div className="space-y-2">
                {criticalAlerts.map((alert: any) => (
                  <div
                    key={`${alert.spaceId ?? "sem-espaco"}-${alert.id}`}
                    className="rounded-lg border border-sky-200 p-3"
                  >
                    <div className="font-medium text-sky-700">
                      {alert.name}
                    </div>
                    <div className="text-sm text-sky-600">
                      Quantidade atual: {alert.currentStock} {alert.unit}
                    </div>
                    <div className="text-sm text-sky-600">
                      Unidade: {alert.spaceName || "Sem unidade"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isUrgentMaintenanceDialogOpen}
        onOpenChange={setIsUrgentMaintenanceDialogOpen}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-red-700">
              Chamados urgentes em aberto ou em andamento
            </DialogTitle>
            <DialogDescription className="text-red-600">
              Esses chamados permanecem no dashboard até serem concluídos.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto">
            {urgentMaintenancePending.length === 0 ? (
              <p className="text-sm text-sky-600">
                Nenhum chamado urgente pendente no momento.
              </p>
            ) : (
              <div className="space-y-2">
                {urgentMaintenancePending.map((request: any) => (
                  <div
                    key={request.id}
                    className="rounded-lg border border-red-200 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-red-700">
                          {request.title}
                        </div>
                        <div className="text-sm text-red-600 mt-1">
                          Status: {request.status === "aberto" ? "Aberto" : "Em andamento"}
                        </div>
                        <div className="text-sm text-red-600">
                          Tipo: {request.type === "preventiva" ? "Preventiva" : "Corretiva"}
                        </div>
                        {request.department && (
                          <div className="text-sm text-red-600">
                            Departamento: {request.department}
                          </div>
                        )}
                        <div className="text-sm text-red-600">
                          Data do chamado: {request.requestDate || "-"}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 whitespace-nowrap">
                        #{request.id}
                      </div>
                    </div>
                    {request.description && (
                      <p className="text-sm text-gray-700 mt-2">{request.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRoomsDialogOpen} onOpenChange={setIsRoomsDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-green-700">
              Salas Disponíveis
            </DialogTitle>
            <DialogDescription className="text-green-600">
              Lista de salas disponíveis para uso no momento.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto">
            {availableRooms.length === 0 ? (
              <p className="text-sm text-green-600">
                Nenhuma sala disponível no momento.
              </p>
            ) : (
              <div className="space-y-2">
                {availableRooms.map((room: any) => (
                  <button
                    type="button"
                    key={room.id}
                    onClick={() => handleOpenUseRoom(room)}
                    className="w-full text-left rounded-lg border border-green-200 p-3 transition hover:bg-green-50/40"
                  >
                    <div className="font-medium text-green-700">
                      {room.name}
                    </div>
                    {roomHasFutureScheduleById.get(room.id) && (
                      <div className="mt-1 inline-flex rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                        Agendada (futuro)
                      </div>
                    )}
                    <div className="text-sm text-green-600">
                      Localização: {room.location || "Não informada"}
                    </div>
                    <div className="text-sm text-green-600">
                      Capacidade: {room.capacity || 0} pessoa(s)
                    </div>
                    <div className="text-xs text-green-600 mt-2 font-medium">
                      Clique para utilizar esta sala
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isUseRoomDialogOpen} onOpenChange={setIsUseRoomDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-green-700">Utilizar Sala</DialogTitle>
            <DialogDescription className="text-green-600">
              {selectedRoomForUse?.name || "Sala"} — preencha os dados do
              solicitante e período.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-green-700">Nome do Solicitante *</Label>
              <Input
                type="text"
                placeholder="Nome completo do responsável"
                value={useRoomForm.responsibleUserName}
                onChange={e =>
                  setUseRoomForm({
                    ...useRoomForm,
                    responsibleUserName: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-green-700">Data de Início *</Label>
                <DateInputWithCalendar
                  value={useRoomForm.startDate}
                  onChange={date =>
                    setUseRoomForm({
                      ...useRoomForm,
                      startDate: date,
                    })
                  }
                  className="mt-1"
                  calendarClassName="[&_.rdp-cell]:text-green-700 [&_.rdp-button]:text-green-700"
                />
              </div>

              <div>
                <Label className="text-green-700">Data de Fim *</Label>
                <DateInputWithCalendar
                  value={useRoomForm.endDate}
                  onChange={date =>
                    setUseRoomForm({
                      ...useRoomForm,
                      endDate: date,
                    })
                  }
                  className="mt-1"
                  calendarClassName="[&_.rdp-cell]:text-green-700 [&_.rdp-button]:text-green-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-green-700">Hora de Início</Label>
                <Input
                  type="time"
                  value={useRoomForm.startTime}
                  onChange={e =>
                    setUseRoomForm({
                      ...useRoomForm,
                      startTime: e.target.value,
                    })
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-green-700">Hora de Fim</Label>
                <Input
                  type="time"
                  value={useRoomForm.endTime}
                  onChange={e =>
                    setUseRoomForm({
                      ...useRoomForm,
                      endTime: e.target.value,
                    })
                  }
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                onClick={handleConfirmUseRoom}
                disabled={updateRoomMutation.isPending}
              >
                {updateRoomMutation.isPending ? "Salvando..." : "Confirmar Uso"}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsUseRoomDialogOpen(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div>
        <h1 className="text-3xl font-bold text-white">
          Dashboard Executivo
        </h1>
        <p className="text-white mt-1">
          Métricas e indicadores de desempenho
        </p>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setIsUrgentMaintenanceDialogOpen(true)}
          className="w-full text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <Card className="cursor-pointer transition hover:border-red-300 hover:shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  Chamados Abertos
                </CardTitle>
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {metrics.maintenanceOpen}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {metrics.maintenanceUrgent} urgentes pendentes
              </p>
            </CardContent>
          </Card>
        </button>

        <button
          type="button"
          onClick={() => setIsCriticalDialogOpen(true)}
          className="w-full text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <Card className="cursor-pointer transition hover:border-red-300 hover:shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  Alertas Críticos
                </CardTitle>
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {metrics.criticalAlerts}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                itens abaixo do estoque minimo
              </p>
            </CardContent>
          </Card>
        </button>

        <button
          type="button"
          onClick={() => setIsRoomsDialogOpen(true)}
          className="w-full text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
        >
          <Card className="cursor-pointer transition hover:border-green-300 hover:shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  Salas Disponíveis
                </CardTitle>
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {metrics.roomsAvailable}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                de {metrics.roomsTotal} salas
              </p>
            </CardContent>
          </Card>
        </button>

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
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
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
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
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
