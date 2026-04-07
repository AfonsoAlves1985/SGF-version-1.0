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
  Clock,
  Package,
  TrendingUp,
  Users,
  AlertCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

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

function parseContractDate(value?: string | null) {
  if (!value) return null;

  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const [day, month, year] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDaysUntilDate(value?: string | null) {
  const parsedDate = parseContractDate(value);
  if (!parsedDate) return null;

  const target = new Date(parsedDate);
  target.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.floor(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function formatContractDate(value?: string | null) {
  if (!value) return "-";

  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) return value;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}-${month}-${year}`;
  }

  const parsed = parseContractDate(value);
  if (!parsed) return value;

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  return `${day}-${month}-${year}`;
}

export default function Dashboard() {
  const [isCriticalDialogOpen, setIsCriticalDialogOpen] = useState(false);
  const [isContractsDialogOpen, setIsContractsDialogOpen] = useState(false);
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
  const { data: contracts = [] } = trpc.contractsWithSpace.list.useQuery();

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

  const expiredContracts = contracts.filter((contract: any) => {
    const daysUntilExpiry = getDaysUntilDate(contract.endDate);
    if (daysUntilExpiry === null) return contract.status === "vencido";
    return contract.status === "vencido" || daysUntilExpiry < 0;
  });

  const contractsExpiringSoon = contracts.filter((contract: any) => {
    const daysUntilExpiry = getDaysUntilDate(contract.endDate);
    return (
      daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 30
    );
  });

  const contractAlerts = contracts
    .map((contract: any) => {
      const daysUntilExpiry = getDaysUntilDate(contract.endDate);
      const isExpired =
        contract.status === "vencido" ||
        (daysUntilExpiry !== null && daysUntilExpiry < 0);
      const isExpiringSoon =
        !isExpired &&
        daysUntilExpiry !== null &&
        daysUntilExpiry >= 0 &&
        daysUntilExpiry <= 30;

      if (!isExpired && !isExpiringSoon) return null;

      return {
        ...contract,
        isExpired,
        daysUntilExpiry,
      };
    })
    .filter((contract: any) => contract !== null)
    .sort((a: any, b: any) => {
      if (a.isExpired && !b.isExpired) return -1;
      if (!a.isExpired && b.isExpired) return 1;

      const aDays = a.daysUntilExpiry ?? 9999;
      const bDays = b.daysUntilExpiry ?? 9999;
      return aDays - bDays;
    });

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
    roomsAvailable: rooms.filter((r: any) => r.status === "disponivel").length,
    roomsTotal: rooms.length,
    reservationsToday: reservations.filter((r: any) => {
      const today = new Date().toDateString();
      return new Date(r.startTime).toDateString() === today;
    }).length,

    teamMembers: teams.length,
    contractsExpired: expiredContracts.length,
    contractsExpiringSoon: contractsExpiringSoon.length,
  };

  const availableRooms = rooms.filter(
    (room: any) => room.status === "disponivel"
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
      value: rooms.filter((r: any) => r.status === "disponivel").length,
    },
    {
      name: "Ocupada",
      value: rooms.filter((r: any) => r.status === "ocupada").length,
    },
    {
      name: "Manutenção",
      value: rooms.filter((r: any) => r.status === "manutencao").length,
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
        open={isContractsDialogOpen}
        onOpenChange={setIsContractsDialogOpen}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sky-700">
              Contratos Vencidos ou Próximos
            </DialogTitle>
            <DialogDescription className="text-sky-600">
              Contratos vencidos e contratos com vencimento em até 30 dias.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto">
            {contractAlerts.length === 0 ? (
              <p className="text-sm text-sky-600">
                Nenhum contrato vencido ou próximo de vencer.
              </p>
            ) : (
              <div className="space-y-2">
                {contractAlerts.map((contract: any) => (
                  <div
                    key={`${contract.id}-${contract.spaceId ?? "sem-espaco"}`}
                    className="rounded-lg border border-sky-200 p-3"
                  >
                    <div className="font-medium text-sky-700">
                      {contract.companyName}
                    </div>
                    <div className="text-sm text-sky-600">
                      Unidade: {contract.spaceName || "Sem unidade"}
                    </div>
                    <div className="text-sm text-sky-600">
                      Vencimento: {formatContractDate(contract.endDate)}
                    </div>
                    <div className="text-sm font-medium text-sky-600">
                      {contract.isExpired
                        ? contract.daysUntilExpiry !== null
                          ? `Vencido há ${Math.abs(contract.daysUntilExpiry)} dia(s)`
                          : "Vencido"
                        : `Vence em ${contract.daysUntilExpiry} dia(s)`}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

        <button
          type="button"
          onClick={() => setIsContractsDialogOpen(true)}
          className="w-full text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          <Card className="cursor-pointer transition hover:border-sky-300 hover:shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Contratos</CardTitle>
                <Clock className="w-4 h-4 text-sky-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {metrics.contractsExpired}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                vencidos • {metrics.contractsExpiringSoon} próximos (30 dias)
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
